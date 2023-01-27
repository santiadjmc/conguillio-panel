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
    }
}