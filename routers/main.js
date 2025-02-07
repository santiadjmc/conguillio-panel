const { Router } = require('express');
const data = require('../data/data');
const db = require('../mysql/db');
const utils = require('../utils');
const Log = require('../logs');
const router = Router();

function onlyAuth(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

router.get("/favicon.ico", (req, res) => {
    res.send("../img/avatars/favicon-16x16.png");
});

router.get("/", (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect("/dashboard");
    }
    res.render("index", {
        title: "Bienvenid@",
    });
});

router.get("/logout", onlyAuth, (req, res) => {
    req.logout(() => {
        console.log(`[!] User logged out.`);
    });
    res.redirect("/");
});

router.get("/dashboard", onlyAuth, async (req, res) => {
    const users = await db.query(`SELECT * FROM users`);
    res.render("dashboard", {
        title: "Dashboard",
        users: JSON.parse(JSON.stringify(users)),
    });
});

router.get("/dashboard/profile", onlyAuth, async (req, res) => {
    res.render("profile", {
        title: `${req.user.username}`
    });
});

router.get("/dashboard/users/:id/profile", onlyAuth, async (req, res, next) => {
    const id = req.params.id;
    if (Number(id) === Number(req.user.id)) {
        return res.redirect("/dashboard/profile");
    }
    const user = await db.query(`SELECT * FROM users WHERE id = ?`, [id]);
    if (!user[0]) {
        return next();
    }
    delete user[0].password;
    res.render("userprofile", {
        title: `${user[0].username}`,
        profile: user[0],
    });
});

router.get("/dashboard/users", onlyAuth, async (req, res) => {
    const users = (await db.query(`SELECT * FROM users`)).filter(user => !user.hidden);
    if (req.query.filter) {
        const filteredUsers = users.filter(user => user.username.toLowerCase().includes(req.query.filter.toLowerCase()) || user.name.toLowerCase().includes(req.query.filter.toLowerCase()));
        if (filteredUsers.length < 1) {
            return res.render("no_results", {
                title: "Oops...",
                filter: req.query.filter,
            });
        }
        res.render("users", {
            title: "Usuarios",
            users: JSON.parse(JSON.stringify(filteredUsers)),
            filter: req.query.filter,
        });
        return;
    }
    res.render("users", {
        title: "Users",
        users: JSON.parse(JSON.stringify(users)),
    });
});

router.get("/dashboard/users/add", onlyAuth, async (req, res) => {
    if (!req.user.admin) res.redirect("/dashboard/users");
    res.render("adduser", {
        title: "Add User",
    });
});

router.get("/dashboard/users/:id/edit", onlyAuth, async (req, res, next) => {
    const id = req.params.id;
    if (!req.user.admin) res.redirect(`/dashboard/users/${id}/profile`);
    const user = await db.query(`SELECT * FROM users WHERE id = ?`, [id]);
    if (!user[0]) {
        return next();
    }
    user[0].password = utils.decryptWithAES(data.server.encryptionKey, user[0].password);
    res.render("edituser", {
        title: `${user[0].username}`,
        target: user[0],
    });
});

router.post("/dashboard/users/:id/edit", onlyAuth, async (req, res, next) => {
    const id = req.params.id;
    if (!req.user.admin) res.redirect(`/dashboard/users/${id}/profile`);
    const user = await db.query(`SELECT * FROM users WHERE id = ?`, [id]);
    if (!user[0]) {
        return next();
    }
    const { username, password, email, name } = req.body;
    let encryptedPass = utils.encryptWithAES(data.server.encryptionKey, password);
    let admin = req.body.admin === "on";
    await db.query(`UPDATE users SET ? WHERE id = ?`, [{ username, email, password: encryptedPass, admin, name }, id]);
    req.flash("success", "Usuario editado correctamente.");
    res.redirect(`/dashboard/users/`);
});

router.get("/dashboard/users/:id/messages", onlyAuth, async (req, res, next) => {
    const id = Number(req.params.id);
    const user = await db.query(`SELECT * FROM users WHERE id = ?`, [id]);
    if (!user[0]) {
        return next();
    }
    
    // Updated query to properly fetch messages for both participants
    let messages = await db.query(`
        SELECT m.*, 
               u.username as sender_username, 
               u.avatar as sender_avatar, 
               u.name as sender_name
        FROM messages m
        LEFT JOIN users u ON m.user_id = u.id
        WHERE (
            (m.target_id = ? AND m.user_id = ?) OR 
            (m.target_id = ? AND m.user_id = ?) OR
            (m.user_id = 0 AND (m.target_id = ? OR m.target_id = ?))
        )
        ORDER BY m.created_at DESC
        LIMIT 100
    `, [id, req.user.id, req.user.id, id, id, req.user.id]);

    // Process messages
    messages = messages.map(msg => ({
        ...msg,
        content: utils.decryptWithAES(data.server.encryptionKey, msg.content),
        isOwn: msg.user_id === req.user.id,
        username: msg.user_id === 0 ? "BarnieBot" : (msg.user_id === req.user.id ? req.user.username : msg.sender_username),
        avatar: msg.user_id === 0 ? "/img/barnie_avatar.png" : (msg.user_id === req.user.id ? req.user.avatar : msg.sender_avatar),
        name: msg.user_id === 0 ? "BarnieBot" : (msg.user_id === req.user.id ? req.user.name : msg.sender_name)
    }));

    // Reverse messages to show oldest first
    messages = messages.reverse();

    res.render("messages", {
        title: `${user[0].username}`,
        target: user[0],
        messages: messages
    });
});

router.get("/dashboard/trash/add", onlyAuth, (req, res) => {
    res.render("trash_register", {
        title: "Registra basura"
    });
});

module.exports = router;