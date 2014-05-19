"use strict";

// These are expression-context items which can be completely wrapped.
var allowedReplacements = [
	"AssignmentExpression",
	"ArrayExpression",
	"ArrayPattern",
	"ArrowFunctionExpression",
	"BinaryExpression",
	"CallExpression",
	"ConditionalExpression",
	"FunctionExpression",
	"Identifier",
	"Literal",
	"LogicalExpression",
	"MemberExpression",
	"NewExpression",
	"ObjectExpression",
	"ObjectPattern",
	"UnaryExpression",
	"UpdateExpression"
];

// These are block/statement level constructs which cannot be wrapped and must
// be prepended.
var allowedPrepend = [
	"BlockStatement",
	"BreakStatement",
	"CatchClause",
	"ContinueStatement",
	"DirectiveStatement",
	"DoWhileStatement",
	"DebuggerStatement",
	"EmptyStatement",
	"ExportDeclaration",
	"ExpressionStatement",
	"ForStatement",
	"ForInStatement",
	"ForOfStatement",
	"FunctionDeclaration",
	"IfStatement",
	"LabeledStatement",
	"ReturnStatement",
	"SwitchStatement",
	"SwitchCase",
	"ThisExpression",
	"ThrowStatement",
	"TryStatement",
	"VariableDeclaration",
	"VariableDeclarator",
	"WhileStatement",
	"WithStatement",
	"YieldExpression"
];

var noReplaceMap = {

	// If we don't do this, our instrument code removes the context
	// from member expression function calls and returns the value
	// without the context required by some 'methods'.
	//
	// Without this, calls like array.indexOf() would break.
	"CallExpression": {
		"callee": {
			"type": "MemberExpression"
		}
	},

	// We can't put SequenceExpressions on the left side of
	// AssignmentExpressions.
	//
	// (e.g. (abc, def) = value;)

	"AssignmentExpression": ["left"],

	// Nor can we replace the id component of VariableDeclarators.
	// (e.g. var [id] = value)

	"VariableDeclarator": ["id"],

	// The components of MemberExpressions should not be touched.
	// (e.g. (instrument, abc).(instrument, def) from `abc.def`.)

	"MemberExpression": ["object", "property"],

	// The id component of Functions should not be touched.
	// (e.g. function (instrument, abc)() {} from `function abc() {}`.)

	// The parameters of FunctionExpressions should not be touched.
	// (e.g. function abc((instrument,a)) {} from `function abc(a) {}`.)

	"FunctionExpression": ["id", "params"],
	"FunctionDeclaration": ["id", "params"],

	// The properties of Objects should not be touched.
	// (e.g. {(instrument,a)): b} from `{a:b}`.)

	"Property": ["key"],

	// The parameter of a catch clause should not be touched.
	// (e.g. catch (instrument,a) { ... } from `catch (a) { ... }`.)

	"CatchClause": ["param"],

	// The argument of UpdateExpressions should not be touched.
	// (e.g. (instrument,a)++ from `a++`.)

	"UpdateExpression": ["argument"],

	// The argument of the UnaryExpression `typeof` should not be touched.
	// (e.g. typeof (instrument,a) from `typeof a`.)

	"UnaryExpression": ["argument"],

	// The left side of a ForInStatement should not be touched.
	// (e.g. for ((instrument,a) in (instrument,b)) from `for (a in b)`.)

	"ForInStatement": ["left"]
};

var noPrependMap = {

};

module.exports = {
	noReplaceMap: noReplaceMap,
	allowedReplacements: allowedReplacements,
	allowedPrepend: allowedPrepend,
	noPrependMap: noPrependMap
};