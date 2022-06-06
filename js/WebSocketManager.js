class WebSocketManager extends WebSocket {
    #isJson = (str) => {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    }
    constructor(url) {
        super(url);
        this.onopen = (event) => {
            console.log(`WebSocketManager: Connection opened.`);
        }
        this.onclose = (event) => {
            console.log(`WebSocketManager: Connection closed.`);
            displayInteractiveModal("Error", "WebSocket connection closed, please reload.", {
                className: "btn btn-secondary",
                text: "Reload",
                onclick: () => {
                    location.reload();
                }
            });
        }
        this.defaultOnMessage = async message => {
            if (!this.#isJson(message.data)) return;
            const data = JSON.parse(message.data);
            const { event, args } = data;
            switch (event) {
                case "error": {
                    if (args && args.length > 0) {
                        displayInteractiveModal("WebSocket Error", args[0]);
                    }
                    else {
                        displayInteractiveModal("WebSocket Error", `The server didn't send any detail about the error.`);
                    }
                }
            }
        }
        this.onmessage = this.defaultOnMessage;
        this.onerror = (event) => {
            console.log(`WebSocketManager: Connection error.\n${event.error}`);
        }
        setTimeout(() => {
            if (this.readyState != WebSocket.OPEN) {
                displayInteractiveModal("Error", "WebSocket connection timeout, please reload.", {
                    className: "btn btn-secondary",
                    text: "Reload",
                    onclick: () => {
                        location.reload();
                    }
                });
            }
        }, 5000);
    }
    /**
     * 
     * @param {string} event 
     * @param {any[]} args 
     */
    sendData(event, args) {
        if (this.readyState == WebSocket.OPEN) {
            this.send(JSON.stringify({
                event: event,
                args: args
            }));
        }
    }
    get connected() {
        return this.readyState == WebSocket.OPEN;
    }
}
const ws = new WebSocketManager(`ws://${location.host}/`);