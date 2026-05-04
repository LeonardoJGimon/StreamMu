/**
 * Lazy CSS Loader Module
 * Carga CSS no-crítico de forma asincrónica después de que page es interactive
 */

class LazyCSSLoader {
    constructor() {
        this.loadedSheets = new Set();
        this.queue = [];
    }

    /**
     * Carga CSS de forma lazy - esperando a que el DOM sea interactivo
     */
    loadCSS(href, { media = 'all', priority = 'low' } = {}) {
        return new Promise((resolve, reject) => {
            // Si ya está cargado, resolver inmediatamente
            if (this.loadedSheets.has(href)) {
                resolve();
                return;
            }

            // Crear promise que ejecutaremos después
            const loader = () => {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = href;
                link.media = media;
                link.onload = () => {
                    this.loadedSheets.add(href);
                    resolve();
                };
                link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`));
                document.head.appendChild(link);
            };

            // Ejecutar basado en prioridad
            if (priority === 'high') {
                loader();
            } else if ('requestIdleCallback' in window) {
                window.requestIdleCallback(loader, { timeout: 5000 });
            } else {
                // Fallback: Esperar a que page se cargue
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', loader, { once: true });
                } else {
                    setTimeout(loader, 100);
                }
            }
        });
    }

    /**
     * Carga múltiples CSS sheets
     */
    async loadMultiple(sheets) {
        return Promise.all(
            sheets.map(sheet => 
                this.loadCSS(
                    sheet.href, 
                    { media: sheet.media, priority: sheet.priority }
                )
            )
        );
    }

    /**
     * Pre-carga CSS para hover/focus state
     */
    preloadCSS(href) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = href;
        document.head.appendChild(link);
    }
}

// Crear instancia global
window.LazyCSSLoader = new LazyCSSLoader();

// Lazy-load CSS no-crítico después de renderizado inicial
if (document.readyState !== 'loading') {
    setTimeout(() => {
        window.LazyCSSLoader.loadMultiple([
            { href: '/dist/css/dashboard.css', priority: 'low' },
            { href: '/dist/css/ranking.css', priority: 'low' },
            { href: '/dist/css/server-classes.css', priority: 'low' },
            { href: '/dist/css/server-details.css', priority: 'low' },
            { href: '/dist/css/server-extras.css', priority: 'low' },
            { href: '/dist/css/bosses-invasion-rewards.css', priority: 'low' },
        ]).catch(err => {
            if (window.AppLogger) window.AppLogger.error('Failed to lazy-load CSS', err);
        });
    }, 2000); // Esperar 2s después de carga inicial
}

window.LazyCSSModule = { LazyCSSLoader };
