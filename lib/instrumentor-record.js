/* steamShovel:ignore */
/*global __instrumentor_map__:true, window:true, global:true */

module.exports = function instrumentor_record(filetag, id, expression) {
	var scope = global || window;
	scope.st_timeCommenced = scope.st_timeCommenced || Date.now();
	scope.st_iterator = (scope.st_iterator || 0);

	var depth =
		(new Error()).stack.split("\n")
			.slice(1)
			.length;

	if (!scope.mem)
		scope.mem = (
			typeof process !== "undefined" ? process.memoryUsage : function(){}
		);

	if (scope.__steamshovel_test_depth) {
		depth -= scope.__steamshovel_test_depth;
	}

	__instrumentor_map__[filetag].instruments[id].results.push({
		"depth": depth,
		"time": Date.now(),
		"timeOffset": Date.now() - scope.st_timeCommenced,
		"memoryUsage": scope.mem(),
		"invocation": scope.st_iterator,
		"milestone": scope.__steamshovel_milestone,
		"value": scope.__steamshovel_record_expression ? expression : null
	});

	scope.st_iterator ++;

	// Make sure we return the original expresison result
	return expression;
};