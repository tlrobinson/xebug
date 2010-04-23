
var JAKE = require("jake");
var FILE = require("file");

var MINIBUNDLER = require("minibundler");

var COMPRESSOR = require("minify/shrinksafe");
// var COMPRESSOR = require("minify/closure-compiler");

var narcissusPath = FILE.path(require("packages").catalog.narcissus.directory);
var xebugPath = FILE.path(module.path).dirname();

JAKE.task("default", ["build", "demo"]);

JAKE.task("build", function() {
    var script = MINIBUNDLER.bundle("xebug");
    FILE.write("xebug.js", "xrequire = (function() {\n" + script + ";\nreturn require;\n})();");
});

JAKE.task("demo", function() {
    print("=> compressing xd.js");
    FILE.write("demo/xd.js", COMPRESSOR.compress(FILE.read("xd.js"), { charset : "UTF-8", useServer : true }));
    print("=> compressing xebug.js");
    FILE.write("demo/xebug.js", COMPRESSOR.compress(FILE.read("xebug.js"), { charset : "UTF-8", useServer : true }));
});
