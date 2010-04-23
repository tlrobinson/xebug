// #include <stdio.h>

function prn(str) {
    document.write(str+"<br />");
}

function bar() {
    var i;
    for (i = 0; i < 5; i++) {
        prn("*** bar "+i+"!");
    }
}

function foo() {
    prn("*** foo!");
    bar();
}

function main()
{
    prn("*** main, calling foo...");
    foo();
    prn("*** main, foo returned.");
    return 0;
}

main();
