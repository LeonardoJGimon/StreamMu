(function() {
    let currentVersion = null;
    const checkInterval = 3000;
    // Obtenemos el nombre del archivo actual (ej: ranking.html)
    const myName = window.location.pathname.split('/').pop() || 'index.html';

    async function checkVersion() {
        const paths = ['/version.json', '../version.json', './version.json'];
        
        for (let path of paths) {
            try {
                const res = await fetch(path + '?t=' + Date.now(), { cache: 'no-store' });
                if (!res.ok) continue;
                
                const data = await res.json();
                if (!data) continue;

                // Buscamos la versión específica de este archivo o la global
                const newVersion = data[myName] || data.global || null;

                if (currentVersion === null) {
                    currentVersion = newVersion;
                    console.log(`Sistema de Auto-Refresco Activo para ${myName}. Versión actual:`, currentVersion);
                } else if (newVersion && currentVersion !== newVersion) {
                    console.log(`[${myName}] Nueva versión detectada: ${newVersion}. Recargando...`);
                    setTimeout(() => window.location.reload(true), 500);
                    return;
                }
                break;
            } catch (e) {
                // Silencioso para no ensuciar la consola
            }
        }
    }

    setInterval(checkVersion, checkInterval);
    checkVersion();
})();
