var protobuf = require(".."),
    Root  = protobuf.Root,
    Type  = protobuf.Type,
    Field = protobuf.Field;

var inspect = require("../cli/util").inspect;

var root = new Root(),
    gp = root.lookup("google.protobuf");

console.log(inspect(gp));
