async function loadLayout() {
    const headerHost = document.getElementById('header-placeholder');
    const footerHost = document.getElementById('footer-placeholder');
    const modalsHost = document.getElementById('auth-modals-placeholder');

    const fetchText = async (path) => {
        const res = await fetch(path, { cache: 'no-store' });
        if (!res.ok) return '';
        return await res.text();
    };

    const [headerHtml, footerHtml] = await Promise.all([
        headerHost ? fetchText('/components/header.html') : Promise.resolve(''),
        footerHost ? fetchText('/components/footer.html') : Promise.resolve('')
    ]);

    if (headerHost && headerHtml) headerHost.innerHTML = headerHtml;
    if (footerHost && footerHtml) footerHost.innerHTML = footerHtml;
    if (modalsHost) modalsHost.innerHTML = '';

    const pathName = (window.location.pathname || '/').toLowerCase();
    const hash = (window.location.hash || '').toLowerCase();
    document.querySelectorAll('#main-header .desktop-nav a').forEach(a => a.classList.remove('active'));
    if (pathName === '/' || pathName === '/index.html' || pathName === '/home') {
        if (hash === '#ranking' || hash.startsWith('#ranking')) {
            document.querySelectorAll('#main-header .nav-rankings').forEach(a => a.classList.add('active'));
        } else {
            document.querySelectorAll('#main-header .nav-home').forEach(a => a.classList.add('active'));
        }
    }
    if (pathName === '/ranking' || pathName === '/ranking.html') {
        document.querySelectorAll('#main-header .nav-rankings').forEach(a => a.classList.add('active'));
    }
    if (pathName === '/downloads' || pathName === '/downloads.html') {
        document.querySelectorAll('#main-header .nav-downloads').forEach(a => a.classList.add('active'));
    }
    if (pathName === '/auth' || pathName === '/auth.html' || pathName === '/register' || pathName === '/register.html' || pathName === '/login' || pathName === '/login.html') {
        document.querySelectorAll('#main-header .nav-register').forEach(a => a.classList.add('active'));
    }
    if (
        pathName === '/server-info' ||
        pathName === '/server-info.html' ||
        pathName === '/server-classes' ||
        pathName === '/server-classes.html' ||
        pathName === '/server-details' ||
        pathName === '/server-details.html' ||
        pathName === '/server-events' ||
        pathName === '/server-events.html' ||
        pathName === '/server-chaos-cards' ||
        pathName === '/server-chaos-cards.html' ||
        pathName === '/server-moss-special' ||
        pathName === '/server-moss-special.html' ||
        pathName === '/server-delgado-lucky-coins' ||
        pathName === '/server-delgado-lucky-coins.html' ||
        pathName === '/boss-rewards' ||
        pathName === '/invasion-rewards' ||
        pathName === '/info/server-info' ||
        pathName === '/info/server-info.html' ||
        pathName === '/info/server-classes' ||
        pathName === '/info/server-classes.html' ||
        pathName === '/info/server-details' ||
        pathName === '/info/server-details.html' ||
        pathName === '/info/server-events' ||
        pathName === '/info/server-events.html' ||
        pathName === '/info/server-chaos-cards' ||
        pathName === '/info/server-chaos-cards.html' ||
        pathName === '/info/server-moss-special' ||
        pathName === '/info/server-moss-special.html' ||
        pathName === '/info/server-delgado-lucky-coins' ||
        pathName === '/info/server-delgado-lucky-coins.html' ||
        pathName === '/info/boss-rewards' ||
        pathName === '/info/invasion-rewards'
    ) {
        document.querySelectorAll('#main-header .nav-server-info').forEach(a => a.classList.add('active'));
    }
    if (pathName === '/dashboard' || pathName === '/dashboard.html') {
        document.querySelectorAll('#main-header .nav-dashboard').forEach(a => a.classList.add('active'));
    }

    document.dispatchEvent(new CustomEvent('layout:loaded'));
}

function ensureGlobalBackgroundVideo() {
    const vids = document.querySelectorAll('video.hero-video[data-global-bg="1"], video.hero-video');
    vids.forEach(v => {
        try { v.pause(); } catch (e) {}
        try { v.removeAttribute('src'); } catch (e) {}
        try {
            const sources = v.querySelectorAll ? v.querySelectorAll('source') : [];
            sources.forEach(s => { try { s.remove(); } catch (e) {} });
        } catch (e) {}
        try { v.remove(); } catch (e) {}
    });
}

function scrubHashAndScrollOnReload() {
    try {
        if (window.history && 'scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
    } catch (e) {}

    const hasHash = typeof window.location.hash === 'string' && window.location.hash.length > 1;
    if (!hasHash) {
        try { window.scrollTo(0, 0); } catch (e) {}
        return;
    }

    let isReload = false;
    try {
        const nav = performance && typeof performance.getEntriesByType === 'function'
            ? performance.getEntriesByType('navigation')
            : [];
        const navType = nav && nav[0] && nav[0].type;
        isReload = navType === 'reload';
    } catch (e) {}

    try {
        if (!isReload && performance && performance.navigation) {
            isReload = performance.navigation.type === 1;
        }
    } catch (e) {}

    if (!isReload) return;

    try {
        const clean = window.location.pathname + window.location.search;
        window.history.replaceState(null, document.title, clean);
    } catch (e) {}

    try { window.scrollTo(0, 0); } catch (e) {}
}

document.addEventListener('DOMContentLoaded', () => {
    ensureGlobalBackgroundVideo();
    scrubHashAndScrollOnReload();
    window.__layoutPromise = loadLayout();
});

/* ========== PWA SERVICE WORKER REGISTRATION ========== */
// Service Worker disabled: do not register on page load.
// if ('serviceWorker' in navigator) {
//     window.addEventListener('load', () => {
//         navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
//             .then(registration => {
//                 console.log('PWA ServiceWorker registered with scope:', registration.scope);
//             })
//             .catch(err => {
//                 console.log('PWA ServiceWorker registration failed:', err);
//             });
//     });
// }

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
            console.log('PWA Service Workers unregistered');
        } catch (err) {
            console.warn('Service Worker unregister failed:', err);
        }
    });
}
