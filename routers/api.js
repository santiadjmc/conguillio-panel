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
    return Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);
}

// Public routes (no rate limiting or auth required)
router.get("/status", async (req, res) => {
    try {
        const status = {
            server: "online",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: require('../package.json').version
        };
        
        // Check database connection
        try {
            await db.query("SELECT 1");
            status.database = "connected";
        } catch (error) {
            status.database = "disconnected";
        }
        
        res.json(status);
    } catch (error) {
        res.status(500).json({
            status: 500,
            message: "Error retrieving status",
            error: error.message
        });
    }
});

// Apply rate limiting to remaining routes
router.use(RateLimit.ratelimit);
/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
async function restricted(req, res, next) {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).json({
            message: 'Unauthorized',
            status: 401
        });
    }
    const [authType, id] = authorization.split(' ');
    const allowedTypes = ["User"];
    
    if (!allowedTypes.includes(authType)) {
        return res.status(401).json({
            message: 'Unauthorized',
            status: 401
        });
    }
    
    const user = await db.query(`SELECT * FROM users WHERE id = ?`, [id]);
    if (!user[0]) {
        return res.status(401).json({
            message: 'Unauthorized',
            status: 401
        });
    }
    
    req.user = user[0]; // Set the user object in the request
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
    await db.query(`INSERT INTO users SET ?`, [{
        username,
        password: encryptedPassword,
        email,
        admin,
        name
    }]);
    res.json({
        status: 200,
        message: 'User created'
    });
});

router.post("/users/:id/messages", restricted, async (req, res, next) => {
    const { id } = req.params;
    const userRequesting = req.body.bot ? [{ id: 0 }] : [{ id: req.user.id }];
    const targetUser = await db.query(`SELECT * FROM users WHERE id = ?`, [id]);
    
    if (!targetUser[0]) {
        return res.status(404).json({
            status: 404,
            message: "Target user not found"
        });
    }
    
    try {
        const messageData = {
            target_id: targetUser[0].id,
            user_id: userRequesting[0].id,
            content: utils.encryptWithAES(data.server.encryptionKey, req.body.bot ? req.body.content : utils.removeXSS(req.body.content)),
            users_id: req.body.bot ? req.body.users.join(",") : `${userRequesting[0].id},${targetUser[0].id}`,
            frontend_msg_id: req.body.frontEndMsgId,
            created_at: new Date()
        };

        await db.query("START TRANSACTION");
        
        // Insert original message
        const result = await db.query("INSERT INTO messages SET ?", messageData);
        
        // Also create a reciprocal message entry to ensure visibility for both users
        if (!req.body.bot) {
            const reciprocalMessage = {
                ...messageData,
                target_id: userRequesting[0].id,
                user_id: targetUser[0].id,
                frontend_msg_id: `${messageData.frontend_msg_id}_reciprocal`
            };
            await db.query("INSERT INTO messages SET ?", reciprocalMessage);
        }
        
        // Update AI history if needed
        if (req.body.bot && req.body.users?.length > 0) {
            const targetUserId = req.body.users[0];
            await db.query(`UPDATE users SET status = 'online' WHERE id = ?`, [targetUserId]);
        }
        
        await db.query("COMMIT");

        res.json({
            status: 200,
            message: "Message stored",
            messageId: result.insertId
        });
    } catch (error) {
        await db.query("ROLLBACK");
        console.error("Error storing message:", error);
        res.status(500).json({
            status: 500,
            message: "Error storing message"
        });
    }
});

router.get("/users/:id/messages", restricted, async (req, res) => {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 100;
    const offset = (page - 1) * limit;

    try {
        const user = await db.query(`SELECT * FROM users WHERE id = ?`, [id]);
        if (!user[0]) {
            return res.status(404).json({
                status: 404,
                message: "User not found"
            });
        }

        // Get messages with pagination
        let messages = await db.query(`
            SELECT * FROM messages 
            WHERE (
                (target_id = ? AND user_id = ?) OR 
                (target_id = ? AND user_id = 0) OR 
                (user_id = ? AND target_id = ?)
            )
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [id, req.user.id, id, req.user.id, id, limit, offset]);

        // Process messages
        messages = messages.map(msg => {
            if (msg.user_id === req.user.id) {
                return {
                    ...msg,
                    isOwn: true,
                    username: req.user.username,
                    avatar: req.user.avatar,
                    name: req.user.name
                };
            } else if (msg.user_id === 0) {
                return {
                    ...msg,
                    isOwn: false,
                    username: "BarnieBot",
                    avatar: "/img/barnie_avatar.png",
                    name: "BarnieBot"
                };
            } else {
                return {
                    ...msg,
                    isOwn: false,
                    username: user[0].username,
                    avatar: user[0].avatar,
                    name: user[0].name
                };
            }
        });

        // Decrypt messages content
        messages = utils.decryptMessages(messages);

        res.json({
            status: 200,
            messages: messages
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({
            status: 500,
            message: "Error fetching messages"
        });
    }
});

router.post("/trash/data", restricted, async (req, res) => {
    const { uid, name, quantity } = req.body;
    if ([uid, name, quantity].some(i => !i)) return res.status(400).json({ status: 400, message: "Missing parameters" });
    const user = await db.query("SELECT * FROM users WHERE id = ?", [uid]);
    if (!user[0]) return res.status(400).json({ status: 400, message: "Missing valid UID" });
    await db.query("INSERT INTO trash_logs SET ?", [{ uid, data: `El usuario ${user[0].username} ha registrado botar ${quantity} unidades de ${name}` }]);
    return res.status(200).json({ status: 200, message: "Logged" });
});

router.get("/users/:uid/trash/data", restricted, async (req, res) => {
    const uid = req.params.uid;
    const user = await db.query("SELECT * FROM users WHERE id = ?", [Number(uid)]);
    if (!user[0]) return res.status(400).json({ status: 400, message: "Missing valid UID" });
    const logs = await db.query("SELECT * FROM trash_logs WHERE uid = ?", [uid]);
    logs.sort((a, b) => b.id - a.id);
    return res.status(200).json({ status: 200, logs });
});

module.exports = router;