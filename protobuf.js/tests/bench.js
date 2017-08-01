var tap = require("tap");

var protobuf = require(".."),
    util = protobuf.util;

tap.test("bench.proto and bench.json", function(test) {
    protobuf.load(require.resolve("../bench/bench.proto"), function(err, root) {
        if (err)
            return test.threw(err);
        var Test = root.lookup("Test");
        var data = require("../bench/bench.json");

        test.test("within browsers", function(test) {
            util.Buffer = null;
            try {
                test.equal(Test.verify(data), null, "should verify our test data");
                var writer = Test.encode(data);
                test.ok(writer instanceof protobuf.Writer && !(writer instanceof protobuf.BufferWriter), "should use a Writer");

                var decoded = Test.decode(writer.finish());
                test.deepEqual(decoded, data, "should reproduce the original data when encoded and decoded again");
            } finally {
                util.Buffer = Buffer;
            }
            test.end();
        });

        test.test("within node", function(test) {

            var writer = Test.encode(data);
            test.type(writer, protobuf.BufferWriter, "should use a BufferWriter");

            var decoded = Test.decode(writer.finish());
            test.deepEqual(decoded, data, "should reproduce the original data when encoded and decoded again");

            test.end();
        });

        test.end();
    });
});