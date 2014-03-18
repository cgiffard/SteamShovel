exports = module.exports = SteamShovel;

function SteamShovel(runner) {

	runner.on('end', function(){

		var cov = global.__instrumentor_map__ || {};

		console.log(cov);

	});

}
