/**
 * Web Vitals & Performance Monitoring
 * Tracking LCP, FID, CLS, FCP metrics
 */

class WebVitalsMonitor {
    constructor() {
        this.metrics = {};
        this.observers = [];
    }

    /**
     * Inicializar monitoreo de Web Vitals
     */
    init() {
        this.trackLCP();
        this.trackFCP();
        this.trackCLS();
        this.trackFID();
        this.trackPageLoadTime();
        this.trackResourceTiming();
    }

    /**
     * Largest Contentful Paint (LCP)
     * Meta buena: < 2.5s
     */
    trackLCP() {
        if (!('PerformanceObserver' in window)) return;

        try {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                this.metrics.LCP = {
                    value: lastEntry.renderTime || lastEntry.loadTime,
                    element: lastEntry.element,
                    timestamp: lastEntry.startTime
                };

                if (this.metrics.LCP.value > 2500) {
                    if (window.AppLogger) {
                        window.AppLogger.warn('LCP exceeds 2.5s', this.metrics.LCP);
                    }
                }
            });

            observer.observe({ entryTypes: ['largest-contentful-paint'] });
            this.observers.push(observer);
        } catch (error) {
            if (window.AppLogger) {
                window.AppLogger.debug('LCP monitoring failed', error);
            }
        }
    }

    /**
     * First Contentful Paint (FCP)
     * Meta buena: < 1.8s
     */
    trackFCP() {
        if (!('PerformanceObserver' in window)) return;

        try {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                for (const entry of entries) {
                    if (entry.name === 'first-contentful-paint') {
                        this.metrics.FCP = {
                            value: entry.startTime,
                            timestamp: Date.now()
                        };

                        if (this.metrics.FCP.value > 1800) {
                            if (window.AppLogger) {
                                window.AppLogger.warn('FCP exceeds 1.8s', this.metrics.FCP);
                            }
                        }
                    }
                }
            });

            observer.observe({ entryTypes: ['paint'] });
            this.observers.push(observer);
        } catch (error) {
            if (window.AppLogger) {
                window.AppLogger.debug('FCP monitoring failed', error);
            }
        }
    }

    /**
     * Cumulative Layout Shift (CLS)
     * Meta buena: < 0.1
     */
    trackCLS() {
        if (!('PerformanceObserver' in window)) return;

        let clsValue = 0;
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                        this.metrics.CLS = {
                            value: clsValue,
                            entries: list.getEntries()
                        };

                        if (clsValue > 0.1) {
                            if (window.AppLogger) {
                                window.AppLogger.warn('CLS exceeds 0.1', this.metrics.CLS);
                            }
                        }
                    }
                }
            });

            observer.observe({ entryTypes: ['layout-shift'] });
            this.observers.push(observer);
        } catch (error) {
            if (window.AppLogger) {
                window.AppLogger.debug('CLS monitoring failed', error);
            }
        }
    }

    /**
     * First Input Delay (FID)
     * Meta buena: < 100ms
     */
    trackFID() {
        if (!('PerformanceObserver' in window)) return;

        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.metrics.FID = {
                        value: entry.processingDuration,
                        timestamp: entry.startTime
                    };

                    if (entry.processingDuration > 100) {
                        if (window.AppLogger) {
                            window.AppLogger.warn('FID exceeds 100ms', this.metrics.FID);
                        }
                    }
                }
            });

            observer.observe({ entryTypes: ['first-input'] });
            this.observers.push(observer);
        } catch (error) {
            if (window.AppLogger) {
                window.AppLogger.debug('FID monitoring failed', error);
            }
        }
    }

    /**
     * Page Load Time (incluyendo recursos)
     */
    trackPageLoadTime() {
        window.addEventListener('load', () => {
            const perfData = window.performance.timing;
            const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;

            this.metrics.PageLoadTime = {
                total: pageLoadTime,
                domInteractive: perfData.domInteractive - perfData.navigationStart,
                domComplete: perfData.domComplete - perfData.navigationStart,
                resourcesLoaded: perfData.loadEventEnd - perfData.responseEnd
            };

            if (window.AppLogger) {
                window.AppLogger.info('Page load time', this.metrics.PageLoadTime);
            }
        });
    }

    /**
     * Resource Timing - cargas de recursos
     */
    trackResourceTiming() {
        if (!('PerformanceObserver' in window)) return;

        try {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                this.metrics.Resources = entries.map(entry => ({
                    name: entry.name.split('/').pop(),
                    duration: entry.duration,
                    size: entry.transferSize || 0,
                    type: entry.initiatorType
                }));
            });

            observer.observe({ entryTypes: ['resource'] });
            this.observers.push(observer);
        } catch (error) {
            if (window.AppLogger) {
                window.AppLogger.debug('Resource timing failed', error);
            }
        }
    }

    /**
     * Obtener todos los metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }

    /**
     * Obtener resumen de performance
     */
    getSummary() {
        const lcp = this.metrics.LCP?.value || 0;
        const fcp = this.metrics.FCP?.value || 0;
        const cls = this.metrics.CLS?.value || 0;

        return {
            LCP: {
                value: Math.round(lcp),
                status: lcp < 2500 ? '✅' : '⚠️'
            },
            FCP: {
                value: Math.round(fcp),
                status: fcp < 1800 ? '✅' : '⚠️'
            },
            CLS: {
                value: cls.toFixed(3),
                status: cls < 0.1 ? '✅' : '⚠️'
            }
        };
    }

    /**
     * Reporting de metrics
     */
    reportMetrics() {
        const summary = this.getSummary();
        if (window.AppLogger) {
            window.AppLogger.info('Web Vitals Summary', summary);
        }
        return summary;
    }

    /**
     * Limpiar observers
     */
    cleanup() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
    }
}

// Función para monitorear Long Tasks
function trackLongTasks() {
    if (!('PerformanceObserver' in window)) return;

    try {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (window.AppLogger) {
                    window.AppLogger.warn('Long task detected', {
                        duration: entry.duration,
                        name: entry.name,
                        attribution: entry.attribution
                    });
                }
            }
        });

        observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
        if (window.AppLogger) {
            window.AppLogger.debug('Long tasks monitoring not available', error);
        }
    }
}

// Función para monitorear memory usage
function trackMemoryUsage() {
    if (!('memory' in performance)) return;

    try {
        setInterval(() => {
            const mem = performance.memory;
            if (mem) {
                const usagePercent = (mem.usedJSHeapSize / mem.jsHeapSizeLimit * 100).toFixed(2);

                // Alerta si uso > 90%
                if (usagePercent > 90) {
                    if (window.AppLogger) {
                        window.AppLogger.warn(`Memory usage high: ${usagePercent}%`);
                    }
                }
            }
        }, 5000);
    } catch (error) {
        if (window.AppLogger) {
            window.AppLogger.debug('Memory tracking failed', error);
        }
    }
}

// Crear instancia global
window.vitalsMonitor = new WebVitalsMonitor();

// Auto-inicializar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.vitalsMonitor.init();
        trackLongTasks();
        trackMemoryUsage();
    });
} else {
    window.vitalsMonitor.init();
    trackLongTasks();
    trackMemoryUsage();
}

// Export
window.WebVitalsMonitor = WebVitalsMonitor;
window.trackLongTasks = trackLongTasks;
window.trackMemoryUsage = trackMemoryUsage;
