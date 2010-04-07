if (typeof __xd === "undefined") {
__xd = (function() {    
    // function consolePrint(str) {
    //     print(str);
    // }
    // function consolePrompt() {
    //     dispatch(require("readline").readline("(xdb) "));
    // }
    
    var scrollback = [];
    function consolePrint(str) {
        scrollback.push.apply(scrollback, (str || "").split("\n"));
    }
    function consolePrompt() {
        var str = prompt(scrollback.slice(-30).join("\n") + "\n(xdb) ", lastCommand);
        if (str == null)
            return;

        consolePrint("(xdb) " + str);
        dispatch(str);
    }
    
    var sourceWindow;
    function showLine(filename, lineno) {
        if (sourceWindow === undefined) {
            var WIDTH = 400;
            sourceWindow = window.open(null, "_blank", "height="+window.screen.height+", width="+WIDTH+", left="+(window.screen.width-WIDTH)+", top=0");
            sourceWindow.document.writeln(
                '<html><head><title></title><style type="text/css" media="screen">\n'+
                'pre { margin: 0px; padding: 0px 5px; }\n'+
                'pre.selected { background-color: rgba(255,0,0,0.5); border-radius: 5px; }\n' +
                '</style></head><body></body></html>'
            );
            sourceWindow.moveTo(window.screen.width - sourceWindow.outerWidth, 0);
            if (sourceWindow)
                window.addEventListener("unload", function() { sourceWindow.close(); }, false);
        }
        if (sourceWindow) {
            var lines = files[filename].source.split("\n");
            for (var i = 0; i < lines.length; i++)
                lines[i] = (i+1) + (Array(String(lines.length).length + 1 - String(i+1).length).join(" ")) + "| " + lines[i]; // each line needs at least a space to prevent it from being collapsed
            sourceWindow.document.body.innerHTML =
                ("<pre>" + filename + "\n" + lines.slice(0, lineno - 1).join("\n") + "</pre>") + 
                ('<pre class="selected">' + lines[lineno - 1] + "</pre>") + 
                ("<pre>" + lines.slice(lineno).join("\n") + "</pre>");
            sourceWindow.focus();
        }
    }
    
    var lastCommand = "";
    function dispatch(str) {
        if (!str)
            str = lastCommand;
        else
            lastCommand = str;
        
        var cmd = str.split(" ")[0].toLowerCase();

        var shouldContinue = (commands[cmd] || commands["undefined"])(str);

        if (!shouldContinue)
            consolePrompt();
    }
    
    var commands = {};
    
    // misc commands:
    
    // help
    commands["help"] = function() { consolePrint("TODO: help"); }
    // unrecognized commands
    commands["undefined"] = function() { consolePrint("Undefined command: \""+command+"\". Try \"help\"."); }
    // nop
    commands[""] = function() {}
    
    // gcc commands:

    // execute next line, enter functions
    commands["step"] = commands["s"] = function() {
        stepping = true;
        enterFunctions = true;
        
        return true;
    }
    // execute next line, don't enter functions
    commands["next"] = commands["n"] = function() {
        stepping = true;
        enterFunctions = false;
        
        return true;
    }
    // continue to next breakpoint
    commands["continue"] = commands["c"] = function() {
        stepping = false;
        
        return true;
    }
    // continue to end of function
    commands["finish"] = function() {
        return true;
    }
    
    commands["backtrace"] = commands["bt"] = commands["where"] = function() {
        consolePrint(__xd.backtrace());
    }
    commands["print"] = commands["p"] = function(str) {
        try {
            var varname = str.split(" ")[1];
            var value = stack[stack.length-1].ev(varname);
            consolePrint(String(value));
        } catch (e) {
            consolePrint("FIXME:"+e);
        }
    }

    // other commands
    commands["coverage"] = function() {
        consolePrint(__xd.report());
    }
    
    var stepping = true;
    var enterFunctions = false;
    var dontStepUntilFrameExited = null; // TODO: does this need to be a stack?
    
    function shouldBreakOnLine(filename, lineno) {
        // TODO: check for breakpoints
        return (stepping && !dontStepUntilFrameExited);
    }
    
    var stack = [];
    
    var files = {};
    var __xd = {
        files : files,
        t : function(filename, lineno, noCoverage) {
            if (shouldBreakOnLine(filename, lineno)) {
                var prefix = ""+lineno;
                prefix += Array(9 - prefix.length).join(" ");
                consolePrint(prefix + files[filename].source.split("\n")[lineno-1]);
                showLine(filename, lineno);
                consolePrompt();
            }
            if (!noCoverage) {
                var hits = files[filename].hits;
                hits[lineno] = (hits[lineno] || 0) + 1;
            }
        },
        f : function(filename, lineno, fnname, argnames, args, ev) {
            var argString = "";
            for (var i = 0; i < argnames.length || i < args.length; i++) {
                argString += argnames[i] ? argnames[i] + "=" : "";
                argString += args[i];
            }
            
            var frame = {
                filename:filename,
                lineno:lineno,
                fnname:fnname,
                argString:argString,
                ev:ev
            };
            
            stack.push(frame);
            
            // if we don't want to step into functions but a frame hasn't been saved then save it
            if (dontStepUntilFrameExited === null && enterFunctions === false) {
                dontStepUntilFrameExited = frame;
            }
        },
        p : function() {
            var frame = stack.pop();
            
            // if this frame has been saved then null it out so we can continue stepping
            if (frame === dontStepUntilFrameExited) {
                dontStepUntilFrameExited = null;
            }
        },
        register : function(filename, lines, source) {
            var file = files[filename] = files[filename] || {};
            file.source = source;
            file.registered = lines;
            file.hits = [];
        },
        backtrace : function() {
            return stack.join("\n");
        },
        report : function() {
            var report = "";
            for (var name in files) {
                var file = files[name];
                var registered = 0, hits = 0;
                for (var i = 0; i < file.registered.length; i++) {
                    if (file.registered[i] > 0) {
                        registered += 1;
                    }
                }
                for (var i = 0; i < file.hits.length; i++) {
                    if (file.hits[i] > 0) {
                        hits += 1;
                    }
                }
                report += name + ": " + (100*hits/registered).toString().slice(0,5) + "% coverage ("+ hits + " hits, " + registered + " registered)" + "\n";
            }
            return report;
        },
        _commands : commands
    }
    return __xd;
})();
}