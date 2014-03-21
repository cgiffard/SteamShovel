#!/usr/bin/env node

var clog = console.log,
	cler = console.error,
	n = null;

require("./process")(process.argv[2], process.argv[3])
	.on("processdir",		clog.bind(n, "Processing directory %s..."))
	.on("mkdir",			clog.bind(n, "Making directory %s..."))
	.on("readdir",			clog.bind(n, "Read directory %s."))
	.on("readfile",			clog.bind(n, "Read file %s."))
	.on("nojs",				clog.bind(n, "Ignoring non-JS file %s..."))
	.on("ignore",			clog.bind(n, "Ignoring marked file %s..."))
	.on("instrumenterror",	cler.bind(n, "Instrument failure: %s: %s"))
	.on("writefile", 		clog.bind(n, "Wrote file %s..."));