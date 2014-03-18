var crypto		= require("crypto"),
	esprima		= require("esprima"),
	escodegen	= require("escodegen"),
	estraverse	= require("estraverse"),
	fs			= require("fs");

var allowedReplacements = [
	"AssignmentExpression",
	"ArrayExpression",
	"ArrayPattern",
	"ArrowFunctionExpression",
	"BinaryExpression",
	"CallExpression",
	"ConditionalExpression",
	"FunctionExpression",
	"LogicalExpression",
	"MemberExpression",
	"ObjectExpression",
	"ObjectPattern",
	"UnaryExpression",
	"UpdateExpression"
];

function instrumentor_record(id) {
	var depth =
		(new Error()).stack.split("\n")
			.filter(function(line) {
				return (
					!~line.indexOf("instrumentor_record") &&
					!~line.indexOf("at node.js") &&
					!~line.indexOf("(node.js") &&
					!~line.indexOf("(module.js")
				);
			})
			.slice(1)
			.length;

	__instrumentor_map__[id].results.push({
		"depth": depth,
		"time": Date.now()
	})
}

var filename = __dirname + "/example.js";

fs.readFile(filename, function(err, data) {
	if (err) throw err;

	var ast = esprima.parse(data, {loc: true, range: true, raw: true}),
		id = 0,
		filetag = crypto.createHash("md5").update(filename).digest("hex"),
		code = null,
		map = [],
		sourceMap = {};

	estraverse.replace(ast, {

		// Enter is where we mark nodes as noReplace
		// which prevents bugs around weird edge cases, which I'll probably
		// discover as time goes on.

		enter: function(node) {

			// If we don't do this, our instrument code removes the context
			// from member expression function calls and returns the value
			// without the context required by some 'methods'.
			//
			// Without this, calls like array.indexOf() would break.

			if (node.type === "CallExpression" &&
				node.callee.type === "MemberExpression")
				node.callee.noReplace = true;

			if (node.type === "AssignmentExpression")
				node.left.noReplace = true;

		},

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
						"results": []
					},
					sequenceExpression(
						"id_" + filetag + "_" + id,
						node
					));
		}
	});

	code = escodegen.generate(ast);
	code = prependInstrumentorMap(data, filename, code, sourceMap);

	console.log(code);
});

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
	var originalSource = JSON.stringify(String(source)),
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

	initialiser += "\n" + instrumentor_record.toString() + "\n";

	return initialiser + code;
}