/*global require:true, module:true */

var crypto		= require("crypto"),
	esprima		= require("esprima"),
	escodegen	= require("escodegen"),
	estraverse	= require("estraverse"),

	// Maps for instrumenting
	noReplaceMap		= require("./instrumentor-config").noReplaceMap,
	allowedReplacements	= require("./instrumentor-config").allowedReplacements,
	noPrependMap		= require("./instrumentor-config").noPrependMap,
	allowedPrepend		= require("./instrumentor-config").allowedPrepend;

// Local definitions for functions in this file
var callExpression,
	expressionStatement,
	fileID,
	prependInstrumentorMap,
	preprocessNode;

/*
	Public: Instrument a string of JS code using the SteamShovel instrumentor.
	This function executes synchronously.

	data			-	The raw JavaScript code to instrument
	filename		-	The filename of the code in question, for inclusion in
						the instrument map
	incorporateMap	-	Whether to include the map (defaults to true, but useful
						for testing output without the additional noise of the
						map.)
	returnAsObject	-	Return the data as an object containing the instrumented
						code and the source map.

	Returns a string containing the instrumented code.

	Examples

		code = instrumentCode("function(a) { return a; }", "myfile.js");

*/

module.exports =
	function instrumentCode(data, filename, incorporateMap, returnAsObject) {

	filename = filename || "implicit-filename";
	incorporateMap = incorporateMap === false ? false : true;

	var esprimaOptions = {loc: true, range: true, raw: true, comment: true},
		ast = esprima.parse(data, esprimaOptions),
		filetag = fileID(filename),
		comments = ast.comments,

		// State and storage
		id = 0,
		code = null,
		sourceMap = {};

	// Add metadata
	sourceMap.filetag = filetag;
	sourceMap.filename = filename;

	// Add raw sourcecode
	sourceMap.source = String(data);

	// Bucket for instruments
	sourceMap.instruments = {};

	// Add comment ranges to sourceMap
	sourceMap.comments = comments.map(function(comment) {
		return comment.range;
	});

	function sourceMapAdd(id, node, line) {
		if (sourceMap.instruments[id])
			throw new Error("Instrument error: Instrument already exists!");

		sourceMap.instruments[id] = {
			"loc": node.loc,
			"range": node.range,
			"results": [],
			"stack": node.stackPath,
			"type": node.type,
			"line": !!line
		};
	}

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

			// Does this node have a body? If so we can replace its contents.
			if (node.body && node.body.length) {
				node.body =
					[].slice.call(node.body, 0)
					.reduce(function(body, node) {

						if (!~allowedPrepend.indexOf(node.type))
							return body.concat(node);

						id++;
						sourceMapAdd(id, node, true);

						return body.concat(
							expressionStatement(
								callExpression(filetag, id)
							),
							node
						);

					}, []);
			}

			if (node.noReplace)
				return;

			// If we're allowed to replace the node,
			// replace it with a Call Expression.

			if (~allowedReplacements.indexOf(node.type))
				return (
					id ++,
					sourceMapAdd(id, node, false),
					callExpression(filetag, id, node)
				);
		}
	});

	code = escodegen.generate(ast);

	if (incorporateMap)
		code = prependInstrumentorMap(code, sourceMap);

	if (returnAsObject)
		return { "code": code, "map": sourceMap };

	return code;
};

module.exports.withmap = function(data, filename, incorporateMap) {
	return module.exports(data, filename, incorporateMap, true);
};

/*
	Public: Preprocess a node to save the AST stack/path into the node, and
	to mark whether its children should be replaced or not.

	data			-	The AST node as represented by Esprima.

	Returns null.

	Examples

		preprocessNode(astNode);

*/

preprocessNode = module.exports.preprocessNode =
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
};

/*
	Public: Generates a replacement CallExpression for a given node,
	which invokes the instrument function, passing an id and the resolved
	value of the original expression as the first and second arguments.

	id				-	A unique ID string to mark the call
	node			-	The AST node as represented by Esprima.

	Returns an object representing a replacement node.

	Examples

		callExpression(id, astNode);

*/

callExpression = module.exports.callExpression =
	function callExpression(filetag, id, node) {

	var callArgs = [
		{
			"type": "Literal",
			"value": filetag
		},
		{
			"type": "Literal",
			"value": id
		}
	];

	if (!!node) callArgs.push(node);

	return {
		"type": "CallExpression",
		"callee": {
			"type": "Identifier",
			"name": "instrumentor_record"
		},
		"arguments": callArgs
	};
};

/*
	Public: Generates an ExpressionStatement AST node, containing an input
	expression.

	node	-	The expression's AST node as represented by Esprima.

	Returns an object representing a replacement node.

	Examples

		expressionStatement(astNode);

*/

expressionStatement = module.exports.expressionStatement =
	function expressionStatement(node) {
	return {
		"type": "ExpressionStatement",
		"expression": node
	};
};

/*
	Public: Given a string representation of JavaScript sourcecode and a map
	containing metainformation about the instrument probes themselves, this
	function prepends a string/source representation of the instrument probes,
	as well as the sourcecode of the function that performs the instrumentation
	itself.

	code			-	The source to which the instrument map should be
						appended
	sourceMap		-	A map of information about each instrument probe and
						containing the sourcecode of the file.

	Returns the instrumented JavaScript sourcecode to be executed or written
	to disk.

	Examples

		prependInstrumentorMap(code, sourceMap);

*/
prependInstrumentorMap = module.exports.prependInstrumentorMap =
	function prependInstrumentorMap(code, sourceMap) {

	var filetag = sourceMap.filetag,
		map = JSON.stringify(sourceMap);

	return [

		// Map initialisation
		"if (typeof __instrumentor_map__ === 'undefined') {",
			"__instrumentor_map__ = {};",
		"}",

		// Map for key
		"if (typeof __instrumentor_map__." + filetag + " === 'undefined') {",
			"__instrumentor_map__." + filetag + " = " + map + ";",
		"}",

		// Instrumentor
		require("./instrumentor-record").toString(),

		// Include the code
		code

	].join("\n");
};

/*
	Public: Given a string, this function will generate a string md5 digest
	which can be safely used barely in JS literal context.

	filename		-	The filename to digest

	Returns the digest string.

	Examples

		fileID("myfile.js");

*/

fileID = module.exports.fileID =
	function fileID(id) {

	return "i" + crypto.createHash("md5").update(id).digest("hex");
};