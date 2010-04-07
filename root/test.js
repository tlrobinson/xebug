function bar() {
    for (var i = 0; i < 5; i++)
        console.log("*** bar!");
}

function foo() {
    console.log("*** foo!");
    bar();
}

function main (argc, argv)
{
    console.log("*** asdf");
    foo();
    return 0;
}

main();
