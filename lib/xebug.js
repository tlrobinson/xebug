
var FILE = require("file");
var SYSTEM = require("system");
var OS = require("os");

var PARSE = require("narcissus/parse");
var DEFS = require("narcissus/defs");
var FORMAT = require("narcissus/format");

FORMAT.formatters[DEFS.SCRIPT] = function(node) {
    var lastLine;
    return FORMAT.mapNodes(node, function(n) {
        lastLine = n.lineno;
        if (n.type === DEFS.FUNCTION)
            return FORMAT.indent(FORMAT.format(n)) + "\n";
        else    
            return FORMAT.indent(xdTGen(n.lineno) + "\n" + FORMAT.format(n)) + "\n";
    }).join("") + FORMAT.indent(xdTGen(lastLine+1,true)) + "\n";
}

FORMAT.formatters[DEFS.FUNCTION] = function(node) {
    var buf = xdFGen(node) + "\ntry {\n" +
        FORMAT.format(node.body) +
        "} finally {\n" + xdPGen(node.lineno) + "\n}\n";

    return "function" + (node.name ? " " + node.name : "") +
        "("+node.params.join(", ")+") {\n" + FORMAT.indent(buf) + "}";
}

var xdLines = [];
// xdT: statement trace
function xdTGen(line, noCoverage) {
    // don't register lines at the end of a block so code coverage results don't get skewed
    if (!noCoverage)
        xdLines[line] = (xdLines[line] || 0) + 1;

    return "__xd.t(__xdFile," + line + (noCoverage ? ",true" : "") + "); ";
}

var xdFunctions = {};
// xdF: function trace
function xdFGen(node) {
    
    return "__xd.f(__xdFile,"+
        node.lineno+","+
        JSON.stringify(node.name)+","+
        JSON.stringify(node.params)+","+
        "arguments,"+
        "function(s){return eval(s);}); ";
}

// xdP: pop stack upon exiting function
function xdPGen(line) {
    return "__xd.p(); ";
}


function xdLinesReset() {
    xdLines = [];
}

function stringifyAST(ast) {
    return JSON.stringify(ast, function(key, value) {
        // print(key)
        return (key === "tokenizer") ? null : value;
    }, 2);
}

exports.xebugify = function(original, name) {
    var ast = PARSE.parse(original, name);
    // print("parsed")
    // FILE.write("test-ast.txt", ast.toString().toByteString("UTF-8"), "b");
    // FILE.write("test-ast.json", stringifyAST(ast));
    
    xdLinesReset();
    var source = FORMAT.format(ast);
    
    for (var j = 0; j < xdLines.length; j++)
        if (xdLines[j] == undefined)
            xdLines[j] = 0;
    
    return "var __xdFile = " + JSON.stringify(name) + ";\n" +
        "__xd.register(__xdFile," + JSON.stringify(xdLines) + "," + JSON.stringify(original) + ");\n"+
        source;
}

exports.main = function(args) {
    for (var i = 1; i < args.length; i++) {
        var source = null;
        var name = args[i];
        try {
            print(Array(81).join("="));
            
            print("xebugifying... " + name);
            var original = FILE.read(name, { charset : "UTF-8" });

            source = exports.xebugify(original, name);
            print("xebugified...");

            new Function(source);
            print("compiled...");

            FILE.write(name, source, { charset : "UTF-8" });

        } catch (e) {
            print(e);
            print(e.line);
            if (source)
                FILE.write(name+".failed", source);
            return;
        }
    }
}