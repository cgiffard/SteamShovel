var chai = require("chai");
	chai.should();

path = global.__steamshovel ? "../lib-cov" : "../lib";

describe("Statistics", function() {
	var stats = require(path + "/stats");

	it("should export an object with methods", function() {
		stats.should.be.an("object");
		stats.basic.should.be.a("function");
	});

	it("should calculate all basic statistics when called generally",
		function() {

		var data = stats.basic({});

		data.lines.should.be.an("object");
		data.conditions.should.be.an("object");
		data.expressions.should.be.an("object");
		data.functions.should.be.an("object");
	});

	it("should calculate lines from an example map");

	it("should calculate conditions from an example map");

	it("should calculate expressions from an example map");

	it("should calculate functions from an example map");

});