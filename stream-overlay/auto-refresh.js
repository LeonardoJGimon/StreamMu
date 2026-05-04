(function() {
    let currentVersion = null;
    const checkInterval = 10000; // Revisar cada 10 segundos

    async function checkVersion() {
        try {
            const res = await fetch('/version.json?t=' + Date.now());
            if (!res.ok) return;
            const data = await res.json();
            
            if (currentVersion === null) {
                currentVersion = data.version;
            } else if (currentVersion !== data.version) {
                console.log("Nueva versión detectada. Recargando...");
                window.location.reload();
            }
        } catch (e) {
            console.error("Error al revisar versión:", e);
        }
    }

    setInterval(checkVersion, checkInterval);
    checkVersion();
})();
