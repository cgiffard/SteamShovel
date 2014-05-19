"use strict";

var fs		= require("fs"),
	util	= require("../stats/utils"),
	stats	= require("../stats/index");

module.exports = function generateJSON(inputData, path, callback) {
	console.log("Stringifying JSON...");
	var data = JSON.stringify(inputData);

	// Mocha kills an async operation...
	fs.writeFileSync(path || "./raw-instrument-data.json", data);
	callback();
};