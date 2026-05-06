(function() {
    let currentVersion = null;
    const checkInterval = 3000; // Revisar cada 3 segundos (Ultra rápido)

    async function checkVersion() {
        // Probamos ambas rutas: absoluta (para servidores) y relativa (para archivos locales OBS)
        const paths = ['/version.json', '../version.json', './version.json'];
        
        for (let path of paths) {
            try {
                const res = await fetch(path + '?t=' + Date.now(), { cache: 'no-store' });
                if (!res.ok) continue;
                
                const data = await res.json();
                if (!data || !data.version) continue;

                if (currentVersion === null) {
                    currentVersion = data.version;
                    console.log("Sistema de Auto-Refresco Activo. Versión actual:", currentVersion);
                } else if (currentVersion !== data.version) {
                    console.log("¡Cambio detectado! Nueva versión:", data.version, "Recargando...");
                    // Pequeña pausa para asegurar que el servidor terminó de subir todo
                    setTimeout(() => window.location.reload(true), 500);
                    return;
                }
                break; // Si encontramos el archivo, no seguimos probando rutas
            } catch (e) {
                // Silencioso para no ensuciar la consola
            }
        }
    }

    setInterval(checkVersion, checkInterval);
    checkVersion();
})();
