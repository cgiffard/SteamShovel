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
	var covered = 0, total = 0, percentage = 1,
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

	percentage = +((covered/total)*100)|0 / 100;

	return {
		covered: covered,
		total: total,
		percentage: percentage
	};
};

module.exports.conditions = function(inputData, depth) {
	var covered = 0, total = 0, percentage = 1;

	return {
		covered: covered,
		total: total,
		percentage: percentage
	};
};

module.exports.expressions = function(inputData, depth) {
	var covered = 0, total = 0, percentage = 1;

	var instruments =
		Object.keys(inputData)
			.filter(function(key) {
				return key.indexOf("id_") === 0;
			});

	total = instruments.length;
	covered =
		instruments
			.reduce(function(acc, key) {
				var item	= inputData[key],
					results = item.results;

				if (depth)
					results = results.filter(function(result) {
						return result.depth <= depth;
					});

				if (results.length)
					return acc + 1;

				return acc;
			}, 0);

	percentage = +((covered/total)*100)|0 / 100;

	return {
		covered: covered,
		total: total,
		percentage: percentage
	};
};

module.exports.functions = function(inputData, depth) {
	var covered = 0, total = 0, percentage = 1;

	return {
		covered: covered,
		total: total,
		percentage: percentage
	};
};