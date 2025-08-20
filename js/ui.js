// UI Manager - Simple and Clean
class UI {
    // Loading functionality
    static showLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('show');
        }
    }
    
    static hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.remove('show');
        }
    }
    
    // Toast notifications
    static showToast(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toast-container');
        if (!container) {
            console.warn('Toast container not found');
            return;
        }
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = this.getToastIcon(type);
        toast.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
            <button class="btn btn-sm" onclick="this.parentElement.remove()" style="margin-left: auto; padding: 2px 6px;">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(toast);
        
        if (duration > 0) {
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.style.animation = 'slideOut 0.3s ease forwards';
                    setTimeout(() => toast.remove(), 300);
                }
            }, duration);
        }
    }
    
    static getToastIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-triangle',
            warning: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }
    
    // Modal functionality
    static showModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.add('show');
        }
    }
    
    static hideModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove('show');
        }
    }
}

// Modal Functions (for backward compatibility)
function displayModal(title, message) {
    const modal = document.getElementById('basic-modal');
    const titleEl = document.getElementById('basic-modal-title');
    const messageEl = document.getElementById('basic-modal-message');
    
    if (titleEl && messageEl && modal) {
        titleEl.textContent = title;
        messageEl.textContent = message;
        UI.showModal('basic-modal');
    }
}

function displayInteractiveModal(title, message, ...buttons) {
    const modal = document.getElementById('interactive-modal');
    const titleEl = document.getElementById('interactive-modal-title');
    const messageEl = document.getElementById('interactive-modal-message');
    const footer = document.getElementById('interactive-modal-footer');
    
    if (!titleEl || !messageEl || !footer || !modal) return;
    
    titleEl.textContent = title;
    messageEl.textContent = message;
    footer.innerHTML = '';
    
    if (buttons.length < 1) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary';
        btn.textContent = 'OK';
        btn.onclick = () => UI.hideModal('interactive-modal');
        footer.appendChild(btn);
    } else {
        buttons.forEach(button => {
            const btn = document.createElement('button');
            btn.className = button.className || 'btn btn-secondary';
            btn.textContent = button.text || 'OK';
            btn.onclick = button.onclick || (() => UI.hideModal('interactive-modal'));
            footer.appendChild(btn);
        });
    }
    
    UI.showModal('interactive-modal');
}

// File utility (for backward compatibility)
function convertFileToBuffer(inputFileValue) {
    return new Promise((resolve, reject) => {
        const file = inputFileValue.files[0];
        if (!file) {
            reject('No file selected');
            return;
        }
        
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = function(event) {
            let buffer = event.target.result;
            let base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => {
                return data + String.fromCharCode(byte);
            }, ''));
            resolve({ base64, buffer });
        };
        reader.onerror = function(event) {
            reject("File could not be read! Code " + event.target.error.code);
        };
    });
}

// Initialize UI on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Hide loading after page load
    setTimeout(() => UI.hideLoading(), 500);
    
    // Setup modal close handlers
    const modalCloseButtons = document.querySelectorAll('.modal-close');
    modalCloseButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal-overlay');
            if (modal) {
                modal.classList.remove('show');
            }
        });
    });
    
    // Close modals when clicking outside
    const modalOverlays = document.querySelectorAll('.modal-overlay');
    modalOverlays.forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('show');
            }
        });
    });
    
    // Add loading to forms
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', () => {
            UI.showLoading();
        });
    });
});

// Add slideOut animation CSS if needed
if (!document.querySelector('#slideout-animation')) {
    const style = document.createElement('style');
    style.id = 'slideout-animation';
    style.textContent = `
        @keyframes slideOut {
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI;
}