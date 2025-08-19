/**
 * Enhanced WebSocket Manager with better error handling and reconnection
 */
class WebSocketManager extends WebSocket {
    #isJson = (str) => {
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    }
    
    #reconnectAttempts = 0;
    #maxReconnectAttempts = 5;
    #reconnectDelay = 1000;
    
    constructor(url) {
        super(url);
        this.url = url;
        this.setupEventHandlers();
        this.setupConnectionTimeout();
    }
    
    setupEventHandlers() {
        this.onopen = (event) => {
            console.log('WebSocketManager: Connection opened');
            this.#reconnectAttempts = 0;
            UIManager.showToast('WebSocket conectado', 'success');
        };
        
        this.onclose = (event) => {
            console.log('WebSocketManager: Connection closed');
            this.handleReconnection();
        };
        
        this.onerror = (event) => {
            console.error('WebSocketManager: Connection error', event);
            UIManager.showToast('Error de WebSocket', 'error');
        };
        
        this.onmessage = this.defaultOnMessage;
    }
    
    setupConnectionTimeout() {
        setTimeout(() => {
            if (this.readyState !== WebSocket.OPEN) {
                UIManager.showToast('Tiempo de conexión agotado', 'error');
            }
        }, 5000);
    }
    
    handleReconnection() {
        if (this.#reconnectAttempts < this.#maxReconnectAttempts) {
            this.#reconnectAttempts++;
            UIManager.showToast(`Reintentando conexión (${this.#reconnectAttempts}/${this.#maxReconnectAttempts})`, 'warning');
            
            setTimeout(() => {
                this.reconnect();
            }, this.#reconnectDelay * this.#reconnectAttempts);
        } else {
            displayInteractiveModal("Conexión Perdida", "No se pudo restablecer la conexión WebSocket. Por favor, recarga la página.", {
                className: "btn btn-primary",
                text: "Recargar",
                onclick: () => {
                    window.location.reload();
                }
            });
        }
    }
    
    reconnect() {
        try {
            const newWs = new WebSocket(this.url);
            
            newWs.onopen = this.onopen;
            newWs.onclose = this.onclose;
            newWs.onerror = this.onerror;
            newWs.onmessage = this.onmessage;
            
            // Replace the current WebSocket instance
            Object.setPrototypeOf(this, newWs);
            Object.assign(this, newWs);
            
        } catch (error) {
            console.error('Reconnection failed:', error);
            this.handleReconnection();
        }
    }
    
    defaultOnMessage = async (message) => {
        if (!this.#isJson(message.data)) return;
        
        try {
            const data = JSON.parse(message.data);
            const { event, args } = data;
            
            switch (event) {
                case "error":
                    const errorMessage = args?.[0] || "Error desconocido del servidor";
                    UIManager.showToast(errorMessage, 'error');
                    break;
                    
                case "change-avatar-response":
                    if (args?.[0] === "SUCCESS" && args?.[1]) {
                        UIManager.showToast("Avatar actualizado exitosamente", 'success');
                        // Update avatar in the UI if needed
                        const avatarElements = document.querySelectorAll('.user-avatar');
                        avatarElements.forEach(el => {
                            if (el.dataset.userId === window.currentUserId) {
                                el.src = args[1];
                            }
                        });
                    }
                    break;
                    
                case "set-user-id-response":
                    if (args?.[0] === "SUCCESS") {
                        console.log('User ID set successfully:', args[1]);
                    }
                    break;
                    
                default:
                    console.log('Unhandled WebSocket event:', event, args);
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }
    
    /**
     * Send data through WebSocket with error handling
     * @param {string} event 
     * @param {any[]} args 
     */
    sendData(event, args) {
        if (this.readyState === WebSocket.OPEN) {
            try {
                this.send(JSON.stringify({ event, args }));
            } catch (error) {
                console.error('Error sending WebSocket data:', error);
                UIManager.showToast('Error enviando datos', 'error');
            }
        } else {
            console.warn('WebSocket not open, cannot send data');
            UIManager.showToast('WebSocket no conectado', 'warning');
        }
    }
    
    get connected() {
        return this.readyState === WebSocket.OPEN;
    }
}

// Initialize WebSocket connection
let ws;
try {
    ws = new WebSocketManager(`ws://${location.hostname}:8081/`);
} catch (error) {
    console.error('Failed to initialize WebSocket:', error);
    UIManager.showToast('Error inicializando WebSocket', 'error');
}