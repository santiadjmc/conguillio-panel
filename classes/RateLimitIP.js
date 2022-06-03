class RateLimitIP {
    constructor(current = 0, max = 100, remaining = 60) {
        this.current = current;
        this.max = max;
        this.remaining = remaining;
    }
}
module.exports = RateLimitIP;