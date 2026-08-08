/**
 * Performance Utilities Module
 * Debouncing, throttling, and request optimization
 */

class PerformanceUtils {
    /**
     * Debounce - ejecuta función después de X ms sin nuevas llamadas
     * Útil para: input events, resize, scroll
     */
    static debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle - ejecuta función máximo 1 vez cada X ms
     * Útil para: scroll, mousemove, resize
     */
    static throttle(func, limit = 300) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Request Idle Callback polyfill
     * Ejecuta función cuando el navegador esté inactivo
     */
    static requestIdleCallback(callback, options = {}) {
        if ('requestIdleCallback' in window) {
            return window.requestIdleCallback(callback, options);
        }
        const start = Date.now();
        return setTimeout(() => {
            callback({
                didTimeout: false,
                timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
            });
        }, 1);
    }

    /**
     * Deferred - ejecutar en siguiente tick del event loop
     */
    static defer(func) {
        return new Promise(resolve => {
            setTimeout(() => {
                func();
                resolve();
            }, 0);
        });
    }

    /**
     * Batch updates - agrupa múltiples updates para una sola reflow
     */
    static batch(updates) {
        requestAnimationFrame(() => {
            updates.forEach(fn => fn());
        });
    }

    /**
     * Memoize - cachea resultados de función costosa
     */
    static memoize(func) {
        const cache = new Map();
        return (...args) => {
            const key = JSON.stringify(args);
            if (cache.has(key)) {
                return cache.get(key);
            }
            const result = func(...args);
            cache.set(key, result);
            return result;
        };
    }

    /**
     * Retry con exponential backoff
     */
    static async retry(fn, options = {}) {
        const { maxAttempts = 3, delay = 1000, backoff = 2 } = options;
        let lastError;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                if (attempt < maxAttempts) {
                    const waitTime = delay * Math.pow(backoff, attempt - 1);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        }

        throw lastError;
    }

    /**
     * Lazy load images con Intersection Observer
     */
    static lazyLoadImages(selector = 'img[data-src]') {
        if (!('IntersectionObserver' in window)) {
            document.querySelectorAll(selector).forEach(img => {
                const src = img.getAttribute('data-src');
                if (src) img.src = src;
            });
            return;
        }

        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.getAttribute('data-src');
                    if (src) {
                        img.src = src;
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '50px',
            threshold: 0.01
        });

        document.querySelectorAll(selector).forEach(img => {
            imageObserver.observe(img);
        });
    }

    /**
     * Preload recursos críticos
     */
    static preloadResource(url, type = 'script') {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = type;
        link.href = url;
        document.head.appendChild(link);
    }

    /**
     * Prefetch recursos para siguiente página
     */
    static prefetchResource(url) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        document.head.appendChild(link);
    }

    /**
     * DNS Prefetch para dominios externos
     */
    static dnsPrefetch(domain) {
        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = domain;
        document.head.appendChild(link);
    }
}

// Crear AbortController para fetch requests
class FetchController {
    constructor() {
        this.controllers = new Map();
    }

    /**
     * Fetch con AbortController incluido
     */
    async fetch(key, url, options = {}) {
        // Cancelar request anterior si existe
        if (this.controllers.has(key)) {
            this.controllers.get(key).abort();
        }

        const controller = new AbortController();
        this.controllers.set(key, controller);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            this.controllers.delete(key);
            return response;
        } catch (error) {
            if (error.name === 'AbortError') {
                if (window.AppLogger) {
                    window.AppLogger.info(`Request ${key} aborted`);
                }
            }
            throw error;
        }
    }

    /**
     * Cancelar request específico
     */
    abort(key) {
        if (this.controllers.has(key)) {
            this.controllers.get(key).abort();
            this.controllers.delete(key);
        }
    }

    /**
     * Cancelar todos los requests
     */
    abortAll() {
        this.controllers.forEach(controller => controller.abort());
        this.controllers.clear();
    }
}

// Export
window.PerformanceUtils = PerformanceUtils;
window.FetchController = FetchController;
window.fetchController = new FetchController();
