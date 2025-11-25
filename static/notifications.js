// ===========================
// Notification System
// ===========================

// Create notification container on first load
function initNotifications() {
    if (!document.getElementById('notification-container')) {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'fixed top-4 right-4 z-50 space-y-2 max-w-sm';
        document.body.appendChild(container);
    }
}

// Show notification
function showNotification(message, type = 'error') {
    initNotifications();

    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');

    // Style based on type
    const bgColors = {
        error: 'bg-red-600',
        success: 'bg-green-600',
        info: 'bg-blue-600',
        warning: 'bg-yellow-600'
    };

    const icons = {
        error: '❌',
        success: '✅',
        info: 'ℹ️',
        warning: '⚠️'
    };

    notification.className = `${bgColors[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-start gap-3 animate-slide-in`;
    notification.innerHTML = `
        <span class="text-lg flex-shrink-0">${icons[type]}</span>
        <div class="flex-1 text-sm">${escapeNotificationHtml(message)}</div>
        <button class="text-white/80 hover:text-white flex-shrink-0" onclick="this.parentElement.remove()">✕</button>
    `;

    // Add to container
    container.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        notification.style.transition = 'all 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Escape HTML for notifications
function escapeNotificationHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add animation styles
if (!document.getElementById('notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slide-in {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        .animate-slide-in {
            animation: slide-in 0.3s ease-out;
        }
    `;
    document.head.appendChild(style);
}
