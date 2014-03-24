/* steamShovel:ignore */

module.exports = function instrumentor_record(id) {
	this.timeCommenced = this.timeCommenced || Date.now();
	this.iterator = (this.iterator || 0);
	var depth =
		(new Error()).stack.split("\n")
			.slice(1)
			.length;

	__instrumentor_map__[id].results.push({
		"depth": depth,
		"time": Date.now(),
		"timeOffset": Date.now() - this.timeCommenced,
		"memoryUsage": process.memoryUsage(),
		"invocation": this.iterator
	});

	this.iterator ++;
};