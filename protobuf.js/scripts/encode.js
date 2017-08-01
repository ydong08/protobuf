var protobuf = require(".."),
    data = require("./bench.json");

protobuf.load(require.resolve("./bench.proto"), function onload(err, root) {

    var Test = root.get("Test");
    var len = 0;
    for (var i = 0; i < 10000000; ++i)
        len += Test.encode(data).finish().length;

    console.log("done: " + len);
});
