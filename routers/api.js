/**
 * API Router
 */
const RateLimitManager = require("../managers/RateLimitManager");
const RateLimit = new RateLimitManager(200)
const { Router } = require('express');
const router = Router();
const passport = require('passport');
const db = require('../mysql/db');
const fs = require('fs');
const utils = require("../utils");
const data = require('../data/data');
function genRandomString(length) {
    return Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1); s
}
router.use(RateLimit.ratelimit);
/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
async function restricted(req, res, next) {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({
            message: 'Unauthorized',
            status: 401
        });
    }
    const id = authorization.split(' ')[1];
    const authType = authorization.split(' ')[0];
    const allowedTypes = ["User"];
    if (!allowedTypes.includes(authType)) {
        return res.status(401).send({
            message: 'Unauthorized',
            status: 401
        });
    }
    const user = await db.query(`SELECT * FROM users WHERE id = ?`, [id]);
    if (!user[0]) {
        return res.status(401).send({
            message: 'Unauthorized',
            status: 401
        });
    }
    return next();
}

router.post("/auth", passport.authenticate('login', {
    successRedirect: '/dashboard',
    failureRedirect: '/?error=true',
}));

router.delete("/users/:id", restricted, async (req, res) => {
    const id = req.params.id;
    const userRequesting = await db.query(`SELECT * FROM users WHERE id = ?`, [req.user.id ?? req.headers.authorization.split(' ')[1]]);
    if (!userRequesting[0].admin) {
        return res.status(401).send({
            message: 'Unauthorized',
            status: 401
        });
    }
    await db.query(`DELETE FROM users WHERE id = ?`, [id]);
    res.status(200).json({
        status: 200,
        message: 'User deleted'
    });
});

router.post("/users/new", restricted, async (req, res) => {
    const { username, password, email, admin, name } = req.body;
    const user = await db.query(`SELECT * FROM users WHERE username = ? OR email = ?`, [username, email]);
    if (user[0]) {
        return res.status(409).send({
            message: 'Username or email already taken',
            status: 409
        });
    }
    const encryptedPassword = utils.encryptWithAES(data.server.encryptionKey, password);
    await db.query(`INSERT INTO users (username, password, email, admin, name) VALUES (?, ?, ?, ?, ?)`, [username, encryptedPassword, email, admin, name]);
    res.json({
        status: 200,
        message: 'User created'
    });
});

router.post("/users/:id/messages", restricted, async (req, res, next) => {
    const id = req.params.id;
    const userRequesting = await db.query(`SELECT * FROM users WHERE id = ?`, [req.user.id ?? req.headers.authorization.split(' ')[1]]);
    const user = await db.query(`SELECT * FROM users WHERE id = ?`, [id]);
    if (!user[0]) {
        return next();
    }
    const messageData = {
        target_id: user[0].id,
        user_id: userRequesting[0].id,
        content: utils.encryptWithAES(data.server.encryptionKey, utils.removeXSS(req.body.content))
    }
    await db.query("INSERT INTO messages SET ?", messageData);
    res.json({
        status: 200,
        message: "Message stored"
    });
});

module.exports = router;