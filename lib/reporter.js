"use strict";

// For monkey patching mocha, when I can work that out.
var mochaPath = process.argv[1].replace(/\/bin\/_mocha$/i, "");

var instrument		= require("./instrumentor"),
	stats			= require("./stats"),
	columnify		= require("columnify"),
	fs				= require("fs"),
	path			= require("path"),
	mocha			= require(mochaPath);

// Override require
require("./require-override");

global.__steamshovel = true;
global.__steamshovel_milestone = null;
global.__steamshovel_record_expression = !!process.env.SHOVEL_RECORD_EXPRESSION;
global.__steamshovel_test_depth = 0;

function locateMap(done) {
	console.log("Scanning for shovelmap...");

	fs.readdir(process.cwd(), function(err, dir) {
		if (err) throw err;

		var complete = 0;

		dir.forEach(function(file) {
			file = path.join(process.cwd(), file, "./instruments.shovelmap");

			fs.stat(file, function(err, data) {
				complete ++;
				if (!err) {
					require(file);
					console.log("Located shovelmap at %s!", file);
				}

				if (complete === dir.length) {
					done();
				}
			});
		})
	});
}

function SteamShovel(runner) {
	console.log("Steam Shovel");

	var failures = [],
		suiteName = null;

	runner.suite.beforeAll(function(done) {
		console.log("Commencing coverage test!");
		locateMap(done);
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

				console.error("•\t%s\n\n\t%s\n\n", test.title, err.stack);
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
			function(err, result) {
				if (err) throw err;

				console.log("\nReport written to disk.\n");
			}
		);
	});
}

exports = module.exports = SteamShovel;