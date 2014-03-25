var chai = require("chai");
	chai.should();

path = global.__steamshovel ? "../lib-cov" : "../lib";

describe("Instrumentor", function() {
	var instrument = require(path + "/instrumentor");

	it("should export a function", function() {
		instrument.should.be.a("function");
	});

	describe("when parsing a simple AST", function() {

		var inCode, outCode;

		it("should appropriately instrument the code", function() {

			inCode = "console.log('fish');",
			outCode = instrument(inCode);

			outCode.length.should.be.greaterThan(inCode.length);
		});

		it("should incorporate the instrumentor in the output", function() {
			var instrumentor = require("../lib/instrumentor-record").toString();

			outCode.indexOf(instrumentor).should.be.greaterThan(-1);
		});

		it("should incorporate the instrumentor map", function() {
			outCode.indexOf("__instrumentor_map__").should.be.greaterThan(-1);
		});
	});

	it("should embed the filename in the output, where specified", function() {
		instrument("abc = edf;", "hijklmnop")
			.indexOf("hijklmnop").should.be.greaterThan(0);
	});

	it("should return accurate loc and range info in map", function() {
		var result = instrument("var abc = ('def' || 'abc');");

		result.indexOf('"line":1,"column":11').should.be.greaterThan(0);
		result.indexOf('"line":1,"column":25').should.be.greaterThan(0);
		result.indexOf('[11,25]').should.be.greaterThan(0);

	});

	describe("Edge Cases", function() {

		it("should not break CallExpressions with MemberExpression callees",
			function() {

			instrument("abc.def('abc')", null, false)
				.indexOf("abc.def)").should.equal(-1);
		});

		it("should not replace the left side of AssignmentExpressions",
			function() {

			instrument("var abc = def;", null, false)
				.indexOf("var abc").should.equal(0);
		});

		it("should not instrument the components of MemberExpressions",
			function() {

			var code =
				"module.exports = function instrumentCode(data, filename) {};";

			instrument(code, null, false)
				.indexOf("module.exports = ").should.be.greaterThan(-1);

		});

		it("should not break Functions into their components",
			function() {

			var code =
				"module.exports = function instrumentCode(data, filename) {};",
				code2 = "function instrumentCode(data, filename) {};";

			// FunctionExpression

			instrument(code, null, false)
				.indexOf("function instrumentCode").should.be.greaterThan(-1);

			instrument(code, null, false)
				.indexOf("data, filename").should.be.greaterThan(-1);

			// FunctionDeclaration

			instrument(code2, null, false)
				.indexOf("function instrumentCode").should.be.greaterThan(-1);

			instrument(code2, null, false)
				.indexOf("data, filename").should.be.greaterThan(-1);
		});

		it("should not touch the arguments to UpdateExpressions",
			function() {

			var code = "abc.def ++",
				code2 = "++ abc.def";

			// Infix

			instrument(code, null, false)
				.indexOf("abc.def++").should.be.greaterThan(-1);

			// Prefix

			instrument(code2, null, false)
				.indexOf("++abc.def").should.be.greaterThan(-1);

		});

	});

});