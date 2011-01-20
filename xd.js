
// -- tlrobinson Thomas Robinson Copyright (C) 2010

if (typeof __xd === "undefined") {
__xd = (function() {

    // Xebug: JavaScript debugger written in JavaScript via code instrumentation. Uses the V8 debugger protocol.
    // XDB: GDB-like command-line interface to Xebub, for browser and CommonJS

    function PromptUI() {
        this.scrollback = [];
        this.lastCommand = null;
    }
    PromptUI.prototype.print = function(str) {
        this.scrollback.push.apply(this.scrollback, String(str || "").split("\n"));
    }
    PromptUI.prototype.prompt = function() {
        var str = prompt(this.scrollback.slice(-30).join("\n") + "\n(xdb) ", this.lastCommand);
        if (str == null) {
            return;
        }

        this.lastCommand = str;
        this.print("(xdb) " + str);

        return str;
    }

    // An agent that proxies over XHR to some endpoint
    function XHRAgent(endpoint) {
        this.endpoint = endpoint;
    }

    // A command line agent
    function XDBAgent(ui) {
        this.ui = ui;
        this.seq = 0;

        this.callbacks = {};
        this.requests = [];
    }

    // External API used by core to block until a request is ready
    // TODO: will/should we only ever return a single request?
    XDBAgent.prototype.getRequests = function() {
        do {
            var str = this.ui.prompt();
            if (str) {
                var command = "xdb_" + str.split(" ")[0].toLowerCase();
                try {
                    (this[command] || this["xdb_undefined"]).call(this, str);
                } catch (e) {
                    this.ui.print("ERROR:" + e);
                }
            } else {
                this.requests.push({
                  "command" : "disconnect"
                });
            }
        } while (this.requests.length === 0);

        var requests = this.requests;
        this.requests = [];

        return requests;
    }
    // External API used by core to give events and responses to the agent
    XDBAgent.prototype.sendMessage = function(message) {
        if (message["type"] === "response") {
            if (!message["success"]) {
                console.warn("Request failed: " + message["message"]);
                this.ui.print(message["message"]);
            }
            var req_seq = message["req_seq"];
            if (req_seq != undefined) {
                if (typeof this.callbacks[req_seq] === "function")
                    this.callbacks[req_seq].call(this, message);
                delete this.callbacks[req_seq];
            }
        } else if (message["type"] === "event") {
            if (message["event"] === "break") {
                var body = message["body"];
                
                // this.ui.print("BREAKPOINTS FIXME: " + body["breakpoints"]);
                
                var prefix = body.sourceLine.toString(10);
                prefix += Array(9 - prefix.length).join(" ");
                this.ui.print(prefix + body.sourceLineText);
            } else if (message["event"] === "exception") {
                this.ui.print("EXCEPTION FIXME");
            } else {
                console.warn("Unrecognized event type: " + message["event"]);
            }
        } else {
            console.warn("Unrecognized message type: " + message["type"]);
        }
    }

    // Helper for commands, puts requests in queue and registers a callback
    XDBAgent.prototype.request = function(request, callback) {
        request["type"] = "request";
        request["seq"] = this.seq++;

        this.callbacks[request.seq] = callback || null;

        this.requests.push(request);
    }

    // nop
    XDBAgent.prototype["xdb_"] = function() {}
    // unrecognized commands
    XDBAgent.prototype["xdb_undefined"] = function(command) {
        this.ui.print("Undefined command: \""+command+"\". Try \"help\".");
    }

    // GDB compatible commands

    // help
    XDBAgent.prototype["xdb_help"] = function() {
        this.ui.print("Help hasn't been written, but it's almost the same as GDB.\n");
        this.ui.print("Supported commands:");
        for (var command in this) {
            if (command.indexOf("xdb_") === 0) {
                this.ui.print("    " + command.substring(4));
            }
        }
        this.ui.print("");
    }

    // execute next line, enter functions
    XDBAgent.prototype["xdb_step"] =
    XDBAgent.prototype["xdb_s"] = function() {
        // TODO: stepcount
        this.request({
            "command" : "continue",
            "arguments" : {
                "stepaction" : "in"
            }
        });
    }
    // execute next line, don't enter functions
    XDBAgent.prototype["xdb_next"] =
    XDBAgent.prototype["xdb_n"] = function() {
        // TODO: stepcount
        this.request({
            "command" : "continue",
            "arguments" : {
                "stepaction" : "next"
            }
        });
    }
    // continue to end of function
    XDBAgent.prototype["xdb_finish"] = function() {
        // TODO: stepcount
        this.ui.print("Run till exit from FIXME");
        this.request({
            "command" : "continue",
            "arguments" : {
                "stepaction" : "out"
            }
        });
    }
    // continue to next breakpoint
    XDBAgent.prototype["xdb_continue"] =
    XDBAgent.prototype["xdb_c"] = function() {
        this.request({
            "command" : "continue"
        });
    }

    XDBAgent.prototype["xdb_watch"] = function(str) {
        var expression = str.split(" ").slice(1).join(" ");
        try {
            new Function(expression);
            this.request({
                "command" : "setbreakpoint",
                "arguments" : {
                    "type"          : "script",
                    "target"        : match[2],
                    "line"          : parseInt(match[3]),
                    "column"        : 0,
                    "enabled"       : true,
                    "condition"     : expression,
                    "ignoreCount"   : 0
                }
            });
        } catch (e) {
            this.ui.print("A syntax error in expression, near `"+expression+"'.");
        }
    }
    XDBAgent.prototype["xdb_break"] = function(str) {
        var components = str.split(" ");
        var condition = components[1];
        var match;
        // line number
        if (match = condition.match(/^((.*):)?(\d+)$/)) {
            this.request({
                "command" : "setbreakpoint",
                "arguments" : {
                    "type"          : "script",
                    "target"        : match[2],
                    "line"          : parseInt(match[3]),
                    "column"        : 0,
                    "enabled"       : true,
                    "condition"     : null,
                    "ignoreCount"   : 0
                }
            });
        }
        // function
        else if (match = condition.match(/^((.*):)?(\w+)$/)) {
            this.ui.print("NYI");
        }
        // offset
        else if (match = condition.match(/^(\+|\-)(.*)$/)) {
            this.ui.print("NYI");
        }
        else {
            this.ui.print("Invalid syntax.");
        }
    }

    XDBAgent.prototype["xdb_backtrace"] =
    XDBAgent.prototype["xdb_bt"] =
    XDBAgent.prototype["xdb_where"] = function() {
        this.request({
            "command" : "backtrace",
            "arguments" : {
                "fromFrame" : 0,
                "toFrame" : 10,
                "bottom" : false
            }
        }, function(response) {
            var frames = response.body.frames;
            for (var i = 0; i < frames.length; i++) {
                var frame = frames[i];
                var prefix = "#" + frame.index + Array(4 - String(frame.index).length).join(" ");
                var argString = frame.arguments.map(function(arg) { return arg.name + "=" + arg.value }).join(", ");
                this.ui.print(prefix + frame.func + " ("+argString+") at "+frame.script+":"+frame.line);
            }
        });
    }
    XDBAgent.prototype["xdb_print"] =
    XDBAgent.prototype["xdb_p"] = function(str) {
        var varname = str.split(" ")[1];
        this.request({
            "command" : "evaluate",
            "arguments" : {
                "expression"    : varname,
                "frame"         : 0,
                "global"        : false,
                "disable_break" : false // TODO: correct?
            }
        }, function(response) {
            // TODO:
            this.ui.print(String(response.body));
        });
    }

    // external API:

    function Core(agent) {
        this.agent = agent;
        this.seq = 0;

        // Debugger state:
        this.stack = [];
        this.files = {};

        this.breakpoints = [];

        this.singleStep = true;
        this.enterFunctions = false;
        // TODO: does this need to be a stack? what if a breakpoint inside a function we step over is encountered?
        this.continueUntilFrameExited = null;

        this.continueExectution;
    }

    // This is a weird function. Typical exchange:
    //      core            agent
    //          --event---->
    //          <-request---
    //          --response->
    //          <-request--- (sets continueExectution = true)
    //          --response->
    //          return

    Core.prototype.blockOnEvent = function(event) {
        // keep blocking until this flag is toggled
        this.continueExectution = false;

        event["seq"] = this.seq++;
        event["type"] = "event";
        if (!event["event"])
            console.warn("XEBUG CORE: event missing event field");

        this.agent.sendMessage(event);

        while (!this.continueExectution) {
            // block until we get one or more requests from the agent
            var requests = this.agent.getRequests();
            for (var i = 0; i < requests.length; i++) {
                var request = requests[i];
                var response;

                var methodName = "v8_" + request["command"];
                if (typeof this[methodName] === "function") {
                    // dispatch the request, get a response
                    response = this[methodName].call(this, request.arguments || {}) || {};
                } else {
                    response = {
                        "success" : false,
                        "message" : "Unrecognized command: " + request["command"]
                    };
                }

                response["seq"] = this.seq++;
                response["type"] = "response";
                response["command"] = request["command"];
                response["req_seq"] = request["seq"];
                response["running"] = !!this.continueExectution;

                if (response["success"] == undefined)
                    console.warn("XEBUG CORE: " + methodName + " returned undefined success");

                // return the response to the agent
                this.agent.sendMessage(response);
            }
        }
    }

    Core.prototype.shouldBreak = function(filename, lineno) {
        var matches = [];

        // check each watchpoint/breakpoint
        for (var i = 0, points = this.breakpoints, length = points.length; i < length; i++) {
            var point;
            if (!(point = points[i]))
                continue;

            if (point.type === "watch") {
                if (!point.frame.valid) {
                    console.log("FIXME Watchpoint "+i+" deleted because the program has left the block in which its expression is valid.");
                    delete points[i];
                } else {
                    if (point.frame.evaluate(point.expression)) {
                        matches.push(i);
                        console.log("FIXME watchpoint "+i);
                    }
                }
            }
            else if (point.type === "script") {
                if (point.target === filename && point.line === lineno) {
                    matches.push(i);
                    console.log("FIXME Breakpoint "+i);
                }
            }
        }

        if (matches.length > 0 || (this.singleStep && !this.continueUntilFrameExited)) {
            return matches;
        }
        return null;
    }

    Core.prototype.setLineInTopFrame = function(filename, lineno) {
        var frame;
        if (frame = this.topFrame())
            frame.current = { filename : filename, lineno : lineno };
    }

    Core.prototype.topFrame = function() {
        return this.stack[this.stack.length - 1];
    }

    Core.prototype.getFrame = function(index) {
        return this.stack[this.stack.length - (index + 1)];
    }

    Core.prototype.getFrameResponse = function(index) {
        var frame = this.getFrame(index);
        if (!frame)
            return null;
        // FIXME:
        return {
            "index"             : index,
            "receiver"          : null,
            "func"              : frame.fnname,
            "script"            : frame.current.filename,
            "constructCall"     : false,
            "debuggerFrame"     : false,
            "arguments"         : frame.argnames.map(function(name) { return { "name" : name, "value" : null }}),
            "locals"            : [],
            "position"          : null,
            "line"              : frame.current.lineno,
            "column"            : 0,
            "sourceLineText"    : this.getFileLines(frame.current.filename)[frame.current.lineno - 1],
            "scopes"            : []
        };
    }

    Core.prototype.getFileLines = function(filename) {
        // TODO: cache the lines?
        return this.files[filename].source.split("\n");
    }

    Core.prototype.serializeObject = function(object) {
        // FIXME:
        return String(object);
    }

    // V8 API: "v8_" prefixed functions is the V8 debugger API

    Core.prototype.v8_continue = function(args) {
        // TODO: stepcount

        if (!args.stepaction) {
            this.singleStep = false;
        } else if (args.stepaction === "in") {
            this.singleStep = true;
            this.enterFunctions = true;
        } else if (args.stepaction === "next") {
            this.singleStep = true;
            this.enterFunctions = false;
        } else if (args.stepaction === "out") {
            this.continueUntilFrameExited = this.topFrame();
        } else {
            return {
                "success" : false,
                "message" : "Unrecognized stepaction"
            };
        }

        this.continueExectution = true;

        return {
            "success" : true
        };
    }
    Core.prototype.v8_evaluate = function(args) {
        args["additional_context"] = args["additional_context"] || [];

        var frame = this.getFrame(args["frame"]);
        if (!frame) {
            return {
                "success" : false,
                "message" : "Invalid frame: " + args["frame"]
            }
        }

        try {
            return {
                "success" : true,
                "body" : this.serializeObject(frame.evaluate(args["expression"]))
            }
        } catch (e) {
            return {
                "success" : false,
                "message" : String(e)
            }
        }
    }

    Core.prototype.v8_lookup = function(args) {}

    Core.prototype.v8_backtrace = function(args) {
        if (args["bottom"]) {
            throw "NYI";
        } else {
            var fromFrame = Math.max(0, Math.min(this.stack.length-1, args["fromFrame"] || 0));
            var toFrame = Math.max(0, Math.min(this.stack.length, args["toFrame"] != undefined ? args["toFrame"] : fromFrame + 10));
        }

        var frames = [];
        for (var i = fromFrame; i < toFrame; i++) {
            frames.push(this.getFrameResponse(i));
        }

        return {
            "body" : {
                "fromFrame" : fromFrame,
                "toFrame" : toFrame,
                "totalFrames" : frames.length,
                "frames" : frames
            },
            "success" : true
        };
    }

    Core.prototype.v8_frame = function(args) {
        var number = args["number"] != undefined ? args["number"] : this.selectedFrame;
        var frame = this.getFrameResponse(number);
        if (!frame) {
            return {
                "success" : false,
                "message" : "Invalid frame: " + args["frame"]
            }
        }

        this.selectedFrame = number;

        return {
            "success" : true,
            "body" : frame
        };
    }

    // TODO:
    Core.prototype.v8_scope = function(args) {}
    Core.prototype.v8_scopes = function(args) {}
    Core.prototype.v8_scripts = function(args) {}
    Core.prototype.v8_source = function(args) {}

    Core.prototype.v8_setbreakpoint = function(args) {
        if (args["type"] === "script") {
            // TODO: remove defaults for target, line, column. Check for well formed request.
            var bp = {
                "type":         "script",
                "target":       args["target"] || this.topFrame().filename,
                "line":         args["line"] || 0,
                "column" :      args["column"],
                "enabled":      args["enabled"] != undefined ? args["enabled"] : true,
                "condition":    args["condition"],
                "ignoreCount":  args["ignoreCount"] || 0
            }

            var file = this.files[bp.target];
            if (!file) {
                console.warn("FIXME Making breakpoint pending on future shared library load", this.files, bp.target)
            }

            // Find the next non-empty line
            var line = bp.line;
            if (file) {
                // TODO: check for whitespace and/or comments?
                while (!file.lines[line] && line < file.lines.length) {
                    line++;
                }
                if (!file.lines[line]) {
                    return {
                        "success" : false,
                        "message" : "No line "+args.line+" in file \""+args.target+"\"."
                    };
                }
            }

            this.breakpoints.push(bp);

            return {
                "success" : true,
                "body" : {
                    "type" : "script",
                    "breakpoint" : this.breakpoints.length - 1
                }
            };
        } else if (args["type"] === "function") {
            // TODO:
            return {
                "success" : false,
                "message" : "Function breakpoints not yet implemented"
            }
        } else {
            return {
                "success" : false,
                "message" : "Unknown breakpoint type: " + args["type"]
            }
        }
    }

    // TODO:
    Core.prototype.v8_changebreakpoint = function(args) {}
    Core.prototype.v8_clearbreakpoint = function(args) {}
    Core.prototype.v8_listbreakpoints = function(args) {}

    Core.prototype.v8_setexceptionbreak = function(args) {}


    Core.prototype.v8_disconnect = function(args) {
        throw "DISCONNECT FIXME";
    }

    // These don't necessarily make sense in Xebug
    // FIXME: provide stubs
    Core.prototype.v8_v8flags = function(args) {}
    Core.prototype.v8_version = function(args) {}
    Core.prototype.v8_profile = function(args) {}
    Core.prototype.v8_gc = function(args) {}

    // INSTRUMENTATION API: one letter functions used by instrumented code:

    // t: between every statement (TODO: in loop conditions, etc too) ("trace")
    Core.prototype.t = function(filename, lineno, noCoverage) {
        this.setLineInTopFrame(filename, lineno);
        var breakpoints;
        if (breakpoints = this.shouldBreak(filename, lineno)) {
            var lines = this.getFileLines(filename);
            this.blockOnEvent({
                "event" : "break",
                "body"  : {
                    "invocationText": "",
                    "sourceLine"    : lineno,
                    "sourceColumn"  : 0,
                    "sourceLineText": lines[lineno-1],
                    "script"        : {
                        "name"          : filename,
                        "lineOffset"    : lineno,
                        "columnOffset"  : 0,
                        "lineCount"     : lines.length
                    },
                    "breakpoints"   : breakpoints
                }
            });
            // ui.consolePrompt();
        }
        if (!noCoverage) {
            var hits = this.files[filename].hits;
            hits[lineno] = (hits[lineno] || 0) + 1;
        }
    };
    // f: beginning of every function ("function")
    Core.prototype.f = function(filename, lineno, fnname, argnames, args, evaluate) {
        var argStrings = [];
        for (var i = 0; i < argnames.length || i < args.length; i++)
            argStrings.push((argnames[i] ? argnames[i] + "=" : "") + args[i]);

        var frame = {
            filename : filename,
            lineno : lineno,
            fnname : fnname,
            argnames : argnames,
            argString : argStrings.join(", "),
            evaluate : evaluate,
            valid : true
        };

        this.stack.push(frame);

        // if we don't want to step into functions but a frame hasn't been saved then save it
        if (this.continueUntilFrameExited === null && this.enterFunctions === false) {
            this.continueUntilFrameExited = frame;
        }
    };
    // p: at the end of every function to pop stack frames ("pop")
    Core.prototype.p = function() {
        var frame = this.stack.pop();
        frame.valid = false;

        // if this frame has been saved then null it out so we can continue stepping
        if (frame === this.continueUntilFrameExited) {
            this.continueUntilFrameExited = null;
        }
    };
    // r: top of every file to register source, lines (TODO: register functions) ("register")
    Core.prototype.r = function(filename, lines, source) {
        var file = this.files[filename] = this.files[filename] || {};
        file.source = source;
        file.lines = lines;
        file.hits = [];
    };

    return new Core(new XDBAgent(new PromptUI()));
})();
}