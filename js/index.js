socket.on("message", async data => {
    if (data.currentChat) return;
    utils.displayNotification(data.user.username, data.content, () => {
        window.focus();
        location.href = `/dashboard/users/${data.user.id}/messages`;
    }, data.user.avatar);
});
socket.on("reload", () => {
    displayModal("Whoops...", "El servidor me ordenó reiniciar tu página, lo haré en 5 segundos 🥴");
    setTimeout(() => { location.reload() }, 5000);
});