/**
 * Client side utilities - Optimized and cleaned
 */
const utils = {
    // Window and Document utilities
    windowFocused: () => document.hasFocus(),
    currentPath: () => window.location.pathname,
    changeTitle: title => document.title = title,
    
    // Notification system
    displayNotification: (title, body, onclick, avatar) => {
        if (Notification.permission !== "granted") return;
        
        const notification = new Notification(title, {
            body,
            icon: avatar || "/img/notification_icon.png",
        });
        
        notification.onclick = onclick || (() => {
            window.focus();
            notification.close();
        });
        
        notification.onerror = () => {
            notification.close();
            UIManager.showToast("Error al mostrar notificación", "error");
        };
    },
    
    askForNotificationPermission: () => {
        if (Notification.permission === "granted") return;
        
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                utils.displayNotification("Permisos concedidos", "Ahora puedes recibir notificaciones");
            }
        });
    },
    
    // Audio utilities
    playSound: url => {
        const audio = new Audio(url);
        audio.volume = 0.5; // Reasonable volume
        audio.play().catch(() => {
            // Fail silently - audio autoplay might be blocked
        });
        
        audio.onended = () => {
            audio.pause();
            audio.src = '';
        };
        audio.onerror = () => {
            audio.pause();
            audio.src = '';
        };
    },
    
    // Text utilities
    removeXSS: str => str.replace(/<[^>]*>/g, ''),
    
    // Validation utilities
    checkFields: (...fields) => {
        return fields.every(field => field && field.trim() !== '');
    },
    
    // Promise-based utilities
    wait: time => new Promise(resolve => setTimeout(resolve, time)),
    
    // Socket-based utilities (if socket is available)
    parseMD: (text) => {
        if (typeof socket === 'undefined') return Promise.resolve(text);
        
        return new Promise((resolve) => {
            const handler = (data) => {
                socket.off("markdown-render-response", handler);
                resolve(data.trim());
            };
            
            socket.on("markdown-render-response", handler);
            socket.emit("markdown-render", text);
            
            // Timeout after 5 seconds
            setTimeout(() => {
                socket.off("markdown-render-response", handler);
                resolve(text);
            }, 5000);
        });
    },
    
    GetMessageContent: (id) => {
        if (typeof socket === 'undefined') return Promise.resolve('');
        
        return new Promise((resolve) => {
            const handler = (data) => {
                if (data.id === Number(id)) {
                    socket.off("get-message-content-response", handler);
                    resolve(data.content);
                }
            };
            
            socket.on("get-message-content-response", handler);
            socket.emit("get-message-content", Number(id));
            
            // Timeout after 5 seconds
            setTimeout(() => {
                socket.off("get-message-content-response", handler);
                resolve('');
            }, 5000);
        });
    },
    
    // Voice input (fallback gracefully if not supported)
    getVoiceInput: () => {
        return new Promise((resolve, reject) => {
            if (!('webkitSpeechRecognition' in window)) {
                reject(new Error('Speech recognition not supported'));
                return;
            }
            
            const recognition = new webkitSpeechRecognition();
            recognition.lang = "es-ES";
            recognition.continuous = false;
            recognition.interimResults = false;
            
            recognition.onresult = event => {
                resolve(event.results[0][0].transcript);
            };
            
            recognition.onerror = event => {
                reject(new Error('Speech recognition error: ' + event.error));
            };
            
            recognition.start();
        });
    }
};