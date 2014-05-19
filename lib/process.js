"use strict";

var fs = require("fs"),
	path = require("path"),
	mkdirp = require("mkdirp"),
	instrument = require("./instrumentor"),
	assert = require("assert"),
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

module.exports = function instrumentTree(inFile, outFile, emitter) {
	var combinedMap = {}, isDirectory = false;

	// Is this the first call in the stack?
	// We know because every recursion will have an emitter.
	var firstCall = !emitter;

	emitter =
		emitter && emitter instanceof EventEmitter ? emitter :
			new EventEmitter();

	if (!inFile)
		throw new Error("You must specify an input file/directory.");

	if (!outFile)
		throw new Error("You must specify an output file/directory.");

	if (inFile instanceof Array) {
		assert(outFile instanceof Array,
				"If an array if input resources is provided, " +
				"the output must also be an array.");

		assert(outFile.length === inFile.length,
				"The lengths of the input and destination arrays must match.");


		// Loop through both arrays, but retain the same emitter
		inFile.forEach(function(file, index) {
			instrumentTree(file, outFile[index], emitter);
		});

		return emitter;

	} else {
		assert(typeof outFile === "string",
			"If the first parameter is not an array, the second mustn't be.");
	}

	fs.stat(inFile, function(err, stats) {
		if (err) return emitter.emit("error", err, inFile);

		if (stats.isDirectory()) {
			isDirectory = true;

			if (firstCall)
				emitter.on("dircomplete", function(dir) {
					if (dir === inFile) emitter.emit("_int_complete", inFile);
				});

			return module.exports.processDir(inFile, outFile, emitter);
		}

		if (firstCall)
			emitter.on("writefile", function(file) {
				if (file === inFile) emitter.emit("complete", inFile);
			});

		module.exports.processFile(inFile, outFile, emitter);
	});

	// This chunk writes an 'instruments.shovelmap' file into the directory
	// being instrumented. This file contains a map of all the data from all
	// the files which were instrumented, so if a given file is not included
	// in the test suite, its data will still appear in output.
	
	if (firstCall) {
		emitter.on("map", function(sourceMap) {
			combinedMap[sourceMap.filetag] = sourceMap;
		});

		emitter.on("_int_complete", function(inFile) {
			var writePath = path.join(outFile, "./instruments.shovelmap");

			fs.writeFile(
				writePath,
				"__instrumentor_map__ = " + JSON.stringify(combinedMap),
				function(err) {
					if (err) emitter.emit("maperror", err);
					emitter.emit("complete", inFile);
				});
		});
	}

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

	try { fs.statSync(out); }
	catch (e) {
		emitter.emit("mkdir", out);
		mkdirp.mkdirp(out);
	}

	fs.readdir(dir, function(err, dirContents) {
		if (err) return emitter.emit("error", err, dir);

		emitter.emit("readdir", dir);

		dirContents.forEach(function(file) {

			var filePath = path.join(dir, file),
				outPath = path.join(out, file);

			module.exports(filePath, outPath, emitter);
		});

		var instrumentedFiles = 0;
		function checkComplete(file) {
			if (file instanceof Error)
				file = arguments[1];

			if (dirContents.reduce(function(acc, cur) {
					return acc || (dir + "/" + cur === file);
				}, false))
				instrumentedFiles ++;

			if (instrumentedFiles === dirContents.length) {
				emitter.removeListener("writefile", checkComplete);
				emitter.removeListener("dircomplete", checkComplete);
				emitter.emit("dircomplete", dir);
			}
		}

		emitter.on("writefile", 	checkComplete);
		emitter.on("dircomplete",	checkComplete);
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
				fs	.createReadStream(file)
					.pipe(fs.createWriteStream(out))
					.on("close", function() {
						emitter.emit("writefile", file);
					});

	fs.readFile(file, function(err, data) {
		if (err) return emitter.emit("error", err, file);

		emitter.emit("readfile", file);

		var instrumentResult,
			code;
			data = String(data);

		if (~data.indexOf("steamShovel:" + "ignore")) {
			emitter.emit("ignore", file);

		} else {
			try {
				instrumentResult = instrument.withmap(data, file);
				code = instrumentResult.code;

			} catch (err) {
				emitter.emit("instrumenterror", err, file);
			}
		}

		fs.writeFile(out, code || data, function(err) {
			if (err) return emitter.emit("error", err, file);

			if (instrumentResult && instrumentResult.map) {
				emitter.emit("map", instrumentResult.map);
			}

			emitter.emit("writefile", file);
		});
	});

	return emitter;
};