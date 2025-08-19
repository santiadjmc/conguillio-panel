// Global socket event handlers - Optimized
if (typeof socket !== 'undefined') {
    // Handle incoming messages (notifications only for background messages)
    socket.on("message", async data => {
        if (data.currentChat) return; // Don't notify if in current chat
        
        utils.displayNotification(
            data.user.username, 
            data.content, 
            () => {
                window.focus();
                window.location.href = `/dashboard/users/${data.user.id}/messages`;
            }, 
            data.user.avatar
        );
    });

    // Handle server-requested reload
    socket.on("reload", () => {
        UIManager.showToast("El servidor requiere actualizar la página", "warning");
        setTimeout(() => {
            window.location.reload();
        }, 3000);
    });

    // Handle connection status
    socket.on("connect", () => {
        UIManager.showToast("Conectado al servidor", "success");
    });

    socket.on("disconnect", () => {
        UIManager.showToast("Conexión perdida", "error");
    });

    // Auto-reconnect logic
    socket.on("reconnect", () => {
        UIManager.showToast("Reconectado exitosamente", "success");
    });
}

// Enhanced page navigation with loading states
document.addEventListener('DOMContentLoaded', () => {
    // Add loading state to all internal links
    const internalLinks = document.querySelectorAll('a[href^="/dashboard"]');
    internalLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Don't interfere with links that open in new tabs
            if (e.ctrlKey || e.metaKey || link.target === '_blank') return;
            
            if (typeof UIManager !== 'undefined') {
                UIManager.showLoading();
            }
        });
    });

    // Form submission loading states
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', () => {
            if (typeof UIManager !== 'undefined') {
                UIManager.showLoading();
            }
        });
    });

    // Hide loading when page is fully loaded
    window.addEventListener('load', () => {
        setTimeout(() => {
            if (typeof UIManager !== 'undefined') {
                UIManager.hideLoading();
            }
        }, 500);
    });
});