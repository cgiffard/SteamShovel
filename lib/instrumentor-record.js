/* steamShovel:ignore */

module.exports = function instrumentor_record(id) {
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
};