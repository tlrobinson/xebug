var FILE = require("file");
var XEBUG = require("xebug");

var rootPath = FILE.path(module.path).dirname().join("root");

function getXDSource() {
    return FILE.path(module.path).dirname().join("xd.js").read({ charset : "UTF-8" });
}

var fileServer = require("jack/file").File(rootPath);

exports.app = function(env) {
    var response = fileServer(env);

    if ((/\?.*xebug=yes/).test(env.HTTP_REFERER) && (/\.js$/).test(env.PATH_INFO)) {
        print("process: " + env.PATH_INFO + " referer: " + env.HTTP_REFERER);

        var source = "";
        response.body.forEach(function(chunk) {
            source += chunk.toByteString("UTF-8").decodeToString("UTF-8");
        });

        var processed = XEBUG.xebugify(source, env.PATH_INFO);

        // include xd.js
        processed = getXDSource() + "\n" + processed;

        var body = processed.toByteString("UTF-8");

        response.headers["Content-Length"] = body.length.toString();
        response.body = [body];

        delete response.headers["X-Sendfile"]; // FIXME
    }

    return response;
}
