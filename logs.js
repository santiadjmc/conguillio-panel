const LogManager = require("./managers/LogManager");
const Log = new LogManager(["server", "ratelimit-manager", "websockets"]);
module.exports = Log;