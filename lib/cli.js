#!/usr/bin/env node

"use strict";

function done(message) {
	return function() {
		var args = [message].concat([].slice.call(arguments,0));
		console.log.apply(console, args);
	};
}

function errr(message) {
	return function(err, file) {
		console.error(message, file);
		console.error(err.stack || err);
	};
}

require("./process")(process.argv[2], process.argv[3])
	.on("processdir",		done("Processing directory %s..."))
	.on("mkdir",			done("Making directory %s..."))
	.on("readdir",			done("Read directory %s."))
	.on("readfile",			done("Read file %s."))
	.on("nojs",				done("Ignoring non-JS file %s..."))
	.on("ignore",			done("Ignoring marked file %s..."))
	.on("instrumenterror",	errr("Instrument failure in %s:"))
	.on("writefile",		done("Wrote file %s..."))
	.on("dircomplete",		done("Directory complete %s..."))
	.on("complete",			done("Processing Complete!"));