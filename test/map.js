var chai = require("chai"),
    expect = chai.expect;
    chai.should();

path = global.__steamshovel ? "../lib-cov" : "../lib";

describe("Instrument map validity", function() {
    var instrument = require(path + "/instrumentor");

    describe("when parsing a simple AST", function() {

        // Fixture for testing stats
        var fixtureSource = "console.log('hello world!');//hello!\n";
            fixtureSource+= "console.log(a = b + 1);";

        // Generating a very simple instrument map to test statistics against
        var testFixture = instrument(fixtureSource, "dummy.js");
            testFixture = testFixture.split(/\n+/)[4];
            testFixture = testFixture.substr(57).replace(/\;$/,"");
            testFixture = JSON.parse(testFixture);

        it("includes the original source of the document", function() {
            expect(testFixture.source).to.equal(fixtureSource);
        });

        it("includes the document filename, prefixed",function(){
            expect(testFixture.filename).to.equal("dummy.js");
        });

        it("includes the md5 sum of the document filename, prefixed",function(){
            expect(testFixture.filetag)
                .to.equal("ic6c44d10e8569f579e7a40c3a91caad0");
        });

        it("includes a list of comment character ranges", function() {
            expect(testFixture.comments).to.be.an("array");
            expect(testFixture.comments.length).to.equal(1);
            expect(testFixture.comments[0]).to.be.an("array");
            expect(testFixture.comments[0].length).to.equal(2);
            expect(testFixture.comments[0][0]).to.equal(28);
            expect(testFixture.comments[0][1]).to.equal(36);
        });

        it("correctly locates all the instrumentable expressions", function() {
            expect(testFixture.instruments).to.be.an("object");
            expect(Object.keys(testFixture.instruments).length).to.equal(9)
        });

        it("exposes the loc and range objects", function() {
            for (var instrument in testFixture.instruments) {
                if (!testFixture.instruments.hasOwnProperty(instrument))
                    continue;

                instrument = testFixture.instruments[instrument];

                expect(instrument).to.have.property("loc");
                expect(instrument.loc).to.be.an("object");
                expect(instrument.loc).to.have.property("start");
                expect(instrument.loc).to.have.property("end");
                expect(instrument.loc.start).to.be.an("object");
                expect(instrument.loc.start).to.have.property("line");
                expect(instrument.loc.start).to.have.property("column");
                expect(instrument.loc.end).to.be.an("object");
                expect(instrument.loc.end).to.have.property("line");
                expect(instrument.loc.end).to.have.property("column");

                expect(instrument).to.have.property("range");
                expect(instrument.range).to.be.an.instanceOf(Array);
                expect(instrument.range.length).to.equal(2);
            }
        });

        it("exposes a results array", function() {
            for (var instrument in testFixture.instruments) {
                if (!testFixture.instruments.hasOwnProperty(instrument))
                    continue;

                instrument = testFixture.instruments[instrument];

                expect(instrument).to.have.property("results");
                expect(instrument.results).to.be.an("array");
            }
        });

        it("exposes a stack", function() {
            for (var instrument in testFixture.instruments) {
                if (!testFixture.instruments.hasOwnProperty(instrument))
                    continue;

                instrument = testFixture.instruments[instrument];

                expect(instrument).to.have.property("stack");
                expect(instrument.stack).to.be.an("array");
                expect(instrument.stack.length).to.be.greaterThan(0);
            }
        });

        it("exposes a type", function() {
            for (var instrument in testFixture.instruments) {
                if (!testFixture.instruments.hasOwnProperty(instrument))
                    continue;

                instrument = testFixture.instruments[instrument];

                expect(instrument).to.have.property("type");
                expect(instrument.type).to.be.a("string");
            }
        });
    });
});