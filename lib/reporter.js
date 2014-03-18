exports = module.exports = SteamShovel;

global.__steamshovel = true;
console.log("Steam Shovel");

function SteamShovel(runner) {

	runner.suite.beforeAll(function() {
		console.log("Commencing coverage test!");
	});

	runner.on('pass', function(test){
		process.stdout.write(".");
	});

	runner.on('fail', function(test, err){
		process.stdout.write("x");
	});

	runner.on('end', function(){

		console.log("\n");

		var cov = global.__instrumentor_map__ || {};

		console.log(cov);

	});

}