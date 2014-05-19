"use strict";

var util = require("./utils");


/*
	Public: Given a map of instrument data, this function returns a map of
	generated statistics regarding coverage, split into four groups:
	lines, conditions, expressions, and functions. This is a convenience
	function which simply calls the other four functions in this file.

	For more detail on how each statistic is calculated, refer to the notes
	against each function.

	instrumentData	-	The map of instrument data.
	filetag			-	Specify the tag associated with a specific file,
						allowing statistics to be scoped a single file.

	Returns a map of maps containing statistics grouped into the categories
	lines, conditions, expressions, and functions.

	Examples

		stats = stats.basic(instrumentData);

*/
module.exports = function generateStatistics(instrumentData, key) {
	var self = module.exports;

	if (!instrumentData)
		throw new Error("Input was undefined.");

	return {
		"lines":		self.lines(instrumentData, key),
		"conditions":	self.conditions(instrumentData, key),
		"expressions":	self.expressions(instrumentData, key),
		"functions":	self.functions(instrumentData, key)
	};
};

/*
	Public: Given a map of instrument data, this function returns a map of
	generated statistics regarding code coverage on a per-line level.

	This is ascertained by filtering the probes which were identified at
	the time of instrumentation as 'line' probes — that is, they don't execute
	in expression context, and are tied to statements, rather than expressions.

	instrumentData	-	The map of instrument data.
	filetag			-	Specify the tag associated with a specific file,
						allowing statistics to be scoped a single file.

	Returns a map of the coverage statistics associated with these probes. The
	map contains a count of the number of probes covered, a total number of
	probes, and a percentage of probes covered.

	For example:

		{ covered: 15, total: 25, percentage: 0.6 }

	Examples

		stats = stats.basic.lines(instrumentData);

*/
module.exports.lines = function(instrumentData, key) {
	var totalInstruments, coveredInstruments, covered, total = 0,
		getValue = util.calculateValue(instrumentData);

	totalInstruments =
		util.getInstruments(instrumentData, key)
			.filter(util.withkey("line"));

	total = totalInstruments.length;

	coveredInstruments =
		totalInstruments.filter(util.hasResults);

	covered =
		coveredInstruments
			.reduce(function(count, instrument) {
				return count + getValue(instrument);
			}, 0);

	return {
		covered: covered,
		total: total,
		percentage: util.percentage(covered, total)
	};
};

/*
	Public: Given a map of instrument data, this function returns a map of
	generated statistics regarding code coverage on a per-expression level.

	This is ascertained by filtering the probes which were identified at
	the time of instrumentation as 'expression' probes — that is, they execute
	in expression context, and are tied to expressions, rather than statements.

	instrumentData	-	The map of instrument data.
	filetag			-	Specify the tag associated with a specific file,
						allowing statistics to be scoped a single file.

	Returns a map of the coverage statistics associated with these probes. The
	map contains a count of the number of probes covered, a total number of
	probes, and a percentage of probes covered.

	For example:

		{ covered: 15, total: 25, percentage: 0.6 }

	Examples

		stats = stats.basic.expressions(instrumentData);

*/
module.exports.expressions = function(inputData, key) {
	var covered = 0, total = 0,
		getValue = util.calculateValue(inputData),
		instruments =
			util.getInstruments(inputData, key)
				.filter(function(item) {
					return !item.line;
				});

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

/*
	Public: Given a map of instrument data, this function returns a map of
	generated statistics regarding code coverage within conditional statements
	in the instrumented code.

	This is ascertained by filtering the probes which were identified at
	the time of instrumentation as being conditional expressions or statements,
	or exist within conditional expressions or statements.

	In this instance, the 'total' value returned is the number of probes which
	correspond *explicitly* to conditionals in the document. However, the
	coverage value returned is calculated based on the coverage of the probes
	directly associated with these conditionals *as well as* the probes for the
	expressions within them.

	In order for a conditional to be considered completely tested, all the
	codepaths within it must have been evaluated at appropriate depth.

	instrumentData	-	The map of instrument data.
	filetag			-	Specify the tag associated with a specific file,
						allowing statistics to be scoped a single file.

	Returns a map of the coverage statistics associated with these probes. The
	map contains a count of the number of probes covered, a total number of
	probes, and a percentage of probes covered.

	For example:

		{ covered: 15, total: 25, percentage: 0.6 }

	Examples

		stats = stats.basic.conditions(instrumentData);

*/
module.exports.conditions = function(inputData, key) {
	var covered = 0, total = 0,
		getValue = util.calculateValue(inputData),
		instruments =
			util.getInstruments(inputData, key)
				.filter(util.isOfType([
						"IfStatement",
						"LogicalExpression",
						"ConditionalExpression"
					]));

	var strictTotal =
		instruments.filter(function(instrument) {
			return 	~[
						"IfStatement",
						"LogicalExpression",
						"ConditionalExpression"
					]
					.indexOf(instrument.type);
		})
		.length;

	total = instruments.length;
	covered =
		instruments
			.filter(util.hasResults)
			.reduce(function(count, instrument) {
				return count + getValue(instrument);
			}, 0);

	return {
		covered: covered * (strictTotal / total),
		total: strictTotal,
		percentage: util.percentage(covered, total)
	};
};

/*
	Public: Given a map of instrument data, this function returns a map of
	generated statistics regarding code coverage within function declarations
	and expressions in the instrumented code.

	This is ascertained by filtering the probes which were identified at
	the time of instrumentation as being function expressions or declarations,
	or exist within function expressions or declarations.

	In this instance, the 'total' value returned is the number of probes which
	correspond *explicitly* to functions in the document. However, the coverage
	value returned is calculated based on the coverage of the probes directly
	associated with these declarations and expressions *as well as* the probes
	for the expressions within them.

	In order for a function to be considered completely tested, all the
	codepaths within it must have been evaluated at appropriate depth.

	instrumentData	-	The map of instrument data.
	filetag			-	Specify the tag associated with a specific file,
						allowing statistics to be scoped a single file.

	Returns a map of the coverage statistics associated with these probes. The
	map contains a count of the number of probes covered, a total number of
	probes, and a percentage of probes covered.

	For example:

		{ covered: 15, total: 25, percentage: 0.6 }

	Examples

		stats = stats.basic.conditions(instrumentData);

*/
module.exports.functions = function(inputData, key) {
	var covered = 0, total = 0,
		getValue = util.calculateValue(inputData),
		instruments =
			util.getInstruments(inputData, key)
				.filter(util.isOfType([
						"FunctionDeclaration",
						"FunctionExpression"
					]));

	var strictTotal =
		instruments.filter(function(instrument) {
			return 	~[
						"FunctionDeclaration",
						"FunctionExpression"
					]
					.indexOf(instrument.type);
		})
		.length;

	total = instruments.length;

	covered =
		instruments
			.filter(util.hasResults)
			.reduce(function(count, item) {
				return count + getValue(item);
			}, 0);

	return {
		covered: covered  * (strictTotal / total),
		total: strictTotal,
		percentage: util.percentage(covered, total)
	};
};