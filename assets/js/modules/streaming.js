/**
 * Streaming Widget Module
 * Manages Twitch, YouTube, Kick, and TikTok streaming displays
 */

let twitchScriptLoaded = false;
let tiktokEmbedScriptLoaded = false;
let streamRefreshInterval = null;

function loadTwitchScript() {
    return new Promise((resolve, reject) => {
        if (twitchScriptLoaded) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://embed.twitch.tv/embed/v1.js';
        script.onload = () => { twitchScriptLoaded = true; resolve(); };
        script.onerror = (e) => reject(e);
        document.head.appendChild(script);
    });
}

function loadTikTokEmbedScript() {
    return new Promise((resolve) => {
        if (tiktokEmbedScriptLoaded) { resolve(true); return; }
        const s = document.createElement('script');
        s.src = 'https://www.tiktok.com/embed.js';
        s.async = true;
        s.onload = () => { tiktokEmbedScriptLoaded = true; resolve(true); };
        s.onerror = () => resolve(false);
        document.head.appendChild(s);
    });
}

async function fetchAndRenderLiveStreamers() {
    const serverType = localStorage.getItem('selectedServer');
    if (!serverType) return;

    const listElement = document.getElementById('streaming-list');
    const widgetContainer = document.getElementById('streaming-widget-container');
    const avatarsBar = document.getElementById('streaming-avatars-bar');
    if (!listElement || !widgetContainer) return;

    try {
        const response = await fetch(`${window.API_BASE_URL}/streaming/live-list?serverType=${encodeURIComponent(serverType)}`);
        if (!response.ok) throw new Error();
        const data = await response.json();
        const streams = Array.isArray(data) ? data : (data.liveStreamers || []);

        if (!streams.length) {
            widgetContainer.style.display = 'none';
            widgetContainer.classList.remove('expanded');
            return;
        }

        widgetContainer.style.display = 'flex';

        listElement.innerHTML = streams.map(s => {
            let platformVal = 'Twitch';
            if (s.platform && s.platform.toLowerCase() === 'youtube') platformVal = 'YouTube';
            if (s.platform && s.platform.toLowerCase() === 'kick') platformVal = 'Kick';
            if (s.platform && s.platform.toLowerCase() === 'tiktok') platformVal = 'TikTok';
            const nameToShow = s.displayName || s.channelId || 'Streamer';
            const titleHtml = window.renderStreamTitleWithCode(s.title || '');
            return `
            <div class="stream-item"
                 data-channel-id="${s.channelId || ''}"
                 data-platform="${platformVal}"
                 data-name="${String(nameToShow).replace(/"/g, '&quot;')}"
                 data-title="${window.escapeHtml(String(s.title || ''))}"
                 data-url="${s.watchUrl || ''}"
                 data-embed-url="${s.embedUrl || ''}"
                 data-account-id="${s.accountId || ''}"
                 data-server-type="${s.serverType || serverType || ''}">
                <div class="stream-avatar"><img src="${s.profileImageUrl || 'assets/icon/icon.png'}" referrerpolicy="no-referrer" crossorigin="anonymous"></div>
                <div class="stream-info">
                    <div class="stream-info-name">${window.escapeHtml(nameToShow)}</div>
                    <div class="stream-info-title">${titleHtml}</div>
                </div>
                <div class="stream-live-details">${window.escapeHtml(String(s.viewerCount || 0))}</div>
            </div>`;
        }).join('');

        if (avatarsBar) {
            const maxAvatars = 4;
            avatarsBar.innerHTML = streams.slice(0, maxAvatars).map(s => {
                let platformVal = 'Twitch';
                if (s.platform && s.platform.toLowerCase() === 'youtube') platformVal = 'YouTube';
                if (s.platform && s.platform.toLowerCase() === 'kick') platformVal = 'Kick';
                if (s.platform && s.platform.toLowerCase() === 'tiktok') platformVal = 'TikTok';
                const nameToShow = s.displayName || s.channelId || 'Streamer';
                const fallbackAvatar = 'assets/icon/icon.png';
                const avatar = s.profileImageUrl || s.thumbnailUrl || fallbackAvatar;
                const isLive = !!s.isLive;
                return `
                <button class="streaming-avatar-btn" type="button"
                    title="${window.escapeHtml(String(nameToShow))}"
                    data-channel-id="${s.channelId || ''}"
                    data-platform="${platformVal}"
                    data-name="${window.escapeHtml(String(nameToShow))}"
                    data-title="${window.escapeHtml(String(s.title || ''))}"
                    data-url="${window.escapeHtml(String(s.watchUrl || s.url || ''))}"
                    data-embed-url="${window.escapeHtml(String(s.embedUrl || ''))}"
                    data-account-id="${window.escapeHtml(String(s.accountId || ''))}"
                    data-server-type="${window.escapeHtml(String(s.serverType || serverType || ''))}">
                    <span style="position:relative; display:block; width:46px; height:46px;">
                        <img src="${window.escapeHtml(String(avatar))}" alt="${window.escapeHtml(String(nameToShow))}" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.onerror=null;this.src='${fallbackAvatar}';" style="width:46px; height:46px; border-radius: 999px; object-fit: cover;" />
                        ${isLive ? '<span style="position:absolute; right:-2px; bottom:-2px; padding:2px 6px; font-size: 10px; line-height: 1; font-weight: 800; background:#ef4444; color:#fff; border-radius: 999px; border: 2px solid rgba(0,0,0,0.6);">LIVE</span>' : ''}
                    </span>
                </button>`;
            }).join('');

            try { window.initCardTiltEffect(widgetContainer); } catch (e) {}
        }
    } catch (e) {
        widgetContainer.style.display = 'none';
        widgetContainer.classList.remove('expanded');
    }
}

function startStreamRefresh() {
    stopStreamRefresh();
    fetchAndRenderLiveStreamers();
    streamRefreshInterval = setInterval(fetchAndRenderLiveStreamers, 120000);
}

function stopStreamRefresh() {
    if (streamRefreshInterval) clearInterval(streamRefreshInterval);
}

// Export for use
window.StreamingModule = {
    loadTwitchScript,
    loadTikTokEmbedScript,
    fetchAndRenderLiveStreamers,
    startStreamRefresh,
    stopStreamRefresh
};
