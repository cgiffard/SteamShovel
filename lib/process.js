"use strict";

var fs = require("fs"),
	path = require("path"),
	mkdirp = require("mkdirp"),
	instrument = require("./instrumentor"),
	EventEmitter = require("events").EventEmitter;

/*
	Public: Instrument a file or folder using the SteamShovel instrumentor.

	inFile			-	The filesystem location of the input resource
	outFile			-	The filesystem destination for the instrumented resource
	emitter			-	An optional pre-defined event emitter to use when
						emitting status events.

	Returns

		emitter		-	An event emitter from which information about the
						instrumentation progress is dispatched.

	Examples

		instrumentor("myfile.js", "myfile-instrumented.js");

*/

module.exports = function(inFile, outFile, emitter) {

	if (!inFile)
		throw new Error("You must specify an input file/directory.");

	if (!outFile)
		throw new Error("You must specify an output file/directory.");

	emitter =
		emitter && emitter instanceof EventEmitter ? emitter :
			new EventEmitter();

	fs.stat(inFile, function(err, stats) {
		if (err) return emitter.emit("error", err);

		if (stats.isDirectory())
			return module.exports.processDir(inFile, outFile, emitter);

		module.exports.processFile(inFile, outFile, emitter);
	});

	return emitter;
};

/*
	Public: Recursively instrument a folder/directory using the SteamShovel
	instrumentor.

	inDir			-	The filesystem location of the input resource
	outDir			-	The filesystem destination for the instrumented resource
	emitter			-	An optional pre-defined event emitter to use when
						emitting status events.

	Returns

		emitter		-	An event emitter from which information about the
						instrumentation progress is dispatched.

	Examples

		instrumentor("./lib", "./lib-cov");

*/

module.exports.processDir = function processDir(dir, out, emitter) {

	emitter =
		emitter && emitter instanceof EventEmitter ? emitter :
			new EventEmitter();

	emitter.emit("processdir", dir, out);

	try { !fs.statSync(out) }
	catch (e) {
		emitter.emit("mkdir", out);
		mkdirp.mkdirp(out);
	}

	fs.readdir(dir, function(err, dirContents) {
		if (err) return emitter.emit("error", err);

		emitter.emit("readdir", dir);

		dirContents.forEach(function(file) {

			var filePath = path.join(dir, file),
				outPath = path.join(out, file);

			module.exports(filePath, outPath, emitter);
		});
	});

	return emitter;
};

/*
	Public: Instrument a single file using the SteamShovel instrumentor.

	This function will ignore files that the instrumentor cannot parse, files
	which do not have a `.js` file extension, and files which contain

	inFile			-	The filesystem location of the input resource
	outFile			-	The filesystem destination for the instrumented resource
	emitter			-	An optional pre-defined event emitter to use when
						emitting status events.

	Returns

		emitter		-	An event emitter from which information about the
						instrumentation progress is dispatched.

	Examples

		instrumentor("./lib/myfile.js", "./lib-cov/myfile.js");

*/

module.exports.processFile = function processFile(file, out, emitter) {

	emitter =
		emitter && emitter instanceof EventEmitter ? emitter :
			new EventEmitter();

	if (!file.match(/\.js$/i))
		return	emitter.emit("nojs", file),
				fs.createReadStream(file).pipe(fs.createWriteStream(out));

	fs.readFile(file, function(err, data) {
		if (err) return emitter.emit("error", err);

		emitter.emit("readfile", file);

		var code;
			data = String(data);

		if (~data.indexOf("steamShovel:" + "ignore")) {
			emitter.emit("ignore", file);

		} else {
			try {
				code = instrument(data, file);

			} catch (err) {
				emitter.emit("instrumenterror", err, file);
			}
		}

		fs.writeFile(out, code || data, function(err) {
			if (err) return emitter.emit("error", err);

			emitter.emit("writefile", file);
		});
	});

	return emitter;
};