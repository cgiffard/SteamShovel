"use strict";

// Basic statistics for generating lines, conditions, expressions
// and functions covered.
//
// All these functions return a map, containing three values:
//
// eg.
// { covered: 15, total: 25, percengage: 0.6 }

var util = require("./utils");

module.exports = function generateStatistics(inputData, key) {
	var self = module.exports;

	if (!inputData)
		throw new Error("Input was undefined.");

	return {
		"lines":		self.lines(inputData, key),
		"conditions":	self.conditions(inputData, key),
		"expressions":	self.expressions(inputData, key),
		"functions":	self.functions(inputData, key)
	};
};

module.exports.lines = function(inputData, key) {
	var covered = 0, total = 0,
		getValue = util.calculateValue(inputData),
		uniqueLines = {};

	total =
		Object.keys(inputData)
			.filter(function(key) {
				return key.indexOf("source_") === 0;
			})
			.filter(function(index) {
				if (!key) return true;
				return inputData[index].tag === key;
			})
			.reduce(function(acc, cur) {
				return acc + util.sloc(inputData[cur].source);
			}, 0);

	Object.keys(inputData)
		.filter(function(index) {
			return index.indexOf("id_" + (key || "")) === 0;
		})
		.forEach(function(key) {
			var item	= inputData[key],
				id		= key.split("_")[1],
				start	= item.loc.start.line,
				results	= item.results;

			if (results.length)
				uniqueLines[id + "_" + start] =
					Math.max(
						getValue(item),
						uniqueLines[id + "_" + start] || 0);
		});

	covered =
		Object.keys(uniqueLines)
			.reduce(function(acc, cur) {
				return acc + uniqueLines[cur];
			}, 0);

	return {
		covered: covered,
		total: total,
		percentage: util.percentage(covered, total)
	};
};

module.exports.conditions = function(inputData, key) {
	var covered = 0, total = 0,
		getValue = util.calculateValue(inputData),
		instruments =
			util.getInstruments(inputData, key)
				.filter(util.isOfType([
						"IfStatement",
						"LogicalExpression",
						"ConditionalExpression",
					]));

	total = instruments.length;
	covered =
		instruments
			.filter(util.hasResults)
			.reduce(function(count, item) {
				return count + getValue(item);
			}, 0);

	return {
		covered: covered,
		total: total,
		percentage: util.percentage(covered, total)
	};
};

module.exports.expressions = function(inputData, key) {
	var covered = 0, total = 0,
		getValue = util.calculateValue(inputData),
		instruments = util.getInstruments(inputData, key);

	total = instruments.length;
	covered =
		instruments
			.filter(util.hasResults)
			.reduce(function(count, item) {
				return count + getValue(item);
			}, 0);

	return {
		covered: covered,
		total: total,
		percentage: util.percentage(covered, total)
	};
};

module.exports.functions = function(inputData, key) {
	var covered = 0, total = 0,
		getValue = util.calculateValue(inputData),
		instruments =
			util.getInstruments(inputData, key)
				.filter(util.isOfType([
						"FunctionDeclaration",
						"FunctionExpression",
					]));

	total = instruments.length;

	covered =
		instruments
			.filter(util.hasResults)
			.reduce(function(count, item) {
				return count + getValue(item);
			}, 0);

	return {
		covered: covered,
		total: total,
		percentage: util.percentage(covered, total)
	};
};