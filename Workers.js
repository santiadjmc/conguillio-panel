const WorkerManager = require("./managers/WorkerManager");

const Workers = new WorkerManager(10, 10);

module.exports = Workers;