socket.on("message", async data => {
    if (data.currentChat) return;
    utils.displayNotification(data.user.username, data.content, () => {
        window.focus();
        location.href = `/dashboard/users/${data.user.id}/messages`;
    });
});