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
    displayNotification: (title, body, onclick) => {
        if (Notification.permission === "granted") {
            const notification = new Notification(title, {
                body,
            });
            notification.onclick = onclick || function () {
                window.focus();
                notification.close();
            }
        }
    },
    askForNotificationPermission: () => {
        if (Notification.permission === "granted") return;
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                utils.displayNotification("Permission granted", "You can now receive notifications");
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
    }
}