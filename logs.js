const LogManager = require("./managers/LogManager");
const Log = new LogManager(["server", "ratelimit-manager", "websockets", "database", "auth", "api"]);
module.exports = Log;