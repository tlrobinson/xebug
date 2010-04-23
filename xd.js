
// -- tlrobinson Thomas Robinson Copyright (C) 2010

if (typeof __xd === "undefined") {
__xd = (function() {    
    
    // TODO: decouple and split Xebug core, XDB, and UI components into separate files

    // Xebug: JavaScript debugger written in JavaScript via code instrumentation. Uses the V8 debugger protocol.
    // XDB: GDB-like command-line interface to Xebub, for browser and CommonJS

    var xdbCommands = {};

    // nop
    xdbCommands[""] = function() {}
    // unrecognized commands
    xdbCommands["undefined"] = function(command) {
        ui.consolePrint("Undefined command: \""+command+"\". Try \"help\".");
    }
    
    // GDB compatible commands
    
    // help
    xdbCommands["help"] = function() {
        ui.consolePrint("Help hasn't been written, but it's almost the same as GDB.\n");
        ui.consolePrint("Supported commands:");
        for (var command in xdbCommands)
            ui.consolePrint("    " + command);
        ui.consolePrint("");
    }

    // execute next line, enter functions
    xdbCommands["step"] = xdbCommands["s"] = function() {
        // TODO: stepcount
        __xd.commands["continue"]({ "stepaction" : "in" });
    }
    // execute next line, don't enter functions
    xdbCommands["next"] = xdbCommands["n"] = function() {
        // TODO: stepcount
        __xd.commands["continue"]({ "stepaction" : "next" });
    }
    // continue to end of function
    xdbCommands["finish"] = function() {
        // TODO: stepcount
        ui.consolePrint("Run till exit from "+frameToString(topFrame(), 0));
        __xd.commands["continue"]({ "stepaction" : "out" });
    }
    // continue to next breakpoint
    xdbCommands["continue"] = xdbCommands["c"] = function() {
        __xd.commands["continue"]({});
    }
    
    xdbCommands["watch"] = function(str) {
        __xd.watch(str.split(" ").slice(1).join(" "));
    }
    xdbCommands["break"] = function(str) {
        var components = str.split(" ");
        var condition = components[1];
        var match;
        // line number
        if (match = condition.match(/^((.*):)?(\d+)$/)) {
            __xd.commands["setbreakpoint"]({
                "type" : "script",
                "target": match[2],
                "line": parseInt(match[3])
            });
            // __xd.breakLine(match[2], parseInt(match[3]));
        }
        // function
        else if (match = condition.match(/^((.*):)?(\w+)$/)) {
            throw "NYI";
        }
        // offset
        else if (match = condition.match(/^(\+|\-)(.*)$/)) {
            throw "NYI";
        }
        else {
        }
    }
    
    xdbCommands["backtrace"] = xdbCommands["bt"] = xdbCommands["where"] = function() {
        ui.consolePrint(__xd.backtrace());
    }
    xdbCommands["print"] = xdbCommands["p"] = function(str) {
        try {
            var varname = str.split(" ")[1];
            var value = stack[stack.length-1].evaluate(varname);
            ui.consolePrint(String(value));
        } catch (e) {
            ui.consolePrint("FIXME:"+e);
        }
    }

    // other commands
    xdbCommands["coverage"] = function() {
        ui.consolePrint(__xd.coverage());
    }

    var lastCommand = "";
    function xdbDispatch(str) {
        if (!str)
            str = lastCommand;
        else
            lastCommand = str;

        continueExectuation = false;
        
        try {
            (xdbCommands[str.split(" ")[0].toLowerCase()] || xdbCommands["undefined"])(str);
        } catch (e) {
            ui.consolePrint(e);
        }

        if (!continueExectuation)
            ui.consolePrompt();
    }
    
    // internal state:

    var stack = [];
    var files = {};
    
    var points = [];

    var singleStep = true;
    var enterFunctions = false;

    var continueUntilFrameExited = null;
    // TODO: does this need to be a stack? what if a breakpoint inside a function we step over is encountered?
    
    var continueExectuation;
    
    // helper functions:
    
    function topFrame() {
        return stack[stack.length - 1];
    }
    
    function shouldBreakOnLine(filename, lineno) {
        // check each watchpoint/breakpoint
        for (var i = 0; i < points.length; i++) {
            var point = points[i];
            if (!point)
                continue;

            if (point.type === "watch") {
                if (!point.frame.valid) {
                    ui.consolePrint("Watchpoint "+i+" deleted because the program has left the block in which its expression is valid.");
                    delete points[i];
                } else {
                    if (point.frame.evaluate(point.expression)) {
                        ui.consolePrint("watchpoint "+i+": " + point.expression)
                        return true;
                    }
                }
            }
            else if (point.type === "script") {
                if (point.target === filename && point.line === lineno) {
                    ui.consolePrint("Breakpoint "+i+", "+frameToString(topFrame()));
                    return true;
                }
            }
        }

        return (singleStep && !continueUntilFrameExited);
    }
    
    function frameToString(frame, n) {
        var prefix = (n === undefined) ? "" : ("#" + n + Array(4 - String(n).length).join(" "));
        return prefix + frame.fnname + " ("+frame.argString+") " +
            (frame.current ? (" at "+frame.current.filename+":"+frame.current.lineno) : "");
    }
    function setLineInTopFrame(filename, lineno) {
        // TODO: slow. only update when breaking or completed
        ui.showLine(filename, lineno);
        
        var frame = topFrame();
        if (frame)
            frame.current = { filename : filename, lineno : lineno };
    }
    
    // external API:
    
    var __xd = {
        commands : {
            "continue" : function(params) {
                params = params || {};

                if (!params.stepaction) {
                    singleStep = false;
                } else if (params["stepaction"] === "in") {
                    singleStep = true;
                    enterFunctions = true;
                } else if (params["stepaction"] === "next") {
                    singleStep = true;
                    enterFunctions = false;
                } else if (params["stepaction"] === "out") {
                    continueUntilFrameExited = topFrame();
                } else {
                    throw "Invalid stepaction parameter."
                }
                
                continueExectuation = true;
            },
            "setbreakpoint" : function(params) {
                if (params["type"] === "script") {
                    var target = params["target"] || topFrame().filename;

                    var file = files[target];
                    if (!file) {
                        var response;
                        ui.consolePrint("Make breakpoint pending on future shared library load? (y or [n])");
                        while (true) {
                            response = ui.consolePromptRaw("n");
                            if (response === "y" || response === "n")
                                break;
                            else
                                ui.consolePrint("Please answer y or [n].");
                        }
                        if (response === "n")
                            throw "Not setting breakpoint for missing target.";
                    }

                    var line = params.line;
                    if (file) {
                        while (!file.lines[line] && line < file.lines.length) {
                            line++;
                        }
                        if (!file.lines[line]) {
                            throw "No line "+params.line+" in file \""+target+"\".";
                        }
                    }

                    points.push({
                        type : "script",
                        target: target,
                        line: line
                    });

                    ui.consolePrint("Breakpoint " + (points.length-1) + ": file "+target+", line "+(line)+".");
                }
            }
        },
        watch : function(expression) {
            try {
                // TODO: more restrictive expression parsing
                new Function(expression);
            } catch (e) {
                ui.consolePrint("A syntax error in expression, near `"+expression+"'.");
                return;
            }

            points.push({
                type : "watch",
                frame : topFrame(),
                expression : expression
            });
            
            ui.consolePrint("Watchpoint " + (points.length-1) + ": " + expression)
        },
        backtrace : function() {
            var trace = [];
            for (var i = stack.length - 1; i >= 0; i--)
                trace.push(frameToString(stack[i], stack.length - 1 - i));
            return trace.join("\n");
        },
        
        // code coverage
        coverage : function() {
            var report = "";
            for (var name in files) {
                var file = files[name];
                var lines = 0, hits = 0;
                for (var i = 0; i < file.lines.length; i++) {
                    if (file.lines[i] > 0) {
                        lines += 1;
                    }
                }
                for (var i = 0; i < file.hits.length; i++) {
                    if (file.hits[i] > 0) {
                        hits += 1;
                    }
                }
                report += name + ": " + (100*hits/lines).toString().slice(0,5) + "% coverage ("+ hits + " hits, " + lines + " lines)" + "\n";
            }
            return report;
        },
    
        // one letter functions used by instrumented code:
        
        // t: between every statement (TODO: in loop conditions, etc too) ("trace")
        t : function(filename, lineno, noCoverage) {
            setLineInTopFrame(filename, lineno);
            if (shouldBreakOnLine(filename, lineno)) {
                var prefix = ""+lineno;
                prefix += Array(9 - prefix.length).join(" ");
                
                ui.consolePrint(prefix + files[filename].source.split("\n")[lineno-1]);
                ui.consolePrompt();
            }
            if (!noCoverage) {
                var hits = files[filename].hits;
                hits[lineno] = (hits[lineno] || 0) + 1;
            }
        },
        // f: beginning of every function ("function")
        f : function(filename, lineno, fnname, argnames, args, evaluate) {
            var argStrings = [];
            for (var i = 0; i < argnames.length || i < args.length; i++)
                argStrings.push((argnames[i] ? argnames[i] + "=" : "") + args[i]);
            
            var frame = {
                filename : filename,
                lineno : lineno,
                fnname : fnname,
                argString : argStrings.join(", "),
                evaluate : evaluate,
                valid : true
            };
            
            stack.push(frame);
            
            // if we don't want to step into functions but a frame hasn't been saved then save it
            if (continueUntilFrameExited === null && enterFunctions === false) {
                continueUntilFrameExited = frame;
            }
        },
        // p: at the end of every function to pop stack frames ("pop")
        p : function() {
            var frame = stack.pop();
            frame.valid = false;
            
            // if this frame has been saved then null it out so we can continue stepping
            if (frame === continueUntilFrameExited) {
                continueUntilFrameExited = null;
            }
        },
        // r: top of every file to register source, lines (TODO: register functions) ("register")
        r : function(filename, lines, source) {
            var file = files[filename] = files[filename] || {};
            file.source = source;
            file.lines = lines;
            file.hits = [];
        },
        
        // internal state exposed for debugging purposes:
        _files : files,
        _stack : stack
    }
    
    // UI functions:
    
    // browser:
    if (typeof prompt === "function") {
        var scrollback = [];
        var sourceWindow;
        var ui = {
            consolePrint : function(str) {
                scrollback.push.apply(scrollback, String(str || "").split("\n"));
            },
            consolePrompt : function() {
                var str = ui.consolePromptRaw(lastCommand);
                if (str == null)
                    return;

                ui.consolePrint("(xdb) " + str);
                xdbDispatch(str);
            },
            consolePromptRaw : function(def) {
                return prompt(scrollback.slice(-30).join("\n") + "\n(xdb) ", def);
            },
            showLine : function(filename, lineno) {
                if (sourceWindow === undefined) {
                    var WIDTH = 400;
                    sourceWindow = window.open(null, "_blank",
                        "height="+window.screen.height+", width="+WIDTH+", left="+(window.screen.width-WIDTH)+", top=0");
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
        }
    }
    // CommonJS:
    else if (typeof require === "function") {
        var ui = {
            consolePrint : function(str) { print(str); },
            consolePrompt : function() { xdbDispatch(require("readline").readline("(xdb) ")); },
            showLine : function() {}
        };
    }

    return __xd;
})();
}