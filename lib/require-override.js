var instrument	= require("./instrumentor"),
	fs			= require("fs"),
	path		= require("path");

var originalFunction = require.extensions[".js"];

function stripBOM(content) {
	// Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
	// because the buffer-to-string conversion in `fs.readFileSync()`
	// translates it to FEFF, the UTF-16 BOM.
	if (content.charCodeAt(0) === 0xFEFF) {
		content = content.slice(1);
	}
	return content;
}

function setup(override) {
	// Override require to perform auto-instrumentation!
	var instrumentCache = {};
	require.extensions[".js"] = function(module, filename) {
		var dir = __dirname.replace(/lib\-cov$/ig, "lib"),
			content;

		if (instrumentCache[filename]) {
			content = instrumentCache[filename];
		} else {
			content = stripBOM(fs.readFileSync(filename, 'utf8'));
		}

		// Bail out for cache.
		// Only auto-instrument where asked.
		// Don't auto-instrument any previously instrumented code.
		// Don't auto-instrument code marked as 'ignore'.
		// Don't auto-instrument files in a node_modules directory.
		// Don't auto-instrument the instrumentor.
		// Don't auto-instrument our tests.

		if (!instrumentCache[filename] &&
			process.env.AUTO_INSTRUMENT === "true" &&
			!~content.indexOf("__instrumentor_map__") &&
			!~content.indexOf("steamShovel:" + "ignore") &&
			!~filename.indexOf("node_modules") &&
			!~filename.indexOf("test") &&
			!~filename.indexOf(dir) &&
			!~filename.indexOf(path.normalize(dir + "/../test"))) {

			console.warn("Overriding require %s",filename);
			content = instrument(content, filename);
			instrumentCache[filename] = content;
		}

		module._compile(content, filename);

		if (override && override instanceof Function) {
			override(module, content, filename);
		}
	};
}

function restore() {
	require.extensions[".js"] = originalFunction;
}

module.exports = setup;
module.exports.restore = restore;