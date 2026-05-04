/**
 * Advanced Caching Module
 * IndexedDB + LocalStorage + sessionStorage strategy
 */

class CacheManager {
    constructor(dbName = 'AppCache', version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
        this.ready = this.initDB();
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('cache')) {
                    db.createObjectStore('cache', { keyPath: 'key' });
                }
                if (!db.objectStoreNames.contains('api-responses')) {
                    db.createObjectStore('api-responses', { keyPath: 'url' });
                }
            };
        });
    }

    /**
     * Guardar en IndexedDB (para datos grandes)
     */
    async setIndexedDB(key, value, ttl = null) {
        try {
            await this.ready;
            const entry = {
                key,
                value,
                timestamp: Date.now(),
                expires: ttl ? Date.now() + ttl : null
            };

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['cache'], 'readwrite');
                const store = transaction.objectStore('cache');
                const request = store.put(entry);

                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(entry);
            });
        } catch (error) {
            if (window.AppLogger) {
                window.AppLogger.warn(`IndexedDB set failed for ${key}`, error);
            }
        }
    }

    /**
     * Obtener de IndexedDB
     */
    async getIndexedDB(key) {
        try {
            await this.ready;
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['cache'], 'readonly');
                const store = transaction.objectStore('cache');
                const request = store.get(key);

                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const entry = request.result;
                    if (!entry) {
                        resolve(null);
                        return;
                    }

                    // Verificar TTL
                    if (entry.expires && entry.expires < Date.now()) {
                        this.deleteIndexedDB(key);
                        resolve(null);
                        return;
                    }

                    resolve(entry.value);
                };
            });
        } catch (error) {
            if (window.AppLogger) {
                window.AppLogger.warn(`IndexedDB get failed for ${key}`, error);
            }
            return null;
        }
    }

    /**
     * Borrar de IndexedDB
     */
    async deleteIndexedDB(key) {
        try {
            await this.ready;
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['cache'], 'readwrite');
                const store = transaction.objectStore('cache');
                const request = store.delete(key);

                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve();
            });
        } catch (error) {
            if (window.AppLogger) {
                window.AppLogger.warn(`IndexedDB delete failed for ${key}`, error);
            }
        }
    }

    /**
     * Cachear respuesta de API
     */
    async cacheAPIResponse(url, response, ttl = 5 * 60 * 1000) {
        try {
            await this.ready;
            const entry = {
                url,
                response,
                timestamp: Date.now(),
                expires: Date.now() + ttl
            };

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['api-responses'], 'readwrite');
                const store = transaction.objectStore('api-responses');
                const request = store.put(entry);

                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve();
            });
        } catch (error) {
            if (window.AppLogger) {
                window.AppLogger.warn(`Cache API response failed for ${url}`, error);
            }
        }
    }

    /**
     * Obtener respuesta de API cacheada
     */
    async getAPIResponse(url) {
        try {
            await this.ready;
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['api-responses'], 'readonly');
                const store = transaction.objectStore('api-responses');
                const request = store.get(url);

                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const entry = request.result;
                    if (!entry) {
                        resolve(null);
                        return;
                    }

                    // Verificar TTL
                    if (entry.expires < Date.now()) {
                        this.deleteAPIResponse(url);
                        resolve(null);
                        return;
                    }

                    resolve(entry.response);
                };
            });
        } catch (error) {
            if (window.AppLogger) {
                window.AppLogger.warn(`Get API response failed for ${url}`, error);
            }
            return null;
        }
    }

    /**
     * Borrar respuesta de API
     */
    async deleteAPIResponse(url) {
        try {
            await this.ready;
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['api-responses'], 'readwrite');
                const store = transaction.objectStore('api-responses');
                const request = store.delete(url);

                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve();
            });
        } catch (error) {
            if (window.AppLogger) {
                window.AppLogger.warn(`Delete API response failed for ${url}`, error);
            }
        }
    }

    /**
     * Limpiar cache expirado
     */
    async cleanup() {
        try {
            await this.ready;
            const now = Date.now();
            const stores = ['cache', 'api-responses'];

            for (const storeName of stores) {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();

                request.onsuccess = () => {
                    const entries = request.result;
                    entries.forEach(entry => {
                        if (entry.expires && entry.expires < now) {
                            store.delete(entry.key || entry.url);
                        }
                    });
                };
            }
        } catch (error) {
            if (window.AppLogger) {
                window.AppLogger.warn('Cache cleanup failed', error);
            }
        }
    }

    /**
     * LocalStorage helpers con validación
     */
    static setLocalStorage(key, value, ttl = null) {
        try {
            const entry = {
                value,
                timestamp: Date.now(),
                expires: ttl ? Date.now() + ttl : null
            };
            localStorage.setItem(key, JSON.stringify(entry));
        } catch (error) {
            if (window.AppLogger) {
                window.AppLogger.warn(`LocalStorage set failed for ${key}`, error);
            }
        }
    }

    /**
     * Obtener de LocalStorage con validación de TTL
     */
    static getLocalStorage(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;

            const entry = JSON.parse(raw);
            if (entry.expires && entry.expires < Date.now()) {
                localStorage.removeItem(key);
                return null;
            }

            return entry.value;
        } catch (error) {
            if (window.AppLogger) {
                window.AppLogger.warn(`LocalStorage get failed for ${key}`, error);
            }
            return null;
        }
    }

    /**
     * SessionStorage para datos temporales
     */
    static setSessionStorage(key, value) {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            if (window.AppLogger) {
                window.AppLogger.warn(`SessionStorage set failed for ${key}`, error);
            }
        }
    }

    static getSessionStorage(key) {
        try {
            const raw = sessionStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            if (window.AppLogger) {
                window.AppLogger.warn(`SessionStorage get failed for ${key}`, error);
            }
            return null;
        }
    }
}

// Crear instancia global
window.cacheManager = new CacheManager();

// Export
window.CacheManager = CacheManager;
