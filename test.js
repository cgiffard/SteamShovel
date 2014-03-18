var example = require("./example_instrumented");

describe("Example", function() {
    it ("should accumulate properly", function() {
        example();
    });

    it ("should return 'fish' properly", function() {
        example.fish();
    });
});