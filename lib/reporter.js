exports = module.exports = SteamShovel;

var stats = require("./stats"),
	columnify = require("columnify");

global.__steamshovel = true;
console.log("Steam Shovel");

function SteamShovel(runner) {

	var failures = [];

	runner.suite.beforeAll(function() {
		console.log("Commencing coverage test!");
	});

	runner.on('pass', function(test){
		process.stdout.write(".");
	});

	runner.on('fail', function(test, err){
		process.stdout.write("x");
		failures.push([test, err]);
	});

	runner.on('end', function(){

		console.log("\n\n");

		if (failures.length) {
			console.error("Test failures occurred while processing!");

			return failures.forEach(function(failure) {
				var test = failure[0], err = failure[1];

				console.error("• %s\n\t%s\n%s\n\n", test.title, err, err.stack);
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

		console.log(outputTable);
	});

}