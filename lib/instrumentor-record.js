/* steamShovel:ignore */

module.exports = function instrumentor_record(id) {
	var depth =
		(new Error()).stack.split("\n")
			.slice(1)
			.length;

	__instrumentor_map__[id].results.push({
		"depth": depth,
		"time": Date.now()
	});
};