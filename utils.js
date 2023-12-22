const Crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const data = require("./data/data");
const utils = {
    encryptWithAES: (key, data) => {
        const cipher = Crypto.createCipher('aes-256-cbc', key);
        let crypted = cipher.update(data, 'utf8', 'hex');
        crypted += cipher.final('hex');
        return crypted;
    },
    decryptWithAES: (key, data) => {
        try {
            const decipher = Crypto.createDecipher('aes-256-cbc', key);
            let dec = decipher.update(data, 'hex', 'utf8');
            dec += decipher.final('utf8');
            return dec;
        }
        catch (err) {
            return null;
        }
    },
    convertToArray: (map) => {
        let array = [];
        for (let key in map) {
            array.push(map[key]);
        }
        return array;
    },
    isJSON: (str) => {
        try {
            JSON.parse(str);
        }
        catch (err) {
            return false;
        }
        return true;
    },
    getExtname: (fileName) => {
        return fileName.split('.').pop();
    },
    fileExists: (relativePath) => {
        return fs.existsSync(relativePath);
    },
    removeXSS: (str) => {
        return str.replace(/<(?:.|\n)*?>/gm, 'HTML TAG REMOVED');
    },
    decryptMessages: (messages) => {
        messages.forEach((message) => {
            message.content = utils.decryptWithAES(data.server.encryptionKey, message.content);
        });
        return messages;
    },
    isCommand: (prefix, message) => {
        return message.startsWith(prefix);
    },
    getCommand: (prefix, message) => {
        return message.split(prefix)[1].split(' ')[0];
    },
    checkOpenPorts: (host, portRangeStart, portRangeStop) => {
        return new Promise((resolve, reject) => {
            const net = require('net');
            const openPorts = [];
            const startOfFor = Date.now();
            for (let i = portRangeStart; i <= portRangeStop; i++) {
                const socket = new net.Socket();
                socket.setTimeout(1000);
                socket.on('connect', () => {
                    openPorts.push(i);
                    socket.destroy();
                });
                socket.on('timeout', () => {
                    socket.destroy();
                });
                socket.on('error', () => {
                    socket.destroy();
                });
                socket.connect(i, host);
            }
            const endOfFor = Date.now();
            console.log(`[!] Checking open ports took ${endOfFor - startOfFor}ms (${(endOfFor - startOfFor) / 1000}s)`);
            setTimeout(() => {
                resolve(openPorts);
            }, 1500);
        });
    },
    getRandomInt: (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    getServerPing: (port) => {
        return new Promise((resolve, reject) => {
            const http = require('http');
            const startOfRequest = Date.now();
            http.get(`http://127.0.0.1:/:${port}`, (res) => {
                const endOfRequest = Date.now();
                resolve(endOfRequest - startOfRequest);
            });
        });
    }
};
module.exports = utils;