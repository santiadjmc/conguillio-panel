require("dotenv").config();
require("./mysql/mainQuerys");
require("./auth/passport");
const express = require('express');
const app = express();
const morgan = require('morgan');
const path = require('path');
const data = require('./data/data');
const hbs = require('express-handlebars');
const Log = require('./logs');
const utils = require('./utils');
const db = require("./mysql/db");
const session = require('express-session');
const MysqlSessionStore = require('express-mysql-session');
const passport = require('passport');
const flash = require('connect-flash');
const fs = require("fs");
const SocketIO = require("socket.io");
const WebSocketsManager = require("./managers/WebSocketsManager");
const RateLimitManager = require("./managers/RateLimitManager");
const { default: fetch } = require("node-fetch");
const RateLimit = new RateLimitManager(100);
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY);
function genRandomString(length) {
    const chars = "aAbBcCdDeEfFgGhHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZ";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Middlewares
app.use(session({
    secret: data.server.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: new MysqlSessionStore(data.database)
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('common', {
    skip: (req, res) => RateLimit.ratelimited.has(req.ip?.replace(/::ffff:/, ''))
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Settings
app.set('port', data.server.port);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', '.hbs');

// Global variables
app.use(async (req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});

// Engine
app.engine('.hbs', hbs.engine({
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    defaultLayout: "main",
    extname: '.hbs',
}));

// Routes
app.use("/js", express.static(path.join(__dirname, 'js')));
app.use("/css", express.static(path.join(__dirname, 'css')));
app.use("/img", express.static(path.join(__dirname, 'img')));
app.use("/audio", express.static(path.join(__dirname, 'audio')));
app.use("/", RateLimit.ratelimit, require('./routers/main'));
app.use("/api", require('./routers/api'));
app.use("/api", async (req, res, next) => {
    res.status(404).json({
        status: 404,
        message: "Not found"
    });
});
app.use("*", (req, res, next) => {
    res.status(404).render("404", {
        title: "404 - Not found"
    })
});
// Server
const server = app.listen(app.get('port'), async () => {
    Log.success(`server`, `Server started on port ${app.get('port')}`);
    await db.query("UPDATE users SET status = 'offline' WHERE id != 0");
    const filterAiHistory = (await db.query("SELECT * FROM ai_history")).filter(h => h.content.length >= 60000);
    if (filterAiHistory.length > 0) {
        let deletedHistory = 0;
        filterAiHistory.forEach(async h => {
            await db.query("DELETE FROM ai_history WHERE id = ?", [h.id]);
            deletedHistory++;
        });
        Log.warn("server", `[!] Deleted ${deletedHistory} AI history entries due to a length of over 60,000 characters`);
    }
    setInterval(async () => {
        const svPing = await utils.getServerPing(data.server.port);
        if (svPing > 199) {
            Log.warn('server', `The server ping is over 199 [${svPing} ms]`);
        }
        else {
            Log.info("server", `The server ping is ${svPing} ms`);
        }
    }, 60000);
});
const wss = new WebSocketsManager(8081);

// WebSockets
wss.on("change-avatar", async (args, ws) => {
    const [userid, base64, name] = args;
    if (!userid) {
        wss.send("error", ["No userid provided"], ws);
        return;
    }
    if (!base64) {
        wss.send("error", ["No base64 provided"], ws);
        return;
    }
    const gentString = genRandomString(15);
    fs.writeFileSync(`./img/avatars/${gentString}.${utils.getExtname(name ?? "file.webp")}`, base64, "base64");
    await db.query(`UPDATE users SET avatar = ? WHERE id = ?`, [`/img/avatars/${gentString}.${utils.getExtname(name)}`, userid]);
    wss.send("change-avatar-response", ["SUCCESS", `/img/avatars/${gentString}.${utils.getExtname(name)}`], ws);
});
wss.on("set-user-id", async (args, ws) => {
    const [userid] = args;
    if (!userid) {
        wss.send("error", ["No userid provided"], ws);
        return;
    }
    if (ws.userid) {
        wss.send("error", ["User ID already set"], ws);
        return;
    }
    ws.userid = userid;
    wss.send("set-user-id-response", ["SUCCESS", userid], ws);
});

// Socket.io

const io = SocketIO(server);
const chats = new Map();

io.on("connection", async socket => {
    socket.on("message", async data => {
        let targetSocket = null;
        io.sockets.sockets.forEach(s => {
            if (s.userid === data.target) {
                targetSocket = s;
            }
        });
        if (!targetSocket && data.target !== "0") return;
        if (data.target === "0") {
            if (!socket.userid) return socket.emit("reload");
            socket.emit("typing", {
                isTyping: true,
                user: {
                    username: "BarnieBot",
                    avatar: "/img/barnie_avatar.png"
                }
            });
            const history = await db.query("SELECT * FROM ai_history WHERE uid = ?", [socket.userid]);
            let hdata = history[0] ? JSON.parse(history[0].content).data : null;
            if (!hdata) {
                db.query("INSERT INTO ai_history SET ? ", [{
                    content: JSON.stringify({ data: [{ parts: [{ text: data.content }], role: "user" }] }),
                    uid: socket.userid
                }]);
            };
            let chat = chats.get(socket.userid);
            if (!chat) {
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                chat = model.startChat({
                    history: hdata,
                    generationConfig: {
                        maxOutputTokens: 2048
                    }
                });
                chats.set(socket.userid, chat);
            }
            let response = await utils.getAiResponse(data.content, chat) || "Oops... No tengo una respuesta ahora.";
            if (!hdata) hdata = [];
            hdata.push({ parts: [{ text: data.content }], role: "user" }, { parts: [{ text: response }], role: "model" });
            await db.query("UPDATE ai_history SET ? WHERE uid = ?", [{ content: JSON.stringify({ data: hdata }) }, socket.userid]);
            await fetch(`http://localhost:${app.get('port')}/api/users/${socket.chat}/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "User " + socket.userid
                },
                body: JSON.stringify({ content: response, bot: true, users: [socket.userid, socket.chat, 0] })
            });
            socket.emit("message", {
                currentChat: true,
                content: (await utils.getMarkdown(response)),
                user: {
                    username: "BarnieBot",
                    avatar: "/img/barnie_avatar.png",
                    name: "BarnieBot"

                }
            });
            socket.emit("typing", {
                isTyping: false,
                user: {
                    username: "BarnieBot",
                    avatar: "/img/barnie_avatar.png"
                }
            });
            return;
        }
        const user = await db.query(`SELECT * FROM users WHERE id = ?`, [data.user]);
        delete user[0].password;
        if (targetSocket.chat !== data.user) {
            targetSocket.emit("message", {
                currentChat: false,
                content: data.content,
                user: user[0]
            });
        }
        else {
            targetSocket.emit("typing", {
                user: user[0],
                isTyping: false
            });
            targetSocket.emit("message", {
                currentChat: true,
                content: data.content,
                user: user[0]
            });
        }
    });
    socket.on("get-message-content", async id => {
        const msg = await db.query("SELECT * FROM messages WHERE id = ?", [id]);
        if (!msg[0]) return socket.emit("get-message-content-response", "");
        return socket.emit("get-message-content-response", { content: utils.decryptWithAES(data.server.encryptionKey, msg[0].content), id });
    });
    socket.on("markdown-render", text => {
        socket.emit("markdown-render-response", utils.getMarkdown(text));
    });
    socket.on("disconnect", async () => {
        setTimeout(async () => {
            if (socket.userid) {
                let targetSocket = null;
                io.sockets.sockets.forEach(s => {
                    if (s.userid === socket.userid) {
                        targetSocket = s;
                    }
                });
                if (targetSocket) return;
                await db.query(`UPDATE users SET status = 'offline' WHERE id = ?`, [socket.userid]);
                let user = await db.query(`SELECT * FROM users WHERE id = ?`, [socket.userid]);
                user = user[0];
                delete user.password;
                io.sockets.emit("typing", {
                    isTyping: false,
                    user
                });
                io.sockets.emit("status", {
                    status: "offline",
                    user
                });
            }
        }, 3000);
    });
    socket.on("set-id", async id => {
        socket.userid = id;
        await db.query(`UPDATE users SET status = 'online' WHERE id = ?`, [id]);
        let user = await db.query(`SELECT * FROM users WHERE id = ?`, [id]);
        user = user[0];
        delete user.password;
        io.sockets.emit("status", {
            status: "online",
            user
        });
    });
    socket.on("set-chat", chat => {
        socket.chat = chat;
    });
    socket.on("check-input-response", async data => {
        let { user, target, content } = data;
        let targetSocket = null;
        io.sockets.sockets.forEach(s => {
            if (s.userid === target) {
                targetSocket = s;
            }
        });
        if (!targetSocket) return;
        if (targetSocket.chat !== user) return;
        user = await db.query(`SELECT * FROM users WHERE id = ?`, [user]);
        delete user[0].password;
        targetSocket.emit("typing", {
            isTyping: !(content.trim().split("").every(c => c === "")),
            user: user[0],
        });
    });
    socket.on("get-message-content", async id => {
        const msg = await db.query("SELECT * FROM messages WHERE id = ?", [!isNaN(Number(id)) ? Number(id) : 1]);
        if (isNaN(Number(id))) return socket.emit("get-message-content-response", { id, content: "" });
        else socket.emit("get-message-content-response", { id, content: utils.decryptWithAES(data.server.encryptionKey, msg[0].content) });
    });
    socket.on("ai", async data => {
        let targetSocket = null;
        io.sockets.sockets.forEach(s => {
            if (s.userid === socket.chat) {
                targetSocket = s;
            }
        });
        socket.emit("typing", {
            isTyping: true,
            user: {
                username: "BarnieBot",
                avatar: "/img/barnie_avatar.png",
                id: 0
            }
        });
        targetSocket?.emit("typing", {
            isTyping: true,
            user: {
                username: "BarnieBot",
                avatar: "/img/barnie_avatar.png",
                id: 0
            }
        });
        if (!socket.userid) return socket.emit("reload");
        const history = await db.query("SELECT * FROM ai_history WHERE uid = ?", [socket.userid]);
        let hdata = history[0] ? JSON.parse(history[0].content).data : null;
        if (!hdata) {
            db.query("INSERT INTO ai_history SET ? ", [{
                content: JSON.stringify({ data: [{ parts: [{ text: data.content }], role: "user" }] }),
                uid: socket.userid
            }]);
        };
        let chat = chats.get(socket.userid);
        if (!chat) {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            chat = model.startChat({
                history: hdata,
                generationConfig: {
                    maxOutputTokens: 2048
                }
            });
            chats.set(socket.userid, chat);
        }
        let response = await utils.getAiResponse(data.content, chat) || "Oops... No tengo una respuesta ahora.";
        if (!hdata) hdata = [];
        hdata.push({ parts: [{ text: data.content }], role: "user" }, { parts: [{ text: response }], role: "model" });
        await db.query("UPDATE ai_history SET ? WHERE uid = ?", [{ content: JSON.stringify({ data: hdata }) }, socket.userid]);
        await fetch(`http://localhost:${app.get('port')}/api/users/${socket.chat}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "User " + socket.userid
            },
            body: JSON.stringify({ content: response, bot: true, users: [socket.userid, socket.chat] })
        });
        socket.emit("message", {
            currentChat: true,
            content: (await utils.getMarkdown(response)),
            user: {
                username: "BarnieBot",
                avatar: "/img/barnie_avatar.png",
                name: "BarnieBot"

            }
        });
        if (targetSocket && targetSocket?.chat === socket.userid) {
            targetSocket?.emit("message", {
                currentChat: true,
                content: response,
                user: {
                    username: "BarnieBot",
                    avatar: "/img/barnie_avatar.png",
                    name: "BarnieBot"

                }
            });
        }
        socket.emit("typing", {
            isTyping: false,
            user: {
                username: "BarnieBot",
                avatar: "/img/barnie_avatar.png"
            }
        });
        targetSocket?.emit("typing", {
            isTyping: false,
            user: {
                username: "BarnieBot",
                avatar: "/img/barnie_avatar.png",
                id: 0
            }
        });
    });
});

// RateLimit Events
RateLimit.on("ratelimit", (ip) => {
    Log.info(`server`, `IP ${ip} has been ratelimited`);
});
RateLimit.on("removed-ratelimit", (ip) => {
    Log.info(`server`, `IP ${ip} has been removed from ratelimit`);
});

// Checks
setInterval(() => {
    io.sockets.emit("check-input");
}, 1000);