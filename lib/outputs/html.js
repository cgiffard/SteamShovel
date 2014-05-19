"use strict";

var jade	= require("jade"),
	fs		= require("fs"),
	util	= require("../stats/utils"),
	stats	= require("../stats/index");

var scoreClasses = [
	"perfect",
	"great",
	"good",
	"average",
	"poor",
	"worse",
	"abysmal",
	"you-should-be-ashamed"
].reverse();

var generateMap;

module.exports = function generateHTML(inputData, path, callback, template) {

	// Trickery to avoid indent hell
	if (!template)
		return module.exports.loadTemplate(
			generateHTML.bind(null, inputData, path, callback));

	var htmlOutput = [], sources;

	console.log("Getting sources...");
	sources = module.exports.getSources(inputData);

	console.log("Generating memory statistics...");
	util.generateMemoryStats(inputData);

	console.log("Rendering source buffers...");

	sources.forEach(function(source) {
		console.log("\tRendering %s",source.filename);

		htmlOutput.push({
			"stats":	stats.basic(inputData, source.key),
			"codeMap":	generateMap(inputData, source),
			"filename":	source.filename,
			"key":		source.key
		});
	});

	console.log("Loading template resources...");

	var script = fs.readFileSync(__dirname+"/templates/main.js","utf8"),
		styles = fs.readFileSync(__dirname+"/templates/main.css","utf8");

	console.log("Writing rendered template to disk...");

	fs.writeFileSync(path || "./report.html",
		htmlOutput = template({
			"script":	script,
			"style":	styles,
			"files":	htmlOutput,
			"stats":	stats.basic(inputData),
			"classes":	scoreClasses
		})
	);

	callback(null, htmlOutput);
};

module.exports.extension = "html";

generateMap = module.exports.generateMap =
	function generateMap(inputData, source) {
	var instrumentMap	= module.exports.preprocessMap(
									inputData, source.key),
		comments		= source.commentRanges,
		code			= source.source,
		map				= [],
		buffer			= "",
		bufferState		= false,
		pointer			= 0,
		iIdx			= 0;

	for (; pointer < code.length; pointer++) {

		for (; iIdx < instrumentMap.length; iIdx ++) {
			if (instrumentMap[iIdx].range[0] > pointer)
				break;



			if (pointer === instrumentMap[iIdx].range[0]) {
				map.push(buffer);
				buffer = "";
				map.push({
					"open": instrumentMap[iIdx]
				});
			}
		}

		if (bufferState !== (!!code[pointer].match(/\s+/) && buffer.length)) {
			bufferState = !bufferState;
			map.push(buffer);
			buffer = "";
		}

		buffer += code[pointer];

		for (iIdx = 0; iIdx < instrumentMap.length; iIdx ++) {
			if (instrumentMap[iIdx].range[1] > pointer)
				break;

			if (pointer === instrumentMap[iIdx].range[1]) {
				map.push(buffer);
				buffer = "";
				map.push({
					"close": instrumentMap[iIdx]
				});
			}
		}
	}

	if (buffer.length) {
		map.push(buffer);
		buffer = "";
	}

	return map;
};

module.exports.loadTemplate = function loadTemplate(cb) {
	// Flicked this back to synchronous to play nicely with
	// mocha, which wasn't waiting for this to finish.
	var data = fs.readFileSync(__dirname + "/templates/main.jade", "utf8");
	cb(jade.compile(data));
};

module.exports.preprocessMap = function preprocessMap(inputData, key) {
	return (
		util.getInstruments(inputData, key)
			.sort(function(a, b) {
				return a.range[0] - b.range[0];
			})
			.map(function(item) {
				item.score = util.calculateValue(inputData)(item);
				item.depth = Math.min.apply(Math,
								item.results.map(util.withkey("depth")));
				return item;
			}));
};

module.exports.getSources = function getSources(inputData) {
	return (
		Object.keys(inputData)
			.map(function(key) {
				return inputData[key];
			})
			.map(function(item) {
				return {
					"filename":	item.filename,
					"source": 	item.source,
					"key":		item.filetag
				};
			}));
};