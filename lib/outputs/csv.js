"use strict";

var fs		= require("fs"),
	util	= require("../stats/utils"),
	stats	= require("../stats/index");

module.exports = function generateCSV(inputData, path, callback) {
	var iterations	= util.generateIterationMap(inputData),
		csvFile		= "",
		csvHeader	=
			Object.keys(iterations[0]).reduce(function keyProc(acc, cur) {
				var item = iterations[0][cur];

				if (item instanceof Object && !Array.isArray(item))
					return acc.concat(
							Object.keys(item)
								.map(function(key) {
									return cur + "." + key;
								}));

				return acc.concat(cur);
			}, [])
			.map(function(key) {
				return '"' + key + '"';
			})
			.join(",");

	csvFile = iterations.reduce(function(file, iteration) {
		return file + "\n" +
			Object.keys(iteration).reduce(function keyProc(acc, cur) {
				var item = iteration[cur];

				if (item instanceof Object && !Array.isArray(item))
					return acc.concat(
							Object.keys(item)
								.map(function(key) {
									return item[key];
								}));

				return acc.concat(item);
			}, [])
			.map(function(key) {
				return '"' + key + '"';
			})
			.join(",");

	}, csvHeader);


	// The intention is of course, to go async as soon as I can work
	// out how to stop mocha killing the script.
	fs.writeFileSync(path || "./report.csv", csvFile);
	callback(csvFile);
};