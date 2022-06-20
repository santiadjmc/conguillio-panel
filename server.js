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
const RateLimit = new RateLimitManager(100);
function genRandomString(length) {
    return Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1); s
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
})

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
const server = app.listen(app.get('port'), () => {
    Log.success(`server`, `Server started on port ${app.get('port')}`);
});
const wss = new WebSocketsManager(server);

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
    fs.writeFileSync(`./img/avatars/${gentString}.${utils.getExtname(name)}`, base64, "base64");
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

io.on("connection", async socket => {
    socket.on("message", async data => {
        let targetSocket = null;
        io.sockets.sockets.forEach(s => {
            if (s.userid === data.target) {
                targetSocket = s;
            }
        });
        if (!targetSocket) return;
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
            isTyping: content !== "" && content !== " ",
            user: user[0],
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