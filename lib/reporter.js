"use strict";

exports = module.exports = SteamShovel;

var instrument		= require("./instrumentor"),
	stats			= require("./stats"),
	columnify		= require("columnify"),
	fs				= require("fs"),
	path			= require("path");

global.__steamshovel = true;
global.__steamshovel_milestone = null;

function stripBOM(content) {
	// Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
	// because the buffer-to-string conversion in `fs.readFileSync()`
	// translates it to FEFF, the UTF-16 BOM.
	if (content.charCodeAt(0) === 0xFEFF) {
		content = content.slice(1);
	}
	return content;
}

// Override require to perform auto-instrumentation!
var instrumentCache = {};
require.extensions[".js"] = function(module, filename) {
	var dir = __dirname.replace(/lib\-cov$/ig, "lib"),
		content;

	if (instrumentCache[filename]) {
		content = instrumentCache[filename];
	} else {
		content = stripBOM(fs.readFileSync(filename, 'utf8'));
	}

	// Bail out for cache.
	// Only auto-instrument where asked.
	// Don't auto-instrument any previously instrumented code.
	// Don't auto-instrument code marked as 'ignore'.
	// Don't auto-instrument files in a node_modules directory.
	// Don't auto-instrument the instrumentor.
	// Don't auto-instrument our tests.

	if (!instrumentCache[filename] &&
		process.env.AUTO_INSTRUMENT === "true" &&
		!~content.indexOf("__instrumentor_map__") &&
		!~content.indexOf("steamShovel:" + "ignore") &&
		!~filename.indexOf("node_modules") &&
		!~filename.indexOf("test") &&
		!~filename.indexOf(dir) &&
		!~filename.indexOf(path.normalize(dir + "/../test"))) {

		console.warn("Overriding require %s",filename),
		content = instrument(content, filename);
		instrumentCache[filename] = content;
	}

	module._compile(content, filename);
};

function SteamShovel(runner) {
	console.log("Steam Shovel");

	var failures = [],
		suiteName = null;

	runner.suite.beforeAll(function() {
		console.log("Commencing coverage test!");
	});

	runner.on('suite', function(suite){
		suiteName = suite.title;
	});

	runner.on('test', function(test){
		global.__steamshovel_milestone =
			(suiteName ? suiteName + ", " : "") + test.title;
	});

	runner.on('pass', function(test){
		process.stdout.write(".");
	});

	runner.on('fail', function(test, err){
		process.stdout.write("x");
		failures.push([test, err]);
	});

	runner.on('end', function(done){

		console.log("\n\n");

		if (failures.length) {
			console.error("Test failures occurred while processing!");

			return failures.forEach(function(failure) {
				var test = failure[0], err = failure[1];

				console.error("• %s\n\t%s\n\n", test.title, err.stack);
			});
		}

		var coverageData = global.__instrumentor_map__ || {},
			basicStats = stats.basic(coverageData),
			arrayTransformedStats = Object.keys(basicStats).map(function(key) {
				return {
					"kind": key,
					"covered": basicStats[key].covered,
					"total": basicStats[key].total,
					"percentage": basicStats[key].percentage
				};
			});

		var outputTable = columnify(arrayTransformedStats, {
			columnSplitter: " | "
		});

		console.log(outputTable, "\n\n");

		var output = process.env.REPORTER_OUTPUT || "html",
			outputPath = process.env.OUTPUT_PATH;

		require("./outputs/" + output)(
			coverageData,
			outputPath,
			function(result) {
				console.log("\nReport written to disk.\n");
			}
		);
	});

}