var chai = require("chai"),
	expect = chai.expect;
	chai.should();

// In this instance, we're not testing the instrumentor, so we want the
// un-instrumented version.
var instrument = require("../lib/instrumentor");

path = global.__steamshovel ? "../lib-cov" : "../lib";

// A quick function to add some dummy results to the map.
function addSomeResults(map, instrumentcount, filterise, depth) {
	var iteration = 0;

	filterise = filterise || function() { return true; };
	depth = depth || 1;

	Object.keys(map).forEach(function(key) {
		Object.keys(map[key].instruments)
			.map(function(instrument) {
				return map[key].instruments[instrument];
			})
			.filter(filterise)
			.slice(0,instrumentcount).forEach(function(instrument) {
				iteration ++;
				instrument.results.push({
					"depth": depth,
					"time": Date.now(),
					"timeOffset": 1,
					"memoryUsage": process.memoryUsage(),
					"invocation": iteration,
					"milestone": "Hello!",
					"value": Math.random()
				});
			});
	});
}

function clearResults(map) {
	Object.keys(map).forEach(function(key) {
		Object.keys(map[key].instruments)
			.map(function(instrument) {
				return map[key].instruments[instrument];
			})
			.forEach(function(instrument) {
				instrument.results.length = 0;
			});
	});
}

describe("Statistics", function() {
	var stats	= require(path + "/stats"),
		util	= require(path + "/stats/utils");

	// Fixture for testing stats
	var fixtureSource = "if (1) { console.log(1 ? 'hello world!' : a); }\n";
		fixtureSource+= "console.log(a = b + 1);\n"
		fixtureSource+= "function console() { return function() {}; }";

	// Generating a very simple instrument map to test statistics against
	var testFixture = instrument(fixtureSource, "dummy.js");
		testFixture = testFixture.split(/\n+/)[4];
		testFixture = testFixture.substr(57).replace(/\;$/,"");
		testFixture = JSON.parse(testFixture);

	var instrumentMap = {};
		instrumentMap[testFixture.filetag] = testFixture;

	beforeEach(function() {
		clearResults(instrumentMap);
	});

	it("should export an object with methods", function() {
		stats.should.be.an("object");
		stats.basic.should.be.a("function");
	});

	it("should calculate all basic statistics when called generally",
		function() {

		var data = stats.basic(instrumentMap);

		data.lines.should.be.an("object");
		data.conditions.should.be.an("object");
		data.expressions.should.be.an("object");
		data.functions.should.be.an("object");
	});

	it("should be able to retrieve instruments from the map", function() {
		var instruments = util.getInstruments(instrumentMap);
		expect(instruments.length).to.equal(17);
	});

	it("should retrieve instruments from the map filtered by key", function() {
		var demoKey = "ic6c44d10e8569f579e7a40c3a91caad0";
		expect(util.getInstruments(instrumentMap, "abc").length).to.equal(0);
		expect(util.getInstruments(instrumentMap, demoKey).length).to.equal(17);
	});

	it("should be able to get the shallowest map call depth", function() {
		addSomeResults(instrumentMap, 5, util.withkey("line"), 10);

		expect(util.shallowestCall(instrumentMap)).to.equal(10);

		addSomeResults(instrumentMap, 10, null, 50);

		expect(util.shallowestCall(instrumentMap)).to.equal(10);

		addSomeResults(instrumentMap, 10, null, 3);

		expect(util.shallowestCall(instrumentMap)).to.equal(3);
	});

	it("should be able to get the computed value of an instrument", function() {
		addSomeResults(instrumentMap, 3, util.withkey("line"), 10);
		addSomeResults(instrumentMap, 10, null, 50);

		var instruments = util.getInstruments(instrumentMap);
		var getValue = util.calculateValue(instrumentMap);

		expect(getValue(instruments[0])).to.be.greaterThan(0);
		expect(getValue(instruments[0])).to.be.lessThan(0.01);
		expect(getValue(instruments[0])).to.be.greaterThan(0.000001);

		clearResults(instrumentMap);
		addSomeResults(instrumentMap, 10, null, 2);
		expect(getValue(instruments[0])).to.equal(1);
	});

	it("should calculate lines from an example map", function() {
		addSomeResults(instrumentMap, 3, util.withkey("line"));
		var data = stats.basic.lines(instrumentMap);

		// First with the very even data...
		expect(data.total).to.equal(5);
		expect(data.covered).to.equal(3);
		expect(data.percentage).to.equal(3/5 * 100);

		// Now with some messy data...
		addSomeResults(instrumentMap, 5, util.withkey("line"), 10);
		data = stats.basic.lines(instrumentMap);

		expect(data.total).to.equal(5);
		expect(data.covered).to.equal(3.8192000000000004);
		expect(Math.floor(data.percentage * 100)/100)
			.to.equal(Math.floor(3.8192000000000004/5 * 10000) / 100);
	});

	it("should calculate conditions from an example map", function() {
		addSomeResults(instrumentMap, 3, util.isOfType([
											"IfStatement",
											"LogicalExpression",
											"ConditionalExpression",
										]));

		var data = stats.basic.conditions(instrumentMap);

		expect(data.total).to.equal(2);
		expect(data.covered).to.equal(0.75);
		expect(Math.floor(data.percentage * 100)/100)
			.to.equal(Math.floor(3/8 * 10000) / 100);


		addSomeResults(instrumentMap, 8, util.isOfType([
											"IfStatement",
											"LogicalExpression",
											"ConditionalExpression",
										]),
										10);

		data = stats.basic.conditions(instrumentMap);

		expect(data.total).to.equal(2);
		expect(data.covered).to.equal(1.2620000000000002);
		expect(Math.floor(data.percentage * 100)/100)
			.to.equal(Math.floor(5.048000000000001/8 * 10000) / 100);
	});

	it("should calculate expressions from an example map", function() {
		var data = stats.basic.expressions(instrumentMap);

		expect(data.total).to.equal(12);
		expect(data.covered).to.equal(0);
		expect(data.percentage).to.equal(0);

		function expression(instrument) {
			return !instrument.line;
		}

		addSomeResults(instrumentMap, 3, expression, 1);
		addSomeResults(instrumentMap, 10, expression, 7);

		data = stats.basic.expressions(instrumentMap);

		expect(data.total).to.equal(12);
		expect(data.covered).to.equal(8.6);
		expect(Math.floor(data.percentage * 100)/100)
			.to.equal(Math.floor(8.6/12 * 10000) / 100);
	});

	it("should calculate functions from an example map", function() {

		addSomeResults(instrumentMap, 1, util.isOfType([
											"FunctionDeclaration",
											"FunctionExpression"
										]),
										1);
		addSomeResults(instrumentMap, 2, util.isOfType([
											"FunctionDeclaration",
											"FunctionExpression"
										]),
										10);

		var data = stats.basic.functions(instrumentMap);

		expect(data.total).to.equal(2);
		expect(data.covered).to.equal(0.9397333333333333);
		expect(Math.floor(data.percentage * 100)/100)
			.to.equal(Math.floor(1.4096/3 * 10000) / 100);
	});

});