var crypto		= require("crypto"),
	esprima		= require("esprima"),
	escodegen	= require("escodegen"),
	estraverse	= require("estraverse"),

	// Maps for instrumenting
	noReplaceMap		= require("./instrumentor-config").noReplaceMap,
	allowedReplacements	= require("./instrumentor-config").allowedReplacements;

/*
	Public: Instrument a string of JS code using the SteamShovel instrumentor.
	This function executes synchronously.

	data			-	The raw JavaScript code to instrument
	filename		-	The filename of the code in question, for inclusion in
						the instrument map
	incorporateMap	-	Whether to include the map (defaults to true, but useful
						for testing output without the additional noise of the
						map.)

	Returns a string containing the instrumented code.

	Examples

		code = instrumentCode("function(a) { return a; }", "myfile.js");

*/

module.exports = function instrumentCode(data, filename, incorporateMap) {

	filename = filename || "implicit-filename";
	incorporateMap = incorporateMap === false ? false : true;

	var ast = esprima.parse(data, {loc: true, range: true, raw: true}),
		filetag = crypto.createHash("md5").update(filename).digest("hex"),

		// State and storage
		id = 0,
		code = null,
		sourceMap = {};

	// Process AST
	estraverse.replace(ast, {

		// Enter is where we mark nodes as noReplace
		// which prevents bugs around weird edge cases, which I'll probably
		// discover as time goes on.
		//
		// We also record a stack path to be provided to the instrumentor
		// that lets us know our place in the AST when the instrument recorder
		// is called.

		enter: preprocessNode,

		// Leave is where we replace the actual nodes.

		leave: function (node) {

			if (node.noReplace)
				return;

			// If we're allowed to replace the node,
			// replace it with a Sequence Expression.

			if (~allowedReplacements.indexOf(node.type))
				return (
					id++,
					sourceMap["id_" + filetag + "_" + id] = {
						"loc": node.loc,
						"range": node.range,
						"results": [],
						"stack": node.stackPath,
						"type": node.type
					},
					sequenceExpression(
						"id_" + filetag + "_" + id,
						node
					));
		}
	});

	code = escodegen.generate(ast);

	if (incorporateMap)
		code = prependInstrumentorMap(data, filename, code, sourceMap);

	return code;
};

function preprocessNode(node) {
	if (!node.stackPath)
		node.stackPath = [node.type];

	// Now mark a path to the node.
	Object.keys(node).forEach(function(nodekey) {
		var prop = node[nodekey];

		function saveStack(prop) {
			// This property most likely isn't a node.
			if (!prop || typeof prop !== "object" || !prop.type) return;

			prop.stackPath = node.stackPath.concat(prop.type);
		}

		if (Array.isArray(prop))
			prop.forEach(saveStack);

		saveStack(prop);
	});


	var nodeRule = noReplaceMap[node.type];

	if (!nodeRule) return;

	// Convert the rule to an array so we can handle it using
	// the same logic.
	//
	// Strings and arrays just wholesale exclude the child nodes
	// of the current node where they match.

	if (nodeRule instanceof String)
		nodeRule = [nodeRule];

	if (nodeRule instanceof Array) {
		nodeRule.forEach(function(property) {
			if (!node[property]) return;

			if (node[property] instanceof Array)
				return node[property].forEach(function(item) {
					item.noReplace = true;
				});

			node[property].noReplace = true;
		});
	}

	// Whereas this more verbose object style allows
	// exclusion based on subproperty matches.

	if (nodeRule instanceof Object) {
		Object.keys(nodeRule).forEach(function(property) {
			if (!node[property]) return;

			var exclude =
				Object
					.keys(nodeRule[property])
					.reduce(function(prev, cur) {
						if (!prev) return prev;
						return (
							node[property][cur] ===
								nodeRule[property][cur]);
					}, true);

			if (exclude) node[property].noReplace = true;
		});
	}
}

function sequenceExpression(id, node) {
	return {
		"type": "SequenceExpression",
		"expressions": [
			{
				"type": "CallExpression",
				"callee": {
					"type": "Identifier",
					"name": "instrumentor_record"
				},
				"arguments": [
					{
						"type": "Literal",
						"value": id
					}
				]
			},
			node
		]
	}
}

function prependInstrumentorMap(source, filename, code, sourceMap) {
	var filetag = crypto.createHash("md5").update(filename).digest("hex"),
		sourceObject = { "source": String(source), "tag": filetag },
		originalSource = JSON.stringify(sourceObject),
		sourceKey = JSON.stringify("source_" + filename);

	var initialiser =
		"if (typeof __instrumentor_map__ === 'undefined') {" +
			"__instrumentor_map__ = {};" +
		"}\n" +
		"if (!__instrumentor_map__[" + sourceKey + "]) {" +
			"__instrumentor_map__[" + sourceKey + "] = " + originalSource + ";"+
		"}\n";

	Object.keys(sourceMap).forEach(function(key) {
		initialiser +=
			"if (!__instrumentor_map__." + key + ") {"	+
				" __instrumentor_map__." + key + " = "	+
							JSON.stringify(sourceMap[key])	+
			";}\n";
	});

	initialiser += "\n" + require("./instrumentor-record").toString() + "\n";

	return initialiser + code;
}