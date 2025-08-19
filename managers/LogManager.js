require("colors");

class LogManager {
    /**
     * @param {string[]} sources
     */
    constructor(sources = []) {
        /**
         * @type {string[]}
         */
        this.sources = sources;
        if (!sources.includes("log-manager")) this.sources.push("log-manager");
        if (!sources.includes("unknown")) this.sources.push("unknown");
        if (!sources.includes("system")) this.sources.push("system");
        if (sources.length < 1) this.warn("log-manager", "There are no sources passed to the constructor, only the following sources will be accepted: log-manager, unknown");
    }

    /**
     * Get formatted timestamp
     * @returns {string}
     */
    getTimestamp() {
        const now = new Date();
        return now.toISOString().replace('T', ' ').substring(0, 19);
    }

    /**
     * Format log message with timestamp and emoji
     * @param {string} level 
     * @param {string} source 
     * @param {string} message 
     * @param {string} color 
     * @param {string} emoji 
     * @returns {string}
     */
    formatMessage(level, source, message, color, emoji) {
        const timestamp = this.getTimestamp().grey;
        const levelFormatted = `[${level}]`[color];
        const sourceFormatted = `[${source.toUpperCase()}]`.cyan;
        return `${timestamp} ${emoji} ${sourceFormatted}${levelFormatted}: ${message}`;
    }
    /**
     * @param {string} source
     * @param {string} message
     */
    error(source, message) {
        if (typeof source !== "string") throw new TypeError(`Source parameter must be of type string, received ${typeof source}`);
        if (typeof message !== "string") throw new TypeError(`Source parameter must be of type string, received ${typeof message}`);
        if (!this.sources.some(s => s.toLowerCase() === source.toLowerCase())) throw new RangeError("Unknown source");
        return console.log(this.formatMessage("ERROR", source, message, "brightRed", "❌"));
    }

    /**
     * @param {string} source
     * @param {string} message
     */
    info(source, message) {
        if (typeof source !== "string") throw new TypeError(`Source parameter must be of type string, received ${typeof source}`);
        if (typeof message !== "string") throw new TypeError(`Source parameter must be of type string, received ${typeof message}`);
        if (!this.sources.some(s => s.toLowerCase() === source.toLowerCase())) throw new RangeError("Unknown source");
        return console.log(this.formatMessage("INFO", source, message, "blue", "ℹ️"));
    }

    /**
     * @param {string} source
     * @param {string} message
     */
    success(source, message) {
        if (typeof source !== "string") throw new TypeError(`Source parameter must be of type string, received ${typeof source}`);
        if (typeof message !== "string") throw new TypeError(`Source parameter must be of type string, received ${typeof message}`);
        if (!this.sources.some(s => s.toLowerCase() === source.toLowerCase())) throw new RangeError("Unknown source");
        return console.log(this.formatMessage("SUCCESS", source, message, "brightGreen", "✅"));
    }

    /**
     * @param {string} source
     * @param {string} message
     */
    warn(source, message) {
        if (typeof source !== "string") throw new TypeError(`Source parameter must be of type string, received ${typeof source}`);
        if (typeof message !== "string") throw new TypeError(`Source parameter must be of type string, received ${typeof message}`);
        if (!this.sources.some(s => s.toLowerCase() === source.toLowerCase())) throw new RangeError("Unknown source");
        return console.log(this.formatMessage("WARNING", source, message, "brightYellow", "⚠️"));
    }

    /**
     * @param {string} source
     * @param {string} message
     */
    debug(source, message) {
        if (typeof source !== "string") throw new TypeError(`Source parameter must be of type string, received ${typeof source}`);
        if (typeof message !== "string") throw new TypeError(`Source parameter must be of type string, received ${typeof message}`);
        if (!this.sources.some(s => s.toLowerCase() === source.toLowerCase())) throw new RangeError("Unknown source");
        return console.log(this.formatMessage("DEBUG", source, message, "magenta", "🔍"));
    }
}
module.exports = LogManager;