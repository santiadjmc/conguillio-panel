module.exports = {
    name: 'echo',
    description: 'Responde con el mismo mensaje que envías',
    async execute({ socket, targetSocket, content, userid, chat, io, db, utils, data }) {
        const response = `Echo: ${content}`;
        const frontEndMsgId = Date.now();
        
        // Save message to database like the AI responses
        await fetch(`http://localhost:${process.env.PORT || 3000}/api/users/${chat}/messages`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "User " + userid
            },
            body: JSON.stringify({ 
                content: response, 
                bot: true, 
                users: [userid, chat],
                frontEndMsgId 
            })
        });

        // Send response to current socket
        socket.emit("message", {
            currentChat: true,
            content: response,
            user: {
                username: "BarnieBot",
                avatar: "/img/barnie_avatar.png",
                name: "BarnieBot"
            },
            frontEndMsgId,
            selfDestruct: true,
            errorMessage: "(Solo tú puedes ver este mensaje)"
        });

        // Send to target socket if they're in the chat
        if (targetSocket && targetSocket.chat === userid) {
            targetSocket.emit("message", {
                currentChat: true,
                content: response,
                user: {
                    username: "BarnieBot",
                    avatar: "/img/barnie_avatar.png",
                    name: "BarnieBot"
                },
                frontEndMsgId,
                selfDestruct: true,
                errorMessage: "(Solo tú puedes ver este mensaje)"
            });
        }
    }
};