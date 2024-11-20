const Crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const data = require("./data/data");
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
}).use(require('markdown-it-highlightjs')).use(require('markdown-it-named-code-blocks'), { isEnableInlineCss: true });
const utils = {
    encryptWithAES: (key, text) => {
        if (![16, 24, 32].includes(key.length)) {
            throw new Error(`Invalid key length. Key must be 16, 24, or 32 bytes. Recevied ${key.length} bytes.`);
        }
        const iv = Crypto.randomBytes(16);
        const cipher = Crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    },
    decryptWithAES: (key, text) => {
        if (![16, 24, 32].includes(key.length)) {
            throw new Error(`Invalid key length. Key must be 16, 24, or 32 bytes. Recevied ${key.length} bytes.`);
        }
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = Crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
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
            message.content = md.render(utils.decryptWithAES(data.server.encryptionKey, message.content));
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
            http.get(`http://127.0.0.1:${port}/`, (res) => {
                const endOfRequest = Date.now();
                resolve(endOfRequest - startOfRequest);
            });
        });
    },
    getAiResponse: async (prompt, chat) => {
        const result = await chat.sendMessage(prompt);
        const response = await result.response;
        const text = response.text();
        return text;
    },
    getMarkdown: text => {
        return md.render(text);
    }
};
module.exports = utils;