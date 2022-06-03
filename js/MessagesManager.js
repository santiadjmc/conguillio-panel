const socket = io();
socket.emit("set-id", "{{user.id}}");
socket.emit("set-chat", "{{target.id}}");
$(".chat-input-text").keypress(function(e) {
    if (e.which == 13) {
        $(".chat-input-button").click();
    }
});
$(".chat-input-button").click(async function() {
    const text = $(".chat-input-text").val();
    if (text.length > 0) {
        $(".chat-input-text").val('');
        $(".chat-messages").append(`
            <div class="chat-message own">
                <div class="chat-message-text">
                    <p class="chat-message-text-paragraph">${text}</p>
                </div>
            </div>
        `);
        $(".chat-messages").scroll(100);
        const response = await fetch('/api/users/{{target.id}}/messages', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "authorization": "User {{user.id}}"
            },
            body: JSON.stringify({ content: text })
        });
        if (response.status > 399) {
            displayModal("Error", `No pudimos enviar tu mensaje, actualiza la página e inténtalo de nuevo.`);
            return;
        }
        console.log("WebSocketManager: Message stored, sending to server through socket...");
    }
});
$(".user-data").click(function() {
    $(".chat-input-text").focus();
});