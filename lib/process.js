var fs = require("fs"),
	path = require("path"),
	mkdirp = require("mkdirp"),
	instrument = require("./instrumentor");

// CHANGE THIS TO BE AN ASYNC PROCESS THAT NOTIFIES VIA EVENT EMITTERS


module.exports = function(inFile, outFile) {
	if (!inFile)
		throw new Error("You must specify an input file/directory.");

	if (!outFile)
		throw new Error("You must specify an output file/directory.");

	var stats = fs.statSync(inFile);

	if (stats.isDirectory())
		return module.exports.processDirectory(inFile, outFile);

	return module.exports.processFile(inFile, outFile)
};

module.exports.processDirectory = function processDirectory(directory, out) {

	try { !fs.statSync(out) }
	catch (e) {
		mkdirp.mkdirp(out);
	}

	fs.readdirSync(directory).forEach(function(file) {
		var filePath = path.join(directory, file),
			outPath = path.join(out, file);

		console.log("Processing: %s --> %s", filePath, outPath);

		if (fs.statSync(filePath).isDirectory())
			return processDirectory(filePath, outPath);

		module.exports.processFile(filePath, outPath);
	});
};

module.exports.processFile = function processFile(file, out) {

	if (!file.match(/\.js$/i))
		return console.log("Ignoring %s — not JavaScript file.", file);

	var code,
		data = fs.readFileSync(file, "utf8")

	try {
		code = instrument(data, file);

	} catch (e) {
		console.error("Failed to instrument %s. Writing raw file.", file);
		console.error(e.stack);
	}

	if (~data.indexOf("steamShovel:" + "ignore")) {
		console.error("Ignoring %s due to explicit statement.", file);
		code = data;
	}

	fs.writeFileSync(out, code || data);
};