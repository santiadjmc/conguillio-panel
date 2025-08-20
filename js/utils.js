// Utilities - Simple and Clean
const utils = {
    // Notification system
    askForNotificationPermission: () => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    UI.showToast('Permisos de notificación concedidos', 'success');
                }
            });
        }
    },
    
    displayNotification: (title, body, onclick, icon) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body: body,
                icon: icon || '/img/notification_icon.png',
            });
            
            notification.onclick = onclick || (() => {
                window.focus();
                notification.close();
            });
            
            notification.onerror = () => {
                notification.close();
                UI.showToast('Error al mostrar notificación', 'error');
            };
        }
    },
    
    // Window utilities
    windowFocused: () => document.hasFocus(),
    currentPath: () => window.location.pathname,
    changeTitle: title => document.title = title,
    
    // Text utilities
    removeXSS: str => str.replace(/<[^>]*>/g, ''),
    
    // Validation utilities
    checkFields: (...fields) => {
        return fields.every(field => field && field.trim() !== '');
    },
    
    // Audio utilities
    playSound: url => {
        try {
            const audio = new Audio(url);
            audio.volume = 0.5;
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
        } catch (error) {
            console.warn('Audio playback failed:', error);
        }
    },
    
    // Promise utilities
    wait: time => new Promise(resolve => setTimeout(resolve, time)),
    
    // Socket utilities (if socket is available)
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
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                reject('Speech recognition not supported');
                return;
            }
            
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            
            recognition.lang = 'es-ES';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            
            recognition.onresult = (event) => {
                const result = event.results[0][0].transcript;
                resolve(result);
            };
            
            recognition.onerror = (event) => {
                reject(event.error);
            };
            
            recognition.start();
        });
    }
};

// Auto-request notification permission on load
document.addEventListener('DOMContentLoaded', () => {
    utils.askForNotificationPermission();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = utils;
}