/**
 * Mu Neutro - Shared Data Manager
 * Centraliza las peticiones a la API para ahorrar recursos de CPU y Red.
 */

const DATA_CHANNEL = new BroadcastChannel('mu_neutro_stats');
const FETCH_INTERVAL = 15000; // 15 segundos entre actualizaciones
let isLeader = false;

// Intentar ser el "Líder" que hace las peticiones
function tryBecomeLeader() {
    const lastLeaderHeartbeat = localStorage.getItem('mu_stats_leader_heartbeat');
    const now = Date.now();

    // Si no hay líder o el líder no ha respondido en 20s, yo tomo el mando
    if (!lastLeaderHeartbeat || (now - parseInt(lastLeaderHeartbeat)) > 20000) {
        isLeader = true;
        localStorage.setItem('mu_stats_leader_heartbeat', now.toString());
        console.log("DataManager: He tomado el mando del fetch.");
        startFetching();
    }
}

async function fetchData() {
    if (!isLeader) return;

    try {
        const res = await fetch('/api/stats?t=' + Date.now());
        if (res.ok) {
            const data = await res.json();
            // Guardar en caché para nuevas pestañas que se abran
            localStorage.setItem('mu_stats_cache', JSON.stringify(data));
            // Avisar a todos los gadgets abiertos
            DATA_CHANNEL.postMessage({ type: 'UPDATE_STATS', data });
            // Actualizar latido de líder
            localStorage.setItem('mu_stats_leader_heartbeat', Date.now().toString());
        }
    } catch (e) {
        console.error("DataManager Error:", e);
    }
}

function startFetching() {
    fetchData();
    setInterval(() => {
        if (isLeader) {
            fetchData();
            localStorage.setItem('mu_stats_leader_heartbeat', Date.now().toString());
        }
    }, FETCH_INTERVAL);
}

// Escuchar si otro líder aparece (raro, pero posible al recargar)
DATA_CHANNEL.onmessage = (event) => {
    if (event.data.type === 'UPDATE_STATS' && isLeader) {
        // Si ya hay alguien enviando datos y yo creía ser el líder, cedo el puesto
        console.log("DataManager: Otro líder detectado, cedo el mando.");
        isLeader = false;
    }
};

// Al iniciar
tryBecomeLeader();
// Si no soy líder, reviso cada 10s si el líder actual murió
setInterval(() => {
    if (!isLeader) tryBecomeLeader();
}, 10000);

// Función global para que los gadgets se suscriban fácilmente
window.onMuData = (callback) => {
    // 1. Enviar datos del caché inmediatamente si existen
    const cache = localStorage.getItem('mu_stats_cache');
    if (cache) callback(JSON.parse(cache));

    // 2. Escuchar futuras actualizaciones
    DATA_CHANNEL.addEventListener('message', (event) => {
        if (event.data.type === 'UPDATE_STATS') {
            callback(event.data.data);
        }
    });
};
