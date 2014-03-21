// Export the reporter so that mocha can require it directly by name
module.exports = reporter;

// Return the components
module.exports.instrument	= require("./instrumentor");
module.exports.process		= require("./process");
module.exports.reporter		= require("./reporter");
module.exports.recorder		= require("./instrumentor-record");