// preprocess map to ordr instruments in the order they appear in the source
// iterate through source
//     * at each point, search for nearest instrumentor
//     * output html
//     * if instrumentor is there, output something special wrapping whatever
//       the current token is
//     * the special thing should include as much information from the map as
//       possible
//
// that's it I think
//
// it should look nice (better than jscoverage/cover)

var jade = require("jade"),
	fs = require("fs");

module.exports = function generateHTML(inputData, callback, template) {

	// Trickery to avoid indent hell
	if (!template)
		return module.exports.loadTemplate(
			generateHTML.bind(null, inputData, callback));

	var htmlOutput = [],
		sources = module.exports.getSources(inputData);

	sources.forEach(function(source) {
		var instrumentMap	= module.exports.preprocessMap(
										inputData, source.key),
			code			= source.source,
			map				= [],
			buffer			= "",
			pointer			= 0;

		for (; pointer < code.length; pointer++) {

			instrumentMap.forEach(function(instrument) {
				if (pointer === instrument.range[0]) {
					map.push(buffer), buffer = "";
					map.push({
						"open": instrument
					});
				}
			});

			buffer += code[pointer];

			instrumentMap.forEach(function(instrument) {
				if (pointer === instrument.range[1]) {
					map.push(buffer), buffer = "";
					map.push({
						"close": instrument
					});
				}
			});
		}

		if (buffer.length)
			map.push(buffer), buffer = "";

		htmlOutput.push(
			template({
				"stats": require("../stats/index").basic(inputData),
				"codeMap": map,
				"filename": source.filename,
				"key": source.key
			})
		);
	});

	fs.writeFileSync("./report.html",htmlOutput.join("<br /><br /><br />"));

	callback(htmlOutput);
};

module.exports.extension = "html";

module.exports.loadTemplate = function loadTemplate(cb) {
	// Flicked this back to synchronous to play nicely with
	// mocha, which wasn't waiting for this to finish.
	data = fs.readFileSync(__dirname + "/templates/main.jade", "utf8");
	cb(jade.compile(data));
};

module.exports.preprocessMap = function preprocessMap(inputData, key) {
	return (
		module.exports.getInstruments(inputData, key)
			.sort(function(a, b) {
				return a.range[0] - b.range[0];
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
}