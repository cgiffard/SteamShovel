"use strict";

var util = module.exports = {};

util.sloc = function(sourceInput) {
	sourceInput = String(sourceInput || "");

	return (
		sourceInput.split(/\r?\n/ig)
			.filter(util.lineIsWhitespace)
			.reduce(function(acc, cur) {

				cur =
					cur	.split(/\/\//)
						.shift()
						.replace(/\/\*.*?\*\//g, "")
						.trim();

				if (~cur.indexOf("/*"))
					acc.inComment = true,
					cur = cur.split(/\/\*/).shift().trim();

				if (~cur.indexOf("*/"))
					acc.inComment = false,
					cur = cur.split("*/").slice(1).join("*/").trim();

				if (!cur.length)
					return acc;

				if (!acc.inComment)
					acc.count ++;

				return acc;

			}, { count: 0, inComment: false})
			.count
	);
}

util.lineIsWhitespace = function(line) {
	line = String(line || "");

	return !line.match(/^\s*$/);
}


util.shallowestCall = function shallowestCall(inputData) {
	if (inputData.__shallowestCall !== undefined)
		return inputData.__shallowestCall;

	return inputData.__shallowestCall = (
		util.getInstruments(inputData)
			.filter(util.hasResults)
			.reduce(function(prev, cur) {
				return cur.results.reduce(function(prev, cur) {
					return cur.depth < prev ? cur.depth : prev;
				}, prev);
			}, Infinity));
};

util.getInstruments = function getInstruments(inputData, scope) {
	return (
		Object.keys(inputData)
			.filter(function(key) {
				return key.indexOf("id_" + (scope || "")) === 0;
			})
			.map(function(key) {
				inputData[key].key = key;
				return inputData[key];
			}));
};

util.isOfType = function isOfType(types) {
	types = types instanceof Array ? types : [types];

	return function(item) {
		return types.reduce(function(acc, cur) {
			return acc || ~item.stack.indexOf(cur);
		}, false);
	};
};

util.hasResults = function hasResults(item) {
	return (item && item.results && item.results.length);
};

util.calculateValue = function calculateValue(inputData) {
	var shallowMark = util.shallowestCall(inputData),
		graceThreshold = 5,
		inverseDampingFactor = 1.25;

	return function(item) {
		return (
			Math.max.apply(Math,
				item.results.map(function(result) {
					// Calculate inverse logarithm
					var relativeDepth = (result.depth - shallowMark) + 1;
						relativeDepth = relativeDepth - graceThreshold;
						relativeDepth = relativeDepth <= 0 ? 1 : relativeDepth;

					return 1 / (
						Math.pow(inverseDampingFactor, relativeDepth) /
							inverseDampingFactor);
				})));
	}
}

util.getMinimumDepth = function getMinimumDepth(item) {
	return Math.min.apply(Math, item.results.map(function(result) {
		return result.depth;
	}));
};

util.percentage = function percentage(a, b) {
	return (+((a/b)*10000)|0) / 100;
};

util.generateIterationMap = function generateIterationMap(inputData) {
	return (
		util.getInstruments(inputData)
			.reduce(function(acc, cur) {
				return acc.concat(cur.results.map(function(result) {
					return {
						invocation: result.invocation,
						key: cur.key,
						loc: cur.loc.start,
						kind: cur.stack[cur.stack.length-1],
						depth: result.depth,
						time: result.time,
						timeOffset: result.timeOffset,
						memoryUsage: result.memoryUsage,
						milestone: result.milestone
					};
				}));
			}, [])
			.sort(function(a, b) {
				return a.invocation - b.invocation;
			})
	);
};

util.generateMemoryStats = function generateMemoryStats(inputData) {
	var instruments = util.getInstruments(inputData),
		iterationMap = util.generateIterationMap(inputData);

	instruments.forEach(function(instrument) {

		instrument.avgMemChanges =
			instrument.results.map(function(result) {
				var prev = result.invocation > 0 ? result.invocation - 1 : 0;
					prev = iterationMap[prev].memoryUsage;

				return {
					rss: result.memoryUsage.rss - prev.rss,
					heapTotal: result.memoryUsage.heapTotal - prev.heapTotal,
					heapUsed: result.memoryUsage.heapUsed - prev.heapUsed,
				};
			})
			.reduce(function(acc, cur, idx, array) {
				var factor = 1 / array.length;
				acc.rss			+= cur.rss * factor;
				acc.heapTotal	+= cur.heapTotal * factor;
				acc.heapUsed	+= cur.heapUsed * factor;
				return acc;
			}, { rss: 0, heapTotal: 0, heapUsed: 0 });
	})
};




