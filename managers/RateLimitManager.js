const { EventEmitter } = require("events");
const RateLimitIP = require("../classes/RateLimitIP");
const logs = require("../logs");
class RateLimitManager extends EventEmitter {
    constructor(max = 100, milliseconds = 1000, time = 1000 * 60) {
        super();
        if (!logs.sources.includes("ratelimit")) logs.sources.push("ratelimit");
        this.max = max;
        this.milliseconds = milliseconds;
        this.time = time;
        /**
         * @type {Map<string, RateLimitIP>}
         */
        this.ips = new Map();
        /**
         * @type {Map<string, RateLimitIP>}
         */
        this.ratelimited = new Map();
        this.clearInterval = null;
        this.clearFunction = () => {
            for (const i of this.ratelimited.keys()) {
                /**
                 * @type {RateLimitIP}
                 */
                const ip = this.ratelimited.get(i);
                if (ip.remaining === 0) {
                    this.ratelimited.delete(i);
                    this.ips.get(i).remaining = 60;
                    this.ips.get(i).current = 0;
                    this.emit("removed-ratelimit", i);
                }
                else {
                    ip.remaining = ip.remaining - 1;
                }
            };
            for (const i of this.ips.keys()) {
                if (this.ratelimited.has(i)) continue;
                else {
                    const ip = this.ips.get(i);
                    if (ip.remaining === 0) {
                        ip.current = 0;
                        ip.remaining = this.time;
                    }
                    else {
                        ip.remaining = ip.remaining - 1;
                    }
                }
            };
        }
    }
    get ratelimit() {
        const manager = this;
        /**
         * @param {import("express").Request} req
         * @param {import("express").Response} res
         * @param {import("express").NextFunction} next
         */
        const r = async function (req, res, next) {
            if (!req.ip) return next();
            const ip = req.ip.replace("::ffff:", "");
            if (["::1", "127.0.0.1"].some(i => i === ip)) return next();
            if (manager.ips.has(ip)) {
                /**
                 * @type {RateLimitIP}
                 */
                const localIp = manager.ips.get(ip);
                if (manager.ratelimited.has(ip)) {
                    res.destroy();
                    return;
                }
                if (localIp.current === localIp.max) {
                    res.destroy();
                    if (!manager.ratelimited.has(ip)) {
                        localIp.remaining = manager.time;
                        manager.ratelimited.set(ip, new RateLimitIP(localIp.current, manager.max, 60));
                        manager.emit("ratelimit", ip);
                    }
                    return;
                }
                else {
                    localIp.current += 1;
                    return next();
                }
            }
            else {
                manager.ips.set(ip, new RateLimitIP(1, manager.max));
                return next();
            }
        }
        return r;
    }
    startInterval() {
        if (this.clearInterval !== null) return logs.warn("ratelimit", `The clear interval is already started, use RateLimitManager.restartInterval() instead`);
        this.clearInterval = setInterval(this.clearFunction, this.milliseconds);
        logs.info("ratelimit", "Started ratelimits clear interval");
    }
    stopInterval() {
        if (!this.clearInterval) return logs.warn("ratelimit", "The clear interval is not started, use RateLimitManager.startInterval() instead");
        clearInterval(this.clearInterval);
        this.clearInterval = null;
        logs.info("ratelimit", "Stopped ratelimits clear interval");
    }
    restartInterval() {
        if (!this.clearInterval) return logs.warn("ratelimit", "The clear interval is not started, use RateLimitManager.startInterval() instead");
        clearInterval(this.clearInterval);
        this.clearInterval = setInterval(this.clearFunction, this.milliseconds);
        logs.info("ratelimit", "Restarted ratelimits clear interval");
    }
}
module.exports = RateLimitManager;