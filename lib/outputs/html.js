"use strict";

var jade	= require("jade"),
	fs		= require("fs"),
	util	= require("../stats/utils"),
	stats	= require("../stats/index");

module.exports = function generateHTML(inputData, path, callback, template) {

	// Trickery to avoid indent hell
	if (!template)
		return module.exports.loadTemplate(
			generateHTML.bind(null, inputData, path, callback));

	console.log("Calculating sources and memory data...");

	var htmlOutput = [],
		sources = module.exports.getSources(inputData);
		util.generateMemoryStats(inputData);

	console.log("Rendering source buffers...");

	sources.forEach(function(source) {
		console.log("\tRendering %s",source.filename);

		var instrumentMap	= module.exports.preprocessMap(
										inputData, source.key),
			code			= source.source,
			map				= [],
			buffer			= "",
			bufferState		= false,
			pointer			= 0,
			iIdx			= 0;

		for (; pointer < code.length; pointer++) {

			for (; iIdx < instrumentMap.length; iIdx ++) {
				if (instrumentMap[iIdx].range[0] > iIdx)
					break;

				if (pointer === instrument.range[0]) {
					map.push(buffer), buffer = "";
					map.push({
						"open": instrument
					});
				}
			}

			if (bufferState !== !!code[pointer].match(/\s+/) && buffer.length)
				bufferState = !bufferState,
				map.push(buffer),
				buffer = "";

			buffer += code[pointer];

			for (iIdx = 0; iIdx < instrumentMap.length; iIdx ++) {
				if (instrumentMap[iIdx].range[1] > iIdx)
					break;

				if (pointer === instrument.range[1]) {
					map.push(buffer), buffer = "";
					map.push({
						"close": instrument
					});
				}
			}
		}

		if (buffer.length)
			map.push(buffer), buffer = "";

		htmlOutput.push({
			"stats":	stats.basic(inputData, source.key),
			"codeMap":	map,
			"filename":	source.filename,
			"key":		source.key
		});
	});

	console.log("Writing rendered template to disk...");

	fs.writeFileSync(path || "./report.html",
		template({
			"script":	fs.readFileSync(__dirname+"/templates/main.js","utf8"),
			"style":	fs.readFileSync(__dirname+"/templates/main.css","utf8"),
			"files":	htmlOutput,
			"stats":	stats.basic(inputData)
		})
	);

	callback(htmlOutput);
};

module.exports.extension = "html";

module.exports.loadTemplate = function loadTemplate(cb) {
	// Flicked this back to synchronous to play nicely with
	// mocha, which wasn't waiting for this to finish.
	var data = fs.readFileSync(__dirname + "/templates/main.jade", "utf8");
	cb(jade.compile(data));
};

module.exports.preprocessMap = function preprocessMap(inputData, key) {
	return (
		module.exports.getInstruments(inputData, key)
			.sort(function(a, b) {
				return a.range[0] - b.range[0];
			})
			.map(function(item) {
				item.score = util.calculateValue(inputData)(item);
				item.depth = util.getMinimumDepth(item);
				return item;
			}));
};

module.exports.getSources = function getSources(inputData) {
	return (
		Object.keys(inputData)
			.filter(function(key) {
				return ~key.indexOf("source_");
			})
			.map(function(key) {
				return {
					"filename": key.substr("source_".length),
					"source": inputData[key].source,
					"key": inputData[key].tag,
				}
			}));
};

module.exports.getInstruments = function getInstruments(inputData, key) {
	key = key || "";

	return (
		Object.keys(inputData)
			.filter(function(testKey) {
				return ~testKey.indexOf(key);
			})
			.map(function(key) {
				return inputData[key];
			}));
};