
module.exports.sloc = function(sourceInput) {
	sourceInput = String(sourceInput || "");

	return (
		sourceInput.split(/\r?\n/ig)
			.filter(module.exports.lineIsWhitespace)
			.reduce(function(acc, cur) {

				cur =
					cur	.split(/\/\//)
						.shift()
						.replace(/\/\*.*?\*\//g, "")
						.trim();

				if (~cur.indexOf("/*"))
					acc.inComment = true,
					cur = cur.split(/\/\*/).shift().trim();

				if (~cur.indexOf("*/"))
					acc.inComment = false,
					cur = cur.split("*/").slice(1).join("*/").trim();

				if (!cur.length)
					return acc;

				if (!acc.inComment)
					acc.count ++;

				return acc;

			}, { count: 0, inComment: false})
			.count
	);
}

module.exports.lineIsWhitespace = function(line) {
	line = String(line || "");

	return !line.match(/^\s*$/);
}