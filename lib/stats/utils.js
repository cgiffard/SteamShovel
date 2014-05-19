// Utilities for generating statistics

var util = module.exports = {};

/*
	Public: Very lame memoiser function. Only looks at the first argument.

	fn				-	The function to memoise.

	Returns a wrapped function

	Examples

		myFunction = util.cache(function myFunction() { ... });

*/
util.functionCache = {};
util.cache = function cache(fn) {
	util.functionCache[fn.name] = {};

	return function(key) {
		if (typeof key === "object") {
			if (key["__cache_" + fn.name])
				return key["__cache_" + fn.name];

			Object.defineProperty(key, "__cache_" + fn.name, {
				value: fn.apply(util, arguments),
				enumerable: false
			});

			return key["__cache_" + fn.name];
		}

		if (typeof key !== "object" &&
			util.functionCache[fn.name][key])
				return util.functionCache[fn.name][key];

		return (
			util.functionCache[fn.name][key] =
				fn.apply(util, arguments)
		);
	};
};

/*
	Public: For use in mapping. Returns a function that returns the specified
	key from its input data.

	key				-	The key to return.

	Returns the function that performs the property access.

	Examples

		// Returns all the data properties from the objects in the array
		var arr = arr.map(util.withkey("data"));

*/
util.withkey = util.cache(function withkey(key) {
	return function(data) {
		return data[key];
	};
});

/*
	Public: For use in filtering. Returns a function that returns true for
	instruments of the type (AST Node type) specified in the wrapper function.

	type			-	The AST Node type which will trigger a truthy return

	Returns true or false

	Examples

		var varDecs = instruments.map(util.isOfType("VariableDeclaration"));

*/
util.isOfType = util.cache(function isOfType(types) {
	types = types instanceof Array ? types : [types];

	return function(item) {
		return types.reduce(function(acc, cur) {
			return acc || ~item.stack.indexOf(cur);
		}, false);
	};
});

/*
	Public: For use in filtering. Returns true for a given instrument which has
	results.

	instrument		-	An instrument to test

	Returns true if the instrument has results, false if not.

	Examples

		var instrumentsWithResults = instruments.map(util.hasResults);

*/
util.hasResults = function hasResults(instrument) {
	return (instrument && instrument.results && instrument.results.length);
};

/*
	Public: Returns rounded percentage for the percent a of b.

	Returns a number representing a percentage.

*/
util.percentage = function percentage(a, b) {
	return (+((a/b)*10000)|0) / 100;
};

/*
	Public: Gets the instrument map from the raw instrumentation data.

	instrumentData	-	The complete, raw instrument Data
	filetag			-	Only return instruments matching this filetag

	Returns an array of instruments.

	Examples

		var instruments = util.getInstruments(instrumentData);

*/
util.getInstruments = function getInstruments(instrumentData, filetag) {
	if (instrumentData instanceof Array)
		return instrumentData;

	return Object.keys(instrumentData).reduce(function(acc, cur) {
		var instruments = instrumentData[cur].instruments;

		if (filetag && cur !== filetag) return acc;

		return acc.concat(Object.keys(instruments).map(function(key) {
			instruments[key].id = key;
			instruments[key].filetag = cur;
			return instruments[key];
		}));
	}, []);
};

/*
	Public: Returns the stack depth of the shallowest call across all
	instruments in the instrument map

	instrumentMap	-	The complete instrument map
	filetag			-	Only measure the depth of instruments matching this
						filetag

	Returns a function which calculates the value of a given instrument.

	Examples

		var shallowestCallDepth = util.shallowestCall(instrumentMap);

*/
util.shallowestCall = function shallowestCall(instrumentData, key) {
	return Math.min.apply(Math,
		util.getInstruments(instrumentData, key)
			.filter(util.hasResults)
			.map(function(item) {
				return Math.min.apply(Math,
					item.results.map(util.withkey("depth")));
			})
	);
};

/*
	Public: Given the entire instrument map, returns a function which calculates
	the 'coverage' value of a given instrument.

	instrumentMap	-	The complete instrument map

	Returns a function which calculates the value of a given instrument.

	Examples

		var getValue = util.calculateValue(instrumentMap);
		var value = getValue(instrument);

*/
util.calculateValue = function calculateValue(instrumentMap) {
	var shallowMark = util.shallowestCall(instrumentMap),
		graceThreshold = 5,
		inverseDampingFactor = 1.25;

	return function(item) {
		return (
			Math.max.apply(Math,
				item.results
					.map(util.withkey("depth"))
					.map(util.calculate.bind(	null,
												shallowMark,
												graceThreshold,
												inverseDampingFactor ))));
	};
};

/*
	Public: Given a shallowMark, graceThreshold, and depth, this function runs
	the per-node calculation responsible for delivering the coverage value.

	shallowMark	-	The shallowest measured call in the test suite. This is an
					approximation of the actual call stack depth of the test,
					and is really a balancing term. The true depth of a call as
					far as steamshovel is concerned is 'depth - shallowMark' to
					determine the relative depth.
	grace		-	The relative depth threshold below which the score of a
					given result will not be decreased.
	damping		-	A fitting parameter by which the calculation is made.
					SteamShovel uses a default of 1.25. This value is purely
					one that seemed to produce 'fair' results in testing.
	depth		-	The depth of the invocation.

	Returns a number representing the score of the given instrument. This score
	is derived from the straightforward equation:

		score = 1 / ((damping ^ relativeDepth) / damping)

	relativeDepth is calculated by subtracting the shallowMark and then the
	graceThreshold values from the input depth, and taking the result, or 1 —
	whichever is larger.

	Examples

		nodeValue = calculate(5, 5, 1.25, 15);

*/
util.calculate = function calculate(	shallowMark,
										graceThreshold,
										inverseDampingFactor,
										depth
									) {

	// Calculate inverse logarithm
	var relativeDepth = (depth - shallowMark) + 1;
		relativeDepth = relativeDepth - graceThreshold;
		relativeDepth = relativeDepth <= 1 ? 1 : relativeDepth;

	return 1 / (
		Math.pow(inverseDampingFactor, relativeDepth) /
			inverseDampingFactor);
};

/*
	Public: Given the entire instrument map, burns memory usage information
	calculated from the probe data back into the instrument map.

	This function is poorly realised and is likely to change.

	instrumentMap	-	The complete instrument map

	Returns the mutated instrument map.

	Examples

		var instruments = util.generateMemoryStats(instrumentMap);

*/
util.generateMemoryStats = function generateMemoryStats(inputData) {
	var defaults		= { rss: 0, heapTotal: 0, heapUsed: 0 },
		instruments		= util.getInstruments(inputData),
		iterationMap	= util.generateIterationMap(inputData);

	function mapper(result) {
		var prev = result.invocation > 0 ? result.invocation - 1 : 0;
			prev =
				iterationMap[prev] ? iterationMap[prev].memoryUsage : defaults;

		return {
			rss: result.memoryUsage.rss - prev.rss,
			heapTotal: result.memoryUsage.heapTotal - prev.heapTotal,
			heapUsed: result.memoryUsage.heapUsed - prev.heapUsed,
		};
	}

	function reducer(acc, cur, idx, array) {
		var factor = 1 / array.length;
		acc.rss			+= cur.rss * factor;
		acc.heapTotal	+= cur.heapTotal * factor;
		acc.heapUsed	+= cur.heapUsed * factor;
		return acc;
	}

	for (var i = 0; i < instruments.length; i++)
		instruments[i].avgMemChanges =
			instruments[i]
				.results.map(mapper)
				.reduce(reducer, defaults);

	return instruments;
};

/*
	Public: Given the entire instrument map, return a list of probe calls with
	their associated data.

	instrumentMap	-	The complete instrument map
	filetag			-	Scope to instruments matching this filetag

	Returns a list of invocations (probe calls) with associated data.

	Examples

		var iterations = util.generateIterationMap(instrumentMap);

*/
util.generateIterationMap = function generateIterationMap(instrumentMap, key) {
	return (
		util.getInstruments(instrumentMap, key)
			.reduce(function(acc, cur) {
				return acc.concat(cur.results.map(function(result) {
					return {
						invocation:		result.invocation,
						key:			cur.key,
						loc:			cur.loc.start,
						kind:			cur.stack[cur.stack.length-1],
						depth:			result.depth,
						time:			result.time,
						timeOffset:		result.timeOffset,
						memoryUsage:	result.memoryUsage,
						milestone:		result.milestone,
						isLine:			!!cur.line
					};
				}));
			}, [])
			.sort(function(a, b) {
				return a.invocation - b.invocation;
			})
	);
};



// var util = module.exports = {};
// util.getMinimumDepth = function getMinimumDepth(item) {
//	 return item.minDepth || Math.min.apply(Math, item.results.map(util.depth));
// };
//
// util.depth = function depth(result) {
//	 return result.depth;
// };
//
//
