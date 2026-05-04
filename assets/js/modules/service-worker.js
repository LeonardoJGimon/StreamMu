/**
 * Service Worker Registration Module
 */

class ServiceWorkerManager {
    constructor() {
        this.registration = null;
        this.ready = false;
    }

    /**
     * Registrar Service Worker
     */
    async register(swPath = '/service-worker.js') {
        if (!('serviceWorker' in navigator)) {
            if (window.AppLogger) {
                window.AppLogger.info('Service Workers not supported');
            }
            return null;
        }

        try {
            this.registration = await navigator.serviceWorker.register(swPath, {
                scope: '/'
            });

            this.ready = true;

            if (window.AppLogger) {
                window.AppLogger.info('Service Worker registered', {
                    scope: this.registration.scope
                });
            }

            // Escuchar updates
            this.registration.addEventListener('updatefound', () => {
                const worker = this.registration.installing;
                if (worker) {
                    worker.addEventListener('statechange', () => {
                        if (worker.state === 'activated') {
                            if (window.AppLogger) {
                                window.AppLogger.info('Service Worker updated');
                            }
                            // Notificar usuario de update
                            this.notifyUpdate();
                        }
                    });
                }
            });

            return this.registration;
        } catch (error) {
            if (window.AppLogger) {
                window.AppLogger.warn('Service Worker registration failed', error);
            }
            return null;
        }
    }

    /**
     * Verificar updates
     */
    async checkForUpdates() {
        if (!this.registration) return;

        try {
            await this.registration.update();
        } catch (error) {
            if (window.AppLogger) {
                window.AppLogger.debug('Service Worker update check failed', error);
            }
        }
    }

    /**
     * Solicitar sincronización en background
     */
    async requestSync(tag = 'sync-data') {
        if (!this.registration || !this.registration.sync) {
            if (window.AppLogger) {
                window.AppLogger.info('Background Sync not available');
            }
            return;
        }

        try {
            await this.registration.sync.register(tag);
            if (window.AppLogger) {
                window.AppLogger.info(`Background sync registered: ${tag}`);
            }
        } catch (error) {
            if (window.AppLogger) {
                window.AppLogger.warn('Background Sync registration failed', error);
            }
        }
    }

    /**
     * Suscribirse a Push Notifications
     */
    async subscribeToPushNotifications(publicKey) {
        if (!this.registration || !('pushManager' in this.registration)) {
            if (window.AppLogger) {
                window.AppLogger.info('Push notifications not available');
            }
            return null;
        }

        try {
            const subscription = await this.registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(publicKey)
            });

            if (window.AppLogger) {
                window.AppLogger.info('Subscribed to push notifications');
            }

            return subscription;
        } catch (error) {
            if (window.AppLogger) {
                window.AppLogger.warn('Push subscription failed', error);
            }
            return null;
        }
    }

    /**
     * Obtener suscripción existente
     */
    async getPushSubscription() {
        if (!this.registration) return null;

        try {
            return await this.registration.pushManager.getSubscription();
        } catch (error) {
            if (window.AppLogger) {
                window.AppLogger.debug('Get push subscription failed', error);
            }
            return null;
        }
    }

    /**
     * Notificar al usuario sobre updates
     */
    notifyUpdate() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            font-weight: bold;
            font-size: 14px;
            cursor: pointer;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = '✅ App updated! Reload to see the latest version.';
        notification.onclick = () => window.location.reload();

        document.body.appendChild(notification);

        // Auto-remover después de 5 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    /**
     * Helper: Convertir base64 a Uint8Array
     */
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }

        return outputArray;
    }

    /**
     * Desregistrar Service Worker
     */
    async unregister() {
        if (!this.registration) return;

        try {
            const success = await this.registration.unregister();
            if (success) {
                this.registration = null;
                this.ready = false;
                if (window.AppLogger) {
                    window.AppLogger.info('Service Worker unregistered');
                }
            }
        } catch (error) {
            if (window.AppLogger) {
                window.AppLogger.warn('Service Worker unregistration failed', error);
            }
        }
    }
}

// Crear instancia global
window.swManager = new ServiceWorkerManager();

// Service Worker auto-registration disabled.
// if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'development') {
//     if (document.readyState === 'loading') {
//         document.addEventListener('DOMContentLoaded', () => {
//             window.swManager.register();
//             // Verificar updates cada 24 horas
//             setInterval(() => window.swManager.checkForUpdates(), 24 * 60 * 60 * 1000);
//         });
//     } else {
//         window.swManager.register();
//         setInterval(() => window.swManager.checkForUpdates(), 24 * 60 * 60 * 1000);
//     }
// }

// Export
window.ServiceWorkerManager = ServiceWorkerManager;
