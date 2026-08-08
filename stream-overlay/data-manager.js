/**
 * Mu Olimpo - Shared Data Manager (Versión Robusta)
 * Centraliza las peticiones a la API para ahorrar recursos de CPU y Red.
 */

const FETCH_INTERVAL = 15000;
const DATA_KEY = 'mu_stats_cache';
const TIME_KEY = 'mu_stats_last_fetch';

async function updateStats() {
    const now = Date.now();
    const lastFetch = localStorage.getItem(TIME_KEY);

    // Si los datos tienen menos de 10 segundos, no molestamos al servidor
    // Esto evita que si abres 5 gadgets a la vez, los 5 peguen al servidor al mismo tiempo
    if (lastFetch && (now - parseInt(lastFetch)) < 10000) {
        console.log("DataManager: Datos frescos en caché, saltando fetch.");
        return; 
    }

    try {
        const res = await fetch('/api/stats?t=' + now);
        if (res.ok) {
            const data = await res.json();
            localStorage.setItem(DATA_KEY, JSON.stringify(data));
            localStorage.setItem(TIME_KEY, Date.now().toString());
            
            // Avisar a esta pestaña
            window.dispatchEvent(new CustomEvent('mu-data-updated', { detail: data }));
            console.log("DataManager: Datos actualizados y notificados.");
        }
    } catch (e) {
        console.error("DataManager Error:", e);
    }
}

// Función global para que los gadgets se suscriban fácilmente
window.onMuData = (callback) => {
    // 1. Carga inmediata del caché si existe
    const cache = localStorage.getItem(DATA_KEY);
    if (cache) {
        try { 
            callback(JSON.parse(cache)); 
        } catch(e) {
            console.error("DataManager Cache Error:", e);
        }
    }

    // 2. Escuchar actualizaciones locales (mismo proceso/pestaña)
    window.addEventListener('mu-data-updated', (e) => callback(e.detail));

    // 3. Escuchar actualizaciones de OTRAS pestañas (vía localStorage)
    window.addEventListener('storage', (e) => {
        if (e.key === DATA_KEY && e.newValue) {
            try {
                callback(JSON.parse(e.newValue));
            } catch(err) {}
        }
    });

    // 4. Intentar actualizar ahora mismo (la función decidirá si hace fetch o usa caché)
    updateStats();
};

// Intervalo de revisión global
setInterval(updateStats, FETCH_INTERVAL);
