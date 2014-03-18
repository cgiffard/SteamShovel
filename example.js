
var prop = {
	"abc": {
		"def": {
			"hij": function() {
				prop.abc.xyz();
			}
		},
		"xyz": function() {
			console.log("bokko!");

			var v = function(wump) {
				console.log("voibus");

				for (var fish = 1; fish < 99; fish ++) {
					console.log("voibus");
				}
			}
		}
	}
}


module.exports = function() {
	var accumulate = 0;
	for (var i = 0; i < 100; i++) {
		console.log("we got %s", i);
		prop.abc.def.hij();
		accumulate += i;
	}

	return accumulate;
};

module.exports.fish = function() {
	return "fish";
}