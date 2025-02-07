module.exports = {
    name: 'announce',
    description: 'Envía un anuncio global a todos los usuarios (Solo administradores)',
    async execute({ socket, content, userid, io, db, utils, data }) {
        // Check if user is admin
        const user = await db.query('SELECT * FROM users WHERE id = ?', [userid]);
        if (!user[0] || !user[0].admin) {
            socket.emit("message", {
                currentChat: true,
                content: "No tienes permiso para usar este comando.",
                user: {
                    username: "BarnieBot",
                    avatar: "/img/barnie_avatar.png",
                    name: "BarnieBot"
                },
                error: true,
                selfDestruct: true,
                errorMessage: "(Solo tú puedes ver este mensaje)",
                frontEndMsgId: Date.now()
            });
            return;
        }

        if (!content) {
            socket.emit("message", {
                currentChat: true,
                content: "Debes proporcionar un mensaje para anunciar.",
                user: {
                    username: "BarnieBot",
                    avatar: "/img/barnie_avatar.png",
                    name: "BarnieBot"
                },
                error: true,
                selfDestruct: true,
                errorMessage: "(Solo tú puedes ver este mensaje)",
                frontEndMsgId: Date.now()
            });
            return;
        }

        const announcementContent = `📢 Anuncio: ${content}`;
        const users = await db.query('SELECT id FROM users WHERE id != 0');

        // Save announcement for each user
        for (const targetUser of users) {
            if (targetUser.id === userid) continue;
            await fetch(`http://localhost:${process.env.PORT || 3000}/api/users/${targetUser.id}/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "User " + userid
                },
                body: JSON.stringify({ 
                    content: announcementContent,
                    bot: true,
                    users: [userid, targetUser.id],
                    frontEndMsgId: Date.now()
                })
            });
        }

        // Send announcement to all connected sockets except the sender
        socket.broadcast.emit("message", {
            currentChat: false,
            content: announcementContent,
            user: {
                username: "BarnieBot",
                avatar: "/img/barnie_avatar.png",
                name: "BarnieBot"
            },
            frontEndMsgId: Date.now()
        });

        // Confirm to the sender
        socket.emit("message", {
            currentChat: true,
            content: "✅ Anuncio enviado correctamente.",
            user: {
                username: "BarnieBot",
                avatar: "/img/barnie_avatar.png",
                name: "BarnieBot"
            },
            selfDestruct: true,
            errorMessage: "(Solo tú puedes ver este mensaje)",
            frontEndMsgId: Date.now()
        });
    }
};