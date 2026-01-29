/* ========================================
   SISTEMA DE NOTIFICACIONES TOAST
   esiiChat - UI Helper
   ======================================== */

class ToastNotification {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Crear contenedor para toasts si no existe
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.style.cssText = `
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 12px;
                pointer-events: none;
            `;
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    show(options) {
        const {
            type = 'info', // success, error, warning, info
            title = '',
            message = '',
            duration = 4000,
            closable = true
        } = options;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.pointerEvents = 'auto';

        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-exclamation-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };

        toast.innerHTML = `
            <div class="toast-icon ${type}">
                ${icons[type] || icons.info}
            </div>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${title}</div>` : ''}
                ${message ? `<div class="toast-message">${message}</div>` : ''}
            </div>
            ${closable ? '<button class="toast-close"><i class="fas fa-times"></i></button>' : ''}
        `;

        this.container.appendChild(toast);

        // Evento de cerrar
        if (closable) {
            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.addEventListener('click', () => {
                this.remove(toast);
            });
        }

        // Auto-cerrar
        if (duration > 0) {
            setTimeout(() => {
                this.remove(toast);
            }, duration);
        }

        return toast;
    }

    remove(toast) {
        toast.classList.add('toast-exit');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    success(title, message, duration) {
        return this.show({ type: 'success', title, message, duration });
    }

    error(title, message, duration) {
        return this.show({ type: 'error', title, message, duration });
    }

    warning(title, message, duration) {
        return this.show({ type: 'warning', title, message, duration });
    }

    info(title, message, duration) {
        return this.show({ type: 'info', title, message, duration });
    }

    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Crear instancia global
window.toast = new ToastNotification();

/* ========================================
   UTILIDADES DE ANIMACIÓN
   ======================================== */

// Añadir clase de animación a elemento
function animateElement(element, animationClass, duration = 300) {
    return new Promise((resolve) => {
        element.classList.add(animationClass);
        setTimeout(() => {
            element.classList.remove(animationClass);
            resolve();
        }, duration);
    });
}

// Animación de contador
function animateCounter(element, start, end, duration = 1000) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.round(current);
        element.classList.add('counting');
        setTimeout(() => element.classList.remove('counting'), 300);
    }, 16);
}

// Scroll suave a elemento
function smoothScrollTo(element, offset = 0) {
    const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
    });
}

// Detectar scroll para añadir sombra
function initScrollShadow(container) {
    const updateShadow = () => {
        if (container.scrollTop > 10) {
            container.classList.add('scrolled');
        } else {
            container.classList.remove('scrolled');
        }
    };

    container.addEventListener('scroll', updateShadow);
    updateShadow();
}

// Efecto ripple para botones
function addRippleEffect(button) {
    button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.5);
            left: ${x}px;
            top: ${y}px;
            pointer-events: none;
            animation: ripple 0.6s ease-out;
        `;

        this.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
}

// Inicializar ripple en todos los botones con clase
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.btn-ripple, .btn-primary, .btn-send').forEach(button => {
        if (!button.classList.contains('ripple-initialized')) {
            addRippleEffect(button);
            button.classList.add('ripple-initialized');
        }
    });
});

// Exportar utilidades
window.UIHelpers = {
    animateElement,
    animateCounter,
    smoothScrollTo,
    initScrollShadow,
    addRippleEffect
};

