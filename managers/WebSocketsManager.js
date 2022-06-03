const { EventEmitter } = require('events');
const { WebSocketServer } = require('ws');
const utils = require('../utils');
class WebSocketsManager extends EventEmitter {
    constructor(sv) {
        super();
        /**
         * @type {WebSocketServer}
         */
        this.server = new WebSocketServer({ server: sv });
        this.server.on('connection', (ws) => {
            ws.onmessage = message => {
                if (!utils.isJSON(message.data)) return;
                const data = JSON.parse(message.data);
                if (!data.event) return ws.send(JSON.stringify({ event: "error", args: ["No event"] }));
                if (data.args && !Array.isArray(data.args)) return ws.send(JSON.stringify({ event: "error", args: ["Invalid args"] }));
                if (!data.args) data.args = [];
                this.emit(data.event, data.args, ws);
            }
        });
    }
    /**
     * @param {string} event
     * @param {Array} args
     */
    async sendToAll(event, args) {
        args = Array.isArray(args) ? args : [args];
        this.server.clients.forEach((client) => {
            client.send(JSON.stringify({ event, args }));
        });
    }
    /**
     * @returns {WebSocket[]}
     */
    get clients() {
        return utils.convertToArray(this.server.clients);
    }
    /**
     * 
     * @param {string} event 
     * @param {Array} args 
     * @param {WebSocket} ws 
     */
    async sendToAllExcept(event, args, ws) {
        args = Array.isArray(args) ? args : [args];
        this.server.clients.forEach((client) => {
            if (client !== ws) {
                client.send(JSON.stringify({ event, args }));
            }
        });
    }
    /**
     * @param {string} event
     * @param {Array} args
     * @param {WebSocket} ws
     */
    send(event, args, ws) {
        args = Array.isArray(args) ? args : [args];
        ws.send(JSON.stringify({ event, args }));
    }
    /**
     * 
     * @param {string} property 
     * @param {any} value 
     * @returns 
     */
    findByProperty(property, value) {
        return this.clients.find(client => client[property] === value);
    }
    /**
     * 
     * @param {WebSocket} ws 
     * @returns 
     */
    async pingSocket(ws) {
        const start = Date.now();
        const lastMessageFunction = ws.onmessage;
        return new Promise((resolve, reject) => {
            ws.send(JSON.stringify({ event: "ping", args: [] }));
            ws.onmessage = message => {
                const data = JSON.parse(message.data);
                if (data.event === "pong") {
                    resolve(Date.now() - start);
                    ws.onmessage = lastMessageFunction;
                }
            }
        });
    }
}
module.exports = WebSocketsManager;