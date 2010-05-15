Xebug
=====

Xebug (say: zee-bug) is a universal debugger for JavaScript, written in JavaScript. It will work in any JavaScript environment that provides a blocking input API (the `prompt()` function or synchronous `XMLHttpRequest` in web browsers, for example) and the opportunity to intercept JavaScript code before it is evaluated (hooks in client-side loaders, or via a HTTP proxy, etc).

Xebug works by automatically instrumenting JavaScript code with hooks into Xebug, therefore it incurs a significant performance penalty when enabled.

Currently the instrumentation is done using the JavaScript parser included with the [Narcissus](http://en.wikipedia.org/wiki/Narcissus_(JavaScript_engine\)) JavaScript interpreter (though the interpreter itself is not used).

Xebug is still in development but a working demo can be seen at [http://tlrobinson.net/xebug-demo](http://tlrobinson.net/xebug-demo). This demo provides a GDB-like command-line interface ("XDB"), but graphical interfaces are also possible.

Xebug can also be used on languages that compile to JavaScript, like [Objective-J](http://cappuccino.org/) and [CoffeeScript](http://jashkenas.github.com/coffee-script/). Their compilers could be modified to generate instrumented code with accurate line numbers and source code in the original language.

Xebug is currently licensed under the GPL, but will likely be released under a more permissive license in the future.

Features
--------

* Single step in, out, next, continue
* Breakpoints
* Watchpoints
* Backtraces
* Instrumentation via a special JSGI webserver or hook loaders directly via JavaScript API
* Code coverage reporting
* XDB, a GDB-like command-line interface
* Partially implements the [V8 debugger protocol](http://code.google.com/p/v8/wiki/DebuggerProtocol)

TODO
----

* Complete V8 debugger protocol conversion
* Refactor UI, XDB, and core
* Integrate with various loaders (Objective-J, Narwhal, other CommonJS, etc)
* Auto-instrumenting web proxy
* Sychronous XHR frontend
* CommonJS frontends
* GUI

Requirements
------------

To build:

* [Narwhal](http://github.com/280north/narwhal)
* [Narcissus](http://github.com/tlrobinson/narcissus)
* [MiniBundler](http://github.com/tlrobinson/minibundler)
* [Jake](http://github.com/280north/jake)

License
-------

Xebug Universal JavaScript Debugger
Copyright (C) 2010 Thomas Robinson (http://tlrobinson.net/)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
