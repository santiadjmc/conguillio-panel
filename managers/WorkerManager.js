const { Collection } = require("discord.js");
const { EventEmitter } = require("events");
const { Worker } = require("worker_threads");
const Log = require("../Log");

class WorkerManager extends EventEmitter {
    constructor(IDLength = 10, typeLimit = 8) {
        super();
        this.IDLength = IDLength;
        this.typeLimit = typeLimit;
        this.Cache = new Collection();
        this.RunningCache = new Collection();
    }
    getWorker(id) {
        const worker = this.Cache.get(id);
        return worker ? { id, workerData: worker } : null;
    };

    getAvailableWorker(type) {
        return this.Cache.find(w => w.type === type && !this.RunningCache.has(w.id));
    };

    createWorker(path, type, options, data) {
        const id = this.GenerateID(this.IDLength);
        if (this.Cache.filter(w => w.type === type).size >= this.typeLimit && this.typeLimit !== 0) return this.getAvailableWorker(type);
        const worker = new Worker(path, { ...options, workerData: { id, data: data ?? undefined } });
        this.Cache.set(id, { type, worker, id });
        worker.on("online", () => Log.info("workers", `Worker with ID ${id} and type ${type} online and running on ${path}${this.Cache.filter(w => w.type === type).size >= this.typeLimit ? ". This worker has exceeded the workers type limit." : ""}`));
        worker.on("message", message => {
            if (this.RunningCache.has(id)) this.RunningCache.delete(id);
            this.emit("message", { id, message });
        });
        worker.on("exit", c => { Log.info("workers", `Worker with ID ${id} and type ${type} exited with code ${c}`); this.Cache.delete(id); if (this.RunningCache.has(id)) this.RunningCache.delete(id); });
        return { id, worker };
    };

    postMessage(id, message) {
        if (!this.getWorker(id)) throw new Error("Unknown worker");
        const worker = this.getWorker(id);
        const messageId = this.GenerateID(this.IDLength);
        worker?.workerData.worker.postMessage({ id: messageId, data: message });
        this.RunningCache.set(id, { type: worker.workerData.type, id, worker: worker.workerData.worker });
        return messageId;
    }

    awaitResponse(id, message) {
        return new Promise((resolve, reject) => {
            this.on("message", data => {
                if (data.id !== id) return;
                if (data.message.id !== message) return;
                resolve({ id: data.id, message: data.message });
            });
        });
    }

    terminateWorker(id) {
        if (this.getWorker(id)) {
            const workerData = this.getWorker(id)?.workerData;
            this.getWorker(id)?.workerData.worker.terminate();
            this.Cache.delete(id);
            if (this.RunningCache.has(id)) {
                Log.warn("workers", `Worker with ID ${id} and type ${workerData?.type} was running a task when terminated.`);
                this.RunningCache.delete(id);
            }
            else Log.info("workers", `Worker with ID ${id} and type ${workerData?.type} was terminated.`);
        }
    };

    ping(id) {
        const worker = this.getWorker(id);
        const start = Date.now();
        const message = this.postMessage(id, "ping");
        return new Promise((resolve, reject) => {
            const callback = (m) => {
                if (m.id !== message) return;
                resolve(Date.now() - start);
                worker?.workerData.worker.removeListener("message", callback);
            }
            worker?.workerData.worker.on("message", callback);
        });
    }

    GenerateID(length) {
        const characters = "0123456789";
        let result = "";
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    };
    bulkCreateWorkers(path, type, amount, options, data) {
        if (amount > this.typeLimit) amount = this.typeLimit;
        const workers = [];
        for (let i = 0; i < amount; i++) {
            workers.push(this.createWorker(path, type, options, data));
        }
        return workers;
    }
}

module.exports = WorkerManager;