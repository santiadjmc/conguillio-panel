// Main Application Logic
document.addEventListener('DOMContentLoaded', () => {
    // Socket.io setup and handlers
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
            UI.showToast("El servidor requiere actualizar la página", "warning");
            setTimeout(() => {
                window.location.reload();
            }, 3000);
        });

        // Handle connection status
        socket.on("connect", () => {
            UI.showToast("Conectado al servidor", "success");
        });

        socket.on("disconnect", () => {
            UI.showToast("Conexión perdida", "error");
        });

        // Auto-reconnect logic
        socket.on("reconnect", () => {
            UI.showToast("Reconectado exitosamente", "success");
        });
    }

    // Enhanced page navigation with loading states
    const internalLinks = document.querySelectorAll('a[href^="/dashboard"]');
    internalLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Don't interfere with links that open in new tabs
            if (e.ctrlKey || e.metaKey || link.target === '_blank') return;
            
            UI.showLoading();
        });
    });

    // Form submission loading states
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', () => {
            UI.showLoading();
        });
    });

    // Hide loading when page is fully loaded
    window.addEventListener('load', () => {
        setTimeout(() => {
            UI.hideLoading();
        }, 500);
    });

    // Add active state to current navigation link
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    // Enhanced form validation
    const requiredFields = document.querySelectorAll('[required]');
    requiredFields.forEach(field => {
        field.addEventListener('invalid', (e) => {
            e.preventDefault();
            UI.showToast('Por favor, completa todos los campos requeridos', 'warning');
            field.focus();
        });
    });

    // Auto-save forms (if applicable)
    const autoSaveForms = document.querySelectorAll('[data-autosave]');
    autoSaveForms.forEach(form => {
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('input', utils.debounce(() => {
                const formData = new FormData(form);
                const data = Object.fromEntries(formData);
                localStorage.setItem(`autosave_${form.id || 'form'}`, JSON.stringify(data));
            }, 1000));
        });

        // Restore data on load
        const savedData = localStorage.getItem(`autosave_${form.id || 'form'}`);
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                Object.entries(data).forEach(([key, value]) => {
                    const field = form.querySelector(`[name="${key}"]`);
                    if (field) field.value = value;
                });
            } catch (error) {
                console.warn('Failed to restore form data:', error);
            }
        }
    });

    // Theme toggle (if needed in the future)
    const themeToggle = document.querySelector('[data-theme-toggle]');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });

        // Restore theme
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.body.setAttribute('data-theme', savedTheme);
    }

    // Add smooth scrolling to anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K for search (if implemented)
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.querySelector('[data-search]');
            if (searchInput) {
                searchInput.focus();
            }
        }

        // Escape to close modals
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal-overlay.show');
            if (openModal) {
                openModal.classList.remove('show');
            }
        }
    });

    // Add copy to clipboard functionality
    const copyButtons = document.querySelectorAll('[data-copy]');
    copyButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const text = button.getAttribute('data-copy') || button.textContent;
            try {
                await navigator.clipboard.writeText(text);
                UI.showToast('Copiado al portapapeles', 'success');
            } catch (error) {
                console.warn('Failed to copy to clipboard:', error);
                UI.showToast('Error al copiar', 'error');
            }
        });
    });
});

// Utility function for debouncing
utils.debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Global error handler
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    UI.showToast('Ha ocurrido un error inesperado', 'error');
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    UI.showToast('Error en la aplicación', 'error');
});

// Page visibility change handler
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden
    } else {
        // Page is visible
        if (typeof socket !== 'undefined' && !socket.connected) {
            // Try to reconnect if socket is disconnected
            socket.connect();
        }
    }
});