/**
 * Client side utils
 */
const utils = {
    windowFocused: () => {
        return document.hasFocus();
    },
    currentPath: () => {
        return window.location.pathname;
    },
    displayNotification: (title, body, onclick, avatar) => {
        if (Notification.permission === "granted") {
            const notification = new Notification(title, {
                body,
                icon: avatar || "/img/notification_icon.png",
            });
            notification.onclick = onclick || function () {
                window.focus();
                notification.close();
            }
            notification.onerror = () => {
                notification.close();
                displayInteractiveModal("Error", "An error occurred while trying to display the notification, if the error persists, contact an administrator.", {
                    className: "btn btn-secondary",
                    text: "Reload",
                    onclick: () => {
                        window.location.reload();
                    }
                });
            }
        }
    },
    askForNotificationPermission: () => {
        if (Notification.permission === "granted") return;
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                utils.displayNotification("Permission granted", "You can now receive notifications");
            }
            else {
                console.log("Debug: Notifications were rejected by the user or by the user's browser.")
            }
        });
    },
    changeTitle: title => {
        document.title = title;
    },
    playSound: url => {
        const audio = new Audio(url);
        audio.play();
        audio.onended = () => {
            audio.remove();
        }
        audio.onerror = () => {
            audio.remove();
            displayInteractiveModal("Error", "An error occurred while trying to play the audio, if the error persists, contact an administrator.", {
                className: "btn btn-secondary",
                text: "Reload",
                onclick: () => {
                    window.location.reload();
                }
            });
        }
    },
    parseMD: (text) => {
        socket.emit("markdown-render", text);
        console.log(`REQUESTED MARKDOWN: ${text}`);
        return new Promise((resolve, reject) => {
            socket.on("markdown-render-response", d => {
                console.log(`RESOLVED MARKDOWN: ${d}`);
                resolve(d.trim());
            });
        });
    },
    GetMessageContent: (id) => {
        socket.emit("get-message-content", Number(id));
        return new Promise((resolve, reject) => {
            socket.on("get-message-content-response", d => { if (d.id === Number(id)) resolve(d.content) });
        });
    },
    removeXSS: (str) => {
        return str.replace(/<(?:.|\n)*?>/gm, 'HTML TAG REMOVED');
    }
}