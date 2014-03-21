// Basic statistics for generating lines, conditions, expressions
// and functions covered.
//
// All these functions return a map, containing three values:
//
// eg.
// { covered: 15, total: 25, percengage: 0.6 }

var utils = require("./utils");

module.exports = function generateStatistics(inputData, depth) {
	var self = module.exports;

	if (!inputData)
		throw new Error("Input was undefined.");

	return {
		"lines":		self.lines(inputData, depth),
		"conditions":	self.conditions(inputData, depth),
		"expressions":	self.expressions(inputData, depth),
		"functions":	self.functions(inputData, depth)
	};
};

module.exports.lines = function(inputData, depth) {
	var covered = 0, total = 0,
		uniqueLines = {};

	total =
		Object.keys(inputData)
			.filter(function(key) {
				return key.indexOf("source_") === 0;
			})
			.reduce(function(acc, cur) {
				return acc + utils.sloc(inputData[cur].source);
			}, 0);

	Object.keys(inputData)
		.filter(function(key) {
			return key.indexOf("id_") === 0;
		})
		.forEach(function(key) {
			var item	= inputData[key],
				id		= key.split("_")[1],
				start	= item.loc.start.line,
				end		= item.loc.end.line,
				results	= item.results;

			if (depth)
				results = results.filter(function(result) {
					return result.depth <= depth;
				});

			if (results.length)
				uniqueLines[id + "_" + start] = 1;
		});

	covered = Object.keys(uniqueLines).length

	return {
		covered: covered,
		total: total,
		percentage: percentage(covered, total)
	};
};

module.exports.conditions = function(inputData, depth) {
	var covered = 0, total = 0,
		getValue = calculateValue(inputData),
		instruments =
			getInstruments(inputData)
				.filter(isOfType([
						"IfStatement",
						"LogicalExpression",
						"ConditionalExpression",
					]));

	total = instruments.length;
	covered =
		instruments
			.filter(hasResults)
			.reduce(function(count, item) {
				return count + getValue(item);
			}, 0);

	return {
		covered: covered,
		total: total,
		percentage: percentage(covered, total)
	};
};

module.exports.expressions = function(inputData, depth) {
	var covered = 0, total = 0,
		getValue = calculateValue(inputData),
		instruments =
			getInstruments(inputData)

	total = instruments.length;
	covered =
		instruments
			.filter(hasResults)
			.reduce(function(count, item) {
				return count + getValue(item);
			}, 0);

	return {
		covered: covered,
		total: total,
		percentage: percentage(covered, total)
	};
};

module.exports.functions = function(inputData) {
	var covered = 0, total = 0,
		getValue = calculateValue(inputData),
		instruments =
			getInstruments(inputData)
				.filter(isOfType([
						"FunctionDeclaration",
						"FunctionExpression",
					]));

	total = instruments.length;

	covered =
		instruments
			.filter(hasResults)
			.reduce(function(count, item) {
				return count + getValue(item);
			}, 0);

	return {
		covered: covered,
		total: total,
		percentage: percentage(covered, total)
	};
};

function shallowestCall(inputData) {
	if (inputData.__shallowestCall !== undefined)
		return inputData.__shallowestCall;

	return inputData.__shallowestCall = (
		getInstruments(inputData)
			.filter(hasResults)
			.reduce(function(prev, cur) {
				return cur.results.reduce(function(prev, cur) {
					return cur.depth < prev ? cur.depth : prev;
				}, prev);
			}, Infinity));
}

function getInstruments(inputData) {
	return (
		Object.keys(inputData)
			.filter(function(key) {
				return key.indexOf("id_") === 0;
			})
			.map(function(key) {
				return inputData[key];
			})
	);
}

function isOfType(types) {
	types = types instanceof Array ? types : [types];

	return function(item) {
		return types.reduce(function(acc, cur) {
			return acc || ~item.stack.indexOf(cur);
		}, false);
	};
}

function hasResults(item) {
	return (item && item.results && item.results.length);
}

function calculateValue(inputData) {
	var shallowMark = shallowestCall(inputData);

	return function(item) {
		return (
			Math.max.apply(Math,
				item.results.map(function(result) {
					// Calculate inverse logarithm
					var relativeDepth = (result.depth - shallowMark) + 1;
					return 1 / (Math.pow(1.75, relativeDepth) / 1.75);
				})));
	}
}

function percentage(a, b) {
	return (+((a/b)*10000)|0) / 100;
}