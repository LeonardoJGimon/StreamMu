// Forzar recarga de FontAwesome si no está presente
function ensureFontAwesome() {
    const faId = 'forced-fontawesome';
    if (!document.getElementById(faId)) {
        const link = document.createElement('link');
        link.id = faId;
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
        document.head.appendChild(link);
    }
}
ensureFontAwesome();
// Idiomas disponibles detectados automáticamente (de assets/lang/*.json)



const API_BASE_URL = window.location.origin;
let PUBLIC_INFO = {
    serverName: '',
    season: '',
    discordGuildId: '1457759712975130690',
    discordInviteUrl: 'https://discord.gg/WMvfF8TZr4',
    facebookUrl: '',
    youtubeUrl: '',
};

let streamRefreshInterval = null;
let streamVisibilityBound = false;
let twitchScriptLoaded = false;
let hasAutoExpanded = false;
let __heroAnnouncementInterval = null;

let __i18nLang = (localStorage.getItem('selectedLang') || 'en').toString().trim().toLowerCase() || 'en';
let __i18nDict = {};
let __i18nFallbackDict = {};
let __i18nPromise = null;
const I18N_CACHE_VERSION = '2026-03-28-1';

function ensurePromoPopupModal() {
    let modal = document.getElementById('promoPopupModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'promoPopupModal';
    modal.className = 'promo-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.hidden = true;

    modal.innerHTML = `
        <div class="promo-modal__backdrop" data-action="close"></div>
        <div class="promo-modal__panel promo-modal--split" role="document">
            <div class="promo-modal__border-glow"></div>
            <div class="promo-modal__vfx" id="promo-modal-vfx"></div>
            <button class="promo-modal__close" type="button" aria-label="Close" data-action="close">
                <i class="fas fa-times"></i>
            </button>
            <div class="promo-modal__timer-banner" id="promo-modal-timer-banner" hidden>
                <i class="fas fa-bolt"></i>
                <span data-i18n="promo.expires_in">TERMINA EN:</span>
                <strong id="promo-modal-timer-value">00:00:00</strong>
            </div>
            
            <!-- TOP HALF: ART (Now with Random Video Support) -->
            <div class="promo-modal__art-section" id="promo-modal-art">
                <video id="promo-modal-video" class="promo-modal__video-bg" autoplay muted loop playsinline></video>
                <div class="promo-modal__art-overlay"></div>
            </div>


            <!-- BOTTOM HALF: INFO & ACTIONS -->
            <div class="promo-modal__info-section">
                <div class="promo-modal__logo-wrap">
                    <img src="https://i.imgur.com/eQpu3kn.png" onerror="this.src='/assets/images/logo/logosimple.png'" class="promo-modal__logo-img" alt="Server Logo" />
                </div>
                <div class="promo-modal__badge" id="promo-modal-badge" hidden></div>
                <div class="promo-modal__title" id="promo-modal-title" hidden></div>
                <div class="promo-modal__subtitle" id="promo-modal-subtitle" hidden></div>

                <div class="promo-modal__rarity" id="promo-modal-rarity" hidden>
                    <div class="rarity-head">
                        <i class="fas fa-fire"></i>
                        <label id="promo-modal-rarity-label">STOCK LIMITADO</label>
                    </div>
                    <div class="rarity-bar"><div class="rarity-bar-fill" id="promo-modal-rarity-fill"></div></div>
                </div>
                
                <div class="promo-modal__grid-container">
                    <div class="promo-modal__lines" id="promo-modal-lines" hidden></div>
                </div>

                <div class="promo-modal__actions">
                    <a class="btn-promo btn-promo--primary" id="promo-modal-cta" href="/auth.html#register"><i class="fas fa-play"></i> REGÍSTRATE AHORA</a>
                    <a class="btn-promo btn-promo--discord" id="promo-modal-discord" target="_blank" rel="noopener noreferrer"><i class="fab fa-discord"></i> DISCORD</a>
                </div>

                <div class="promo-modal__small-print" id="promo-modal-small-print">
                    Speed characters can be transferred after the event ends.
                </div>

                <div class="promo-modal__footer-simple">
                    <label class="promo-modal__dont">
                        <input id="promo-modal-dont" type="checkbox" />
                        <span class="promo-modal__switch">
                            <span class="promo-modal__switch-track"></span>
                            <span class="promo-modal__switch-thumb"></span>
                        </span>
                        <span class="promo-modal__dont-text">No mostrar por 24 horas</span>
                    </label>
                </div>
            </div>
        </div>
    `.trim();


    document.body.appendChild(modal);
    return modal;
}

function tryShowIndexPromoPopup() {
    try {
        if (!document.body || !document.body.classList.contains('page-home')) return;

        const events = (PUBLIC_INFO && Array.isArray(PUBLIC_INFO.events)) ? PUBLIC_INFO.events : [];
        const list = events.filter(e => e && e.enabled);
        if (!list.length) return;

        const pick = list[0];
        const id = (pick.id || '').toString().trim();
        if (!id) return;

        const dismissHours = Number(pick.dismissHours || 24);
        const key = `promoPopupDismissUntil:${id}`;
        const until = Number(localStorage.getItem(key) || 0);
        if (Number.isFinite(until) && until > Date.now()) return;

        const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[c] || c));

        const modal = ensurePromoPopupModal();
        const art = document.getElementById('promo-modal-art');
        const badgeEl = document.getElementById('promo-modal-badge');
        const titleEl = document.getElementById('promo-modal-title');
        const subEl = document.getElementById('promo-modal-subtitle');
        const linesEl = document.getElementById('promo-modal-lines');
        const dont = document.getElementById('promo-modal-dont');
        const cta = document.getElementById('promo-modal-cta');
        const discordBtn = document.getElementById('promo-modal-discord');
        if (!art || !cta || !dont || !badgeEl || !titleEl || !subEl || !linesEl || !discordBtn) return;


        const timerBanner = document.getElementById('promo-modal-timer-banner');
        const timerValue = document.getElementById('promo-modal-timer-value');
        const rarityEl = document.getElementById('promo-modal-rarity');
        const rarityLabel = document.getElementById('promo-modal-rarity-label');
        const rarityFill = document.getElementById('promo-modal-rarity-fill');
        const vfx = document.getElementById('promo-modal-vfx');

        // Reset & Generate VFX (Embers/Aura)
        if (vfx) {
            vfx.innerHTML = '';
            for(let i=0; i<40; i++) {
                const p = document.createElement('span');
                p.className = 'vfx-particle';
                const size = Math.random() * 4 + 2;
                p.style.width = size + 'px';
                p.style.height = size + 'px';
                p.style.left = Math.random() * 100 + '%';
                p.style.animationDelay = (Math.random() * 4) + 's';
                p.style.animationDuration = (3 + Math.random() * 5) + 's';
                p.style.setProperty('--tx', (Math.random() * 100 - 50) + 'px');
                vfx.appendChild(p);
            }
        }

        const videoEl = document.getElementById('promo-modal-video');
        const videoList = [
            { src: 'https://originmu.com/public/assets/classic/images/speed-server/loop_crusader.webm', type: 'video/webm' }
        ];

        const img = (pick.imageUrl || '').toString().trim();
        if (art) {
            art.style.backgroundImage = img ? `url('${img.replace(/'/g, "\\'")}')` : '';
        }

        if (videoEl) {
            const chosenVideo = videoList[Math.floor(Math.random() * videoList.length)];
            
            videoEl.style.display = 'block';
            videoEl.style.opacity = '1';
            videoEl.style.zIndex = '5'; // Subir z-index para estar sobre la imagen
            
            // Si el video falla, mostramos la imagen. Si funciona, ocultamos la imagen para que el video sea transparente si lo es.
            videoEl.src = chosenVideo.src;
            videoEl.muted = true;
            videoEl.autoplay = true;
            videoEl.loop = true;
            videoEl.playsInline = true;

            const playPromise = videoEl.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    // Si reproduce, ocultamos la imagen de arte para ver el video perfectamente
                    if (art) art.style.backgroundImage = 'none';
                }).catch(e => {
                    console.error("Video play failed:", e);
                    videoEl.style.display = 'none';
                    if (art) art.style.backgroundImage = img ? `url('${img.replace(/'/g, "\\'")}')` : '';
                });
            }
        }


        const badge = (pick.badge || '').toString().trim();
        const title = (pick.title || '').toString().trim();
        const subtitle = (pick.subtitle || '').toString().trim();
        const lines = Array.isArray(pick.lines) ? pick.lines : [];

        if (badgeEl) {
            badgeEl.hidden = !badge;
            badgeEl.innerHTML = badge ? esc(badge) : '';
        }

        if (titleEl) {
            titleEl.hidden = !title;
            titleEl.innerHTML = title ? esc(title) : '';
        }

        if (subEl) {
            subEl.hidden = !subtitle;
            subEl.innerHTML = subtitle ? esc(subtitle) : '';
        }

        // Timer Logic
        let timerInterval = null;
        const expiresAt = pick.expiresAt ? new Date(pick.expiresAt).getTime() : 0;
        if (expiresAt > Date.now() && timerBanner && timerValue) {
            timerBanner.hidden = false;
            const updateTimer = () => {
                const diff = expiresAt - Date.now();
                if (diff <= 0) {
                    timerValue.textContent = '00:00:00';
                    clearInterval(timerInterval);
                    return;
                }
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                timerValue.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            };
            updateTimer();
            timerInterval = setInterval(updateTimer, 1000);
        } else if (timerBanner) {
            timerBanner.hidden = true;
        }

        // Rarity / Stock Logic
        const stock = (pick.stockPercent !== undefined) ? Number(pick.stockPercent) : -1;
        if (stock >= 0 && rarityEl && rarityFill && rarityLabel) {
            rarityEl.hidden = false;
            rarityFill.style.width = stock + '%';
            rarityLabel.textContent = pick.rarityLabel || `${stock}% DE STOCK RESTANTE`;
        } else if (rarityEl) {
            rarityEl.hidden = true;
        }


        const renderIcon = (icon, text) => {
            if (!icon) {
                const t = (text || '').toLowerCase();
                if (t.includes('vip')) icon = 'fas fa-crown';
                else if (t.includes('wing')) icon = 'fas fa-feather-pointed';
                else if (t.includes('pet') || t.includes('montable')) icon = 'fas fa-dog';
                else if (t.includes('box') || t.includes('pack')) icon = 'fas fa-gift';
                else if (t.includes('zen') || t.includes('coin')) icon = 'fas fa-coins';
                else icon = 'fas fa-star';
            }
            if (icon.includes('.') || icon.includes('/') || icon.startsWith('http')) {
                return `<img src="${esc(icon)}" class="line-icon" alt="" />`;
            }
            return `<i class="${esc(icon)} line-icon"></i>`;
        };

        const safeLines = lines
            .map(v => (typeof v === 'string' ? { text: v } : v))
            .filter(v => v && v.text)
            .slice(0, 10);
        
        linesEl.hidden = !safeLines.length;
        linesEl.innerHTML = safeLines.length
            ? `<ul class="promo-modal__minimal-list">${safeLines.map((x, i) => {
                const label = esc(x.text);
                return `
                <li class="minimal-list-item" style="animation-delay: ${0.5 + (i * 0.15)}s">
                    <div class="minimal-list-item__icon">${renderIcon(x.icon, x.text)}</div>
                    <div class="minimal-list-item__label">${label}</div>
                </li>`}).join('')}</ul>`
            : '';

        if (cta) {
            const url = (pick.linkUrl || '').toString().trim();
            // Siempre aseguramos que haya un enlace, priorizando /auth.html#register si no hay uno personalizado
            cta.setAttribute('href', url || '/auth.html#register');
            cta.innerHTML = `<i class="fas fa-play"></i> ${esc(pick.ctaText || 'REGÍSTRATE AHORA')}`;
            cta.style.display = 'inline-flex'; // Siempre visible
        }

        if (discordBtn) {
            discordBtn.href = PUBLIC_INFO.discordInviteUrl || 'https://discord.gg/WMvfF8TZr4';
        }

        const smallPrintEl = document.getElementById('promo-modal-small-print');
        if (smallPrintEl) {
            smallPrintEl.textContent = pick.smallPrint || 'Terms and conditions apply.';
        }

        dont.checked = false;


        const close = () => {
            modal.hidden = true;
            modal.classList.remove('is-open');
            if (timerInterval) clearInterval(timerInterval);
            if (dont.checked) {
                const ms = Math.max(1, dismissHours) * 60 * 60 * 1000;
                localStorage.setItem(key, String(Date.now() + ms));
            }
            cleanup();
        };

        const onClick = (e) => {
            const btn = e.target && e.target.closest ? e.target.closest('[data-action="close"]') : null;
            if (btn) close();
        };

        const onKey = (e) => {
            if (e.key === 'Escape') close();
        };

        const cleanup = () => {
            modal.removeEventListener('click', onClick);
            document.removeEventListener('keydown', onKey);
        };

        modal.addEventListener('click', onClick);
        document.addEventListener('keydown', onKey);
        modal.hidden = false;
        modal.classList.add('is-open');
    } catch (e) {
        console.error("Promo error:", e);
    }
}



function renderLauncherFeatureCards(servers, selectedServer) {
        const ensureFeatureInfoModal = () => {
            let modal = document.getElementById('featureInfoModal');
            if (modal) return modal;

            modal = document.createElement('div');
            modal.id = 'featureInfoModal';
            modal.className = 'news-modal feature-info-modal';
            modal.hidden = true;
            modal.innerHTML = `
                <div class="news-modal__backdrop" data-action="close"></div>
                <div class="news-modal__panel" role="dialog" aria-modal="true" aria-label="Info">
                    <div class="news-modal__top">
                        <div class="news-modal__tag">INFO</div>
                        <div class="news-modal__date">MU NEUTRO</div>
                    </div>
                    <h3 class="news-modal__title" id="feature-info-title">-</h3>
                    <div class="news-modal__content">
                        <div class="feature-info-modal__image-wrap" id="feature-info-image-wrap" hidden>
                            <img class="feature-info-modal__image" id="feature-info-image" alt="Info image" />
                        </div>
                        <p class="feature-info-modal__text" id="feature-info-text">-</p>
                    </div>
                    <div class="news-modal__actions">
                        <button class="btn btn-gold news-modal__btn" type="button" data-action="close">CERRAR</button>
                    </div>
                </div>
            `.trim();

            document.body.appendChild(modal);
            return modal;
        };

        const openFeatureInfoModal = (card) => {
            if (!card) return;

            const modal = ensureFeatureInfoModal();
            const titleEl = document.getElementById('feature-info-title');
            const textEl = document.getElementById('feature-info-text');
            const imageWrapEl = document.getElementById('feature-info-image-wrap');
            const imageEl = document.getElementById('feature-info-image');
            if (!titleEl || !textEl || !imageWrapEl || !imageEl) return;

            titleEl.textContent = String(card.infoTitle || card.title || 'INFO').trim() || 'INFO';
            textEl.textContent = String(card.infoText || card.desc || '').trim() || 'Sin información disponible.';

            const imageUrl = String(card.infoImageUrl || card.backgroundImage || '').trim();
            if (imageUrl) {
                imageEl.src = imageUrl;
                imageWrapEl.hidden = false;
            } else {
                imageEl.removeAttribute('src');
                imageWrapEl.hidden = true;
            }

            const close = () => {
                if (modal.hidden) return;
                modal.hidden = true;
                document.body.classList.remove('news-modal-open');
                if (modal.__featureInfoOnKeydown) {
                    document.removeEventListener('keydown', modal.__featureInfoOnKeydown);
                    modal.__featureInfoOnKeydown = null;
                }
            };

            modal.onclick = (e) => {
                const closeBtn = e.target && e.target.closest ? e.target.closest('[data-action="close"]') : null;
                if (closeBtn) close();
            };

            if (modal.__featureInfoOnKeydown) {
                document.removeEventListener('keydown', modal.__featureInfoOnKeydown);
            }
            modal.__featureInfoOnKeydown = (e) => {
                if (e.key === 'Escape') close();
            };
            document.addEventListener('keydown', modal.__featureInfoOnKeydown);

            modal.hidden = false;
            document.body.classList.add('news-modal-open');
        };

    const host = document.getElementById('launcher-features-cards');
    if (!host) return;

    const sKey = (selectedServer || (localStorage.getItem('selectedServer') || '')).toString().trim();
    const cfg = servers && typeof servers === 'object' && sKey && servers[sKey] ? servers[sKey] : null;
    if (!cfg) {
        host.innerHTML = '';
        return;
    }

    const customCardsFromServer = Array.isArray(cfg.homeFeatureCards) ? cfg.homeFeatureCards : [];
    const customCardsFromPublic = (window.PUBLIC_INFO && Array.isArray(window.PUBLIC_INFO.homeFeatureCards))
        ? window.PUBLIC_INFO.homeFeatureCards
        : [];
    const sourceCards = customCardsFromServer.length ? customCardsFromServer : customCardsFromPublic;

    const normalizeFeatureCardImageUrl = (input) => {
        const raw = String(input || '').trim();
        if (!raw) return '';

        const m = raw.match(/^https?:\/\/(?:www\.)?imgur\.com\/([a-zA-Z0-9]+)(?:\.[a-zA-Z0-9]+)?(?:[/?#].*)?$/i);
        if (m && m[1]) {
            return `https://i.imgur.com/${m[1]}.jpg`;
        }

        return raw;
    };

    const cards = sourceCards
        .map((card, index) => {
            if (!card || typeof card !== 'object') return null;

            const fallbackBg = index === 0
                ? 'assets/images/home/vip.png'
                : (index === 1 ? 'assets/images/home/slots.png' : 'assets/images/home/loto.png');

            // Reparar: fallback seguro para title/desc
            // Restaurar: mostrar SIEMPRE el título/texto original si existen
            let title = card.title || (typeof t === 'function' && card.titleI18n ? t(card.titleI18n) : '') || `CARD ${index + 1}`;
            let desc = card.desc || card.description || (typeof t === 'function' && card.descI18n ? t(card.descI18n) : '') || '';
            let infoTitle = card.infoTitle || card.modalTitle || card.title || (typeof t === 'function' && card.titleI18n ? t(card.titleI18n) : '') || `CARD ${index + 1}`;
            let infoText = card.infoText || card.modalText || card.desc || card.description || (typeof t === 'function' && card.descI18n ? t(card.descI18n) : '') || '';
            return {
                id: String(card.id || `custom-card-${index + 1}`),
                enabled: card.enabled !== false,
                icon: String(card.icon || 'fas fa-star'),
                title,
                desc,
                infoTitle,
                infoText,
                infoImageUrl: normalizeFeatureCardImageUrl(card.infoImageUrl || card.modalImageUrl || card.backgroundImage || card.bgImage || card.imageUrl || fallbackBg),
                backgroundImage: normalizeFeatureCardImageUrl(card.backgroundImage || card.bgImage || card.imageUrl || fallbackBg)
            };
        })
        .filter(c => c && c.enabled);

    if (!cards.length) {
        host.innerHTML = '';
        return;
    }

    host.innerHTML = cards
        .map(c => {
            const bg = c.backgroundImage || '';
            const cardId = String(c.id || '').replace(/"/g, '&quot;');

            return `
            <div class="feature-card">
                ${bg ? `<div class="feature-bg" style="background-image:url('${bg.replace(/'/g, "\\'")}')"></div>` : ''}
                <div class="feature-overlay"></div>
                <i class="${c.icon}"></i>
                <h3>${c.title}</h3>
                <div id="${c.id}-desc" class="feature-desc">${c.desc}</div>
                <button class="btn btn-gold btn-sm feature-info-btn" type="button" data-card-id="${cardId}">INFO</button>
            </div>
        `.trim();
        })
        .join('');

    host.__featureCardsById = cards.reduce((acc, card) => {
        if (card && card.id) acc[card.id] = card;
        return acc;
    }, {});

    if (!host.dataset.featureInfoBound) {
        host.addEventListener('click', (e) => {
            const btn = e.target && e.target.closest ? e.target.closest('.feature-info-btn[data-card-id]') : null;
            if (!btn) return;
            e.preventDefault();
            const cardId = String(btn.getAttribute('data-card-id') || '').trim();
            if (!cardId) return;
            const map = host.__featureCardsById || {};
            const card = map[cardId] || null;
            openFeatureInfoModal(card);
        });
        host.dataset.featureInfoBound = '1';
    }

    try { startHomeCardsLiveUpdater(); } catch (e) {}
}

function summarizePlaytimeReward(r) {
    if (!r || typeof r !== 'object') return '';

    const parts = [];

    const money = Number(r.moneyDrop || 0);
    if (Number.isFinite(money) && money > 0) {
        parts.push(`${money.toLocaleString()} Zen`);
    }

    const ruud = r.ruud;
    if (ruud && Number(ruud.gainRate || 0) > 0) {
        const minV = Number(ruud.minValue || 0);
        const maxV = Number(ruud.maxValue || 0);
        if (Number.isFinite(minV) && Number.isFinite(maxV) && (minV > 0 || maxV > 0)) {
            parts.push(`${minV.toLocaleString()}-${maxV.toLocaleString()} Ruud`);
        }
    }

    const addCoin = r.addCoin;
    if (addCoin && Number(addCoin.enable || 0) === 1) {
        const v = Number(addCoin.coinValue || 0);
        if (Number.isFinite(v) && v > 0) parts.push(`${v.toLocaleString()} Coin`);
    }

    const items = Array.isArray(r.items) ? r.items : [];
    if (items.length) {
        const grouped = {};
        items.forEach(it => {
            const name = (it && it.itemName) ? String(it.itemName).trim() : '';
            const key = name ? `name:${name}` : `${Number(it.cat)}:${Number(it.index)}`;
            grouped[key] = (grouped[key] || 0) + 1;
        });
        const keys = Object.keys(grouped);
        if (keys.length === 1) {
            const k = keys[0];
            if (k.startsWith('name:')) {
                parts.push(`${grouped[k]}x ${k.slice(5)}`);
            } else {
                const [cat, idx] = k.split(':');
                parts.push(`${grouped[k]}x Item (${cat}/${idx})`);
            }
        } else {
            parts.push(`${items.length} Items`);
        }
    }

    return parts.join(' • ');
}

async function renderPlaytimeRewardsSection(servers, selectedServer) {
    const section = document.getElementById('playtime-section');
    const grid = document.getElementById('playtime-grid');
    if (!section || !grid) return;

    const st = (selectedServer || (localStorage.getItem('selectedServer') || '')).toString().trim();
    const cfg = servers && typeof servers === 'object' && st && servers[st] ? servers[st] : null;
    if (!cfg) {
        section.hidden = true;
        grid.innerHTML = '';
        return;
    }

    const serverFiles = (cfg.server_files || '').toString().trim().toUpperCase();
    if (serverFiles !== 'IGCN') {
        section.hidden = true;
        grid.innerHTML = '';
        return;
    }

    try {
        const data = await apiFetchJson(`/playtime-rewards?serverType=${encodeURIComponent(st)}`);
        if (!data || data.success !== true || data.disabled === true || !Array.isArray(data.rewards) || !data.rewards.length) {
            section.hidden = true;
            grid.innerHTML = '';
            return;
        }

        section.hidden = false;
        grid.innerHTML = data.rewards.map((r, idx) => {
            const top = `${idx + 1} REWARD`;
            const time = (r.timeLabel || '').toString().trim() || `${Number(r.minutes || 0)} MINUTES`;
            const summary = summarizePlaytimeReward(r);
            return `
                <div class="playtime-card">
                    <div class="playtime-bg" style="background-image:url('/assets/images/home/playtime.png')"></div>
                    <div class="playtime-overlay"></div>
                    <div class="playtime-pill">${top}</div>
                    <div class="playtime-icon"><i class="fas fa-hourglass-half"></i></div>
                    <div class="playtime-time">${time}</div>
                    <div class="playtime-reward">${summary || '&nbsp;'}</div>
                </div>
            `.trim();
        }).join('');
    } catch (e) {
        section.hidden = true;
        grid.innerHTML = '';
    }
}

function getSelectedServerKey() {
    return (localStorage.getItem('selectedServer') || '').toString().trim();
}

let __homeCardsInterval = null;
async function fetchHomeCards(serverType) {
    const st = String(serverType || '').trim();
    if (!st) return null;
    return await apiFetchJson(`/auth/home-cards?serverType=${encodeURIComponent(st)}`);
}

async function updateHomeCardsLiveOnce() {
    const st = (localStorage.getItem('selectedServer') || '').toString().trim();
    if (!st) return;

    const data = await fetchHomeCards(st);
    if (!data || data.success === false) return;

    const fmtNum = (n) => {
        const x = Number(n);
        return Number.isFinite(x) ? x.toLocaleString() : '0';
    };

    const vip = data.vipReward;
    const vipDesc = document.getElementById('vip-desc');
    if (vip && vipDesc) {
        const days = Number(vip.days);
        const vipType = Number(vip.vipType);
        if (Number.isFinite(days) && days > 0 && Number.isFinite(vipType) && vipType > 0) {
            const requireHwid = vip.requireHwid === true;
            const extra = `<div class="vip-badges">
                <span class="vip-badge">One-time per account</span>
                <span class="vip-badge">Per IP</span>
                ${requireHwid ? `<span class="vip-badge">Per HWID</span>` : ''}
            </div>`;
            vipDesc.innerHTML = `VIP ${vipType} for ${days} day${days === 1 ? '' : 's'} on registration.${extra}`;
        }
    }

    const slotsDesc = document.getElementById('slots-desc');
    if (slotsDesc && data.slots && data.slots.summary) {
        const s = data.slots.summary;
        const live = data.slots.live;
        const jp = live && Number.isFinite(Number(live.currentJackpot)) ? Number(live.currentJackpot) : null;
        if (jp !== null) {
            slotsDesc.textContent = `Current jackpot: ${fmtNum(jp)}`;
        }
    }

    const lotDesc = document.getElementById('lottery-desc');
    if (lotDesc && data.lottery && data.lottery.summary) {
        const l = data.lottery.summary;
        const live = data.lottery.live;
        const jp = live && Number.isFinite(Number(live.currentJackpot)) ? Number(live.currentJackpot) : null;
        if (jp !== null) {
            lotDesc.textContent = `Current jackpot: ${fmtNum(jp)}`;
        }
    }
}

function startHomeCardsLiveUpdater() {
    if (__homeCardsInterval) return;
    updateHomeCardsLiveOnce().catch(() => {});
    __homeCardsInterval = setInterval(() => {
        updateHomeCardsLiveOnce().catch(() => {});
    }, 30000);
}

function startAdventure() {
    const token = (localStorage.getItem('authToken') || '').toString().trim();
    if (token) {
        window.location.href = 'LauncherGames://';
        return;
    }
    window.location.href = '/auth.html#register';
}

window.startAdventure = startAdventure;

function getSelectedLang() {
    const raw = (localStorage.getItem('selectedLang') || __i18nLang || 'en').toString().trim().toLowerCase();
    return raw || 'en';
}

function dayOfWeekLabel(dow) {
    const n = Number(dow);
    switch (n) {
        case 0: return 'SUNDAY';
        case 1: return 'MONDAY';
        case 2: return 'TUESDAY';
        case 3: return 'WEDNESDAY';
        case 4: return 'THURSDAY';
        case 5: return 'FRIDAY';
        case 6: return 'SATURDAY';
        default: return '';
    }
}

async function handleDownloadLauncher(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    showNotification('info', 'Preparing your download...');
    try {
        const response = await fetch(`${API_BASE_URL}/get-launcher`);
        const result = await response.json().catch(() => ({}));
        if (response.ok && result.success && result.downloadUrl) {
            window.location.href = result.downloadUrl;
        } else {
            showNotification('error', result.message || 'Could not retrieve download link.');
        }
    } catch (error) {
        showNotification('error', 'An error occurred while fetching the download link.');
    }
}

async function handleDownloadMega(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    
    // Check if button is disabled by the opening countdown
    if (event.currentTarget && event.currentTarget.getAttribute('disabled') === 'true') {
        showNotification('warning', 'El instalador estará disponible en el momento de la apertura.');
        return;
    }

    showNotification('info', 'Preparing your download...');
    window.location.href = '/downloads/MuNeutroInstall.exe';
}

function initDownloadButton() {
    const downloadBtn = document.getElementById('download-launcher-btn');
    if (downloadBtn && downloadBtn.dataset.bound !== '1') {
        downloadBtn.dataset.bound = '1';
        downloadBtn.addEventListener('click', handleDownloadLauncher);
    }

    const megaBtn = document.getElementById('download-mega-btn');
    if (megaBtn && megaBtn.dataset.bound !== '1') {
        megaBtn.dataset.bound = '1';
        megaBtn.addEventListener('click', handleDownloadMega);
    }

    const sizeEl = document.getElementById('dl-meta-size');
    const updatedEl = document.getElementById('dl-meta-updated');
    const versionEl = document.getElementById('dl-meta-version');
    const releaseEl = document.getElementById('dl-meta-release');
    const sizeMegaEl = document.getElementById('dl-meta-size-mega');
    if (sizeEl || updatedEl || versionEl || releaseEl || sizeMegaEl) {
        populateDownloadsMeta().catch(() => {});
    }
    
    syncDownloadWithOpening().catch(() => {});
}

async function populateDownloadsMeta() {
    const fmtBytes = (bytes) => {
        const b = Number(bytes);
        if (!Number.isFinite(b) || b <= 0) return '-';
        const units = ['B', 'KB', 'MB', 'GB'];
        let v = b;
        let i = 0;
        while (v >= 1024 && i < units.length - 1) {
            v /= 1024;
            i++;
        }
        const fixed = i >= 2 ? v.toFixed(2) : v.toFixed(0);
        return `${fixed} ${units[i]}`;
    };

    const fmtDate = (d) => {
        if (!d) return '-';
        const dt = new Date(d);
        if (!Number.isFinite(dt.getTime())) return '-';
        const dd = String(dt.getDate()).padStart(2, '0');
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const yy = dt.getFullYear();
        return `${dd}/${mm}/${yy}`;
    };

    const extractVersion = (url) => {
        try {
            const u = new URL(url, window.location.origin);
            const name = decodeURIComponent(u.pathname.split('/').pop() || '');
            const m = name.match(/v(\d+\.\d+\.\d+)|\b(\d+\.\d+\.\d+)\b/i);
            const ver = (m && (m[1] || m[2])) ? (m[1] || m[2]) : '';
            return ver ? `v${ver}` : '1.0.0';
        } catch (e) {
            return '1.0.0';
        }
    };

    const fetchJson = async (path) => {
        try {
            const res = await fetch(`${API_BASE_URL}${path}`, { cache: 'no-store' });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            return null;
        }
    };

    // Populate Original Direct Button
    const sizeEl = document.getElementById('dl-meta-size');
    const updatedEl = document.getElementById('dl-meta-updated');
    const versionEl = document.getElementById('dl-meta-version');
    const releaseEl = document.getElementById('dl-meta-release');
    
    if (sizeEl || updatedEl || versionEl || releaseEl) {
        const data = await fetchJson('/get-launcher');
        const url = data && data.success && data.downloadUrl ? String(data.downloadUrl) : '';
        if (url) {
            if (versionEl) versionEl.textContent = extractVersion(url);
            try {
                const headRes = await fetch(url, { method: 'HEAD' });
                if (headRes && headRes.ok) {
                    const len = headRes.headers.get('content-length');
                    const lm = headRes.headers.get('last-modified');

                    if (sizeEl) sizeEl.textContent = fmtBytes(len);
                    const d = lm ? fmtDate(lm) : '-';
                    if (updatedEl) updatedEl.textContent = d;
                    if (releaseEl) releaseEl.textContent = d;
                }
            } catch (e) {}
        }
    }

    // Populate Mega Button
    const sizeMegaEl = document.getElementById('dl-meta-size-mega');
    const updatedMegaEl = document.getElementById('dl-meta-updated-mega');
    const versionMegaEl = document.getElementById('dl-meta-version-mega');
    const releaseMegaEl = document.getElementById('dl-meta-release-mega');

    if (sizeMegaEl || updatedMegaEl || versionMegaEl || releaseMegaEl) {
        const urlMega = '/downloads/MuNeutroInstall.exe';
        if (versionMegaEl) versionMegaEl.textContent = extractVersion(urlMega);
        
        try {
            const headResMega = await fetch(urlMega, { method: 'HEAD' });
            if (headResMega && headResMega.ok) {
                const lenMega = headResMega.headers.get('content-length');
                const lmMega = headResMega.headers.get('last-modified');

                if (sizeMegaEl) sizeMegaEl.textContent = fmtBytes(lenMega);
                const dMega = lmMega ? fmtDate(lmMega) : '-';
                if (updatedMegaEl) updatedMegaEl.textContent = dMega;
                if (releaseMegaEl) releaseMegaEl.textContent = dMega;
            }
        } catch (e) {}
    }
}

let __downloadSyncInterval = null;

async function syncDownloadWithOpening() {
    const megaBtn = document.getElementById('download-mega-btn');
    if (!megaBtn || megaBtn.dataset.syncOpening !== 'true') return;

    if (typeof window.getServersConfigCached !== 'function') return;
    const servers = await window.getServersConfigCached(true);
    if (!servers) return;
    
    const selectedServer = localStorage.getItem('selectedServer') || Object.keys(servers)[0];
    const cfg = servers[selectedServer] || {};
    const openingDateStr = (cfg.grandOpeningDate || cfg.openingDate || '').toString();
    const openingTs = openingDateStr ? new Date(openingDateStr).getTime() : NaN;
    
    if (!Number.isFinite(openingTs)) return;

    const btnTextEl = megaBtn.querySelector('.download-btn__text');
    const btnIconEl = megaBtn.querySelector('.download-btn__icon i');

    const checkAndSync = () => {
        const now = Date.now();
        const distance = openingTs - now;

        if (distance > 0) {
            if (btnTextEl) btnTextEl.textContent = 'PRÓXIMAMENTE';
            if (btnIconEl) btnIconEl.className = 'fas fa-clock';
            megaBtn.style.background = 'rgba(128, 128, 128, 0.4)';
            megaBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            megaBtn.style.pointerEvents = 'none';
            megaBtn.style.opacity = '0.7';
            megaBtn.setAttribute('disabled', 'true');
            megaBtn.setAttribute('tabindex', '-1');
        } else {
            if (btnTextEl) btnTextEl.textContent = 'DESCARGA DIRECTA';
            if (btnIconEl) btnIconEl.className = 'fas fa-download';
            megaBtn.style.background = '';
            megaBtn.style.borderColor = '';
            megaBtn.style.pointerEvents = '';
            megaBtn.style.opacity = '';
            megaBtn.removeAttribute('disabled');
            megaBtn.removeAttribute('tabindex');

            if (__downloadSyncInterval) {
                clearInterval(__downloadSyncInterval);
                __downloadSyncInterval = null;
            }
        }
    };

    checkAndSync();
    
    if (openingTs > Date.now()) {
        __downloadSyncInterval = setInterval(checkAndSync, 1000);
    }
}

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

function initializeStreamingWidget() {
    if (!(document.body && document.body.classList.contains('page-home'))) return;

    let widgetContainer = document.getElementById('streaming-widget-container');
    if (widgetContainer) return;

    widgetContainer = document.createElement('div');
    widgetContainer.id = 'streaming-widget-container';
    widgetContainer.className = 'streaming-widget-container';

    widgetContainer.innerHTML = `
        <div class="streaming-list-wrapper" id="streaming-list-wrapper">
            <div class="streaming-list-header">
                <button class="stream-back-btn" id="stream-back-btn" style="display: none;"><i class='bx bx-chevron-left'></i></button>
                <span id="streaming-header-title">Live Streams</span>
                <span id="streaming-header-streamer" style="display: none;"></span>
                <button class="stream-close-btn" id="stream-close-btn" title="Close">×</button>
            </div>
            <div class="streaming-list" id="streaming-list"></div>
            <div class="streaming-player-view" id="streaming-player-view"></div>
        </div>
        <div class="streaming-avatars-bar" id="streaming-avatars-bar" aria-label="Live Streams"></div>
    `;

    document.body.appendChild(widgetContainer);

    const wrapper = document.getElementById('streaming-list-wrapper');
    const list = document.getElementById('streaming-list');
    const playerView = document.getElementById('streaming-player-view');
    const backBtn = document.getElementById('stream-back-btn');
    const closeBtn = document.getElementById('stream-close-btn');
    const headerTitle = document.getElementById('streaming-header-title');
    const headerStreamer = document.getElementById('streaming-header-streamer');
    const avatarsBar = document.getElementById('streaming-avatars-bar');


    let tiktokEmbedScriptLoaded = false;
    const loadTikTokEmbedScript = () => {
        return new Promise((resolve) => {
            if (tiktokEmbedScriptLoaded) { resolve(true); return; }
            const s = document.createElement('script');
            s.src = 'https://www.tiktok.com/embed.js';
            s.async = true;
            s.onload = () => { tiktokEmbedScriptLoaded = true; resolve(true); };
            s.onerror = () => resolve(false);
            document.head.appendChild(s);
        });
    };

    const openStreamByData = (payload) => {
        if (!payload) return;

        const channelId = payload.channelId;
        const platform = payload.platform;
        const streamerName = payload.name;
        const embedUrl = payload.embedUrl;
        const watchUrl = payload.url;
        const accountId = payload.accountId;
        const serverType = payload.serverType;
        const streamTitle = payload.title || '';
        const promoCodes = extractPromoCodes(streamTitle);

        const promoHtml = promoCodes.length
            ? `<div class="streaming-promo-bar">
                    <div class="streaming-promo-title">Promo code</div>
                    <button class="streaming-promo-code" type="button" data-code="${escapeHtml(promoCodes[0])}" title="Copy">${escapeHtml(promoCodes[0])}</button>
                </div>`
            : '';

        const showPlayer = () => {
            widgetContainer.classList.add('expanded');
            list.style.display = 'none';
            playerView.style.display = 'block';
            headerTitle.style.display = 'none';
            headerStreamer.textContent = streamerName;
            headerStreamer.style.display = 'block';
            backBtn.style.display = 'block';
            wrapper.classList.add('is-playing');
        };

        if (platform === 'Twitch' && channelId) {
            showPlayer();
            loadTwitchScript().then(() => {
                playerView.innerHTML = `${promoHtml}<div id="streaming-twitch-embed" class="streaming-player-embed"></div>`;
                if (typeof Twitch === 'undefined' || !Twitch.Embed) {
                    playerView.innerHTML = '<div style="padding:16px;">Twitch embed failed</div>';
                    return;
                }
                new Twitch.Embed('streaming-twitch-embed', {
                    width: '100%',
                    height: '100%',
                    channel: channelId,
                    layout: 'video',
                    autoplay: true,
                    muted: true,
                    parent: [window.location.hostname]
                });
            });
        } else if (platform === 'Kick') {
            if (watchUrl) window.open(watchUrl, '_blank');
        } else if (platform === 'YouTube' && embedUrl) {
            showPlayer();
            playerView.innerHTML = `${promoHtml}<div class="streaming-player-embed"><iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" allow="autoplay; fullscreen"></iframe></div>`;
        } else if (platform === 'TikTok') {
            showPlayer();
            if (watchUrl) {
                const isTikTokLive = /\/live(\?|$)/i.test(watchUrl);
                playerView.innerHTML = `${promoHtml}
                    <div class="streaming-player-embed" style="display:flex; gap:10px; height: 100%;">
                        <div style="flex: 1 1 auto; min-width: 0;">
                            <div style="display:${isTikTokLive ? 'none' : 'flex'}; justify-content:flex-end; gap:8px; padding: 0 0 8px;">
                                <a href="${watchUrl}" target="_blank" rel="noopener noreferrer" class="action-btn" style="padding:10px 14px; font-size: 0.9rem; font-weight: 700;">Open TikTok <i class="fas fa-external-link-alt" style="margin-left: 8px;"></i></a>
                            </div>
                            <div id="tiktok-oembed-host" style="min-height: 120px;"></div>
                            <div id="tiktok-oembed-fallback" style="margin-top: 10px; padding: 14px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; color: #aaa; font-size: 0.85rem; display:none;">
                                TikTok does not allow this content to be embedded here. Use <strong style="color:#fff;">Open TikTok <i class="fas fa-external-link-alt" style="margin-left: 8px;"></i></strong> to watch.
                            </div>
                            <div id="tiktok-live-status" style="margin-top: 10px; padding: 8px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; color: #ef4444; font-size: 0.8rem; text-align: center; display: none;">
                                <span id="tiktok-live-text">Checking live status...</span>
                            </div>
                        </div>
                    </div>`;

                // Monitor TikTok live status
                let liveCheckInterval;
                let streamData = null; // Store stream data for use in embed

                const checkTikTokLiveStatus = async () => {
                    try {
                        const serverType = localStorage.getItem('selectedServer');
                        if (!serverType) return;

                        const response = await fetch(`${API_BASE_URL}/streaming/live-list?serverType=${encodeURIComponent(serverType)}`);
                        if (!response.ok) return;

                        const data = await response.json();
                        const streams = Array.isArray(data) ? data : (data.liveStreamers || []);

                        // Find current stream and store data
                        streamData = streams.find(s =>
                            s.platform && s.platform.toLowerCase() === 'tiktok' &&
                            (s.watchUrl === watchUrl || s.url === watchUrl)
                        );

                        const statusDiv = document.getElementById('tiktok-live-status');
                        const statusText = document.getElementById('tiktok-live-text');

                        if (!streamData || !streamData.isLive) {
                            // Stream has ended
                            if (statusDiv) {
                                statusDiv.style.display = 'block';
                                statusDiv.style.background = 'rgba(239, 68, 68, 0.2)';
                                statusDiv.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                                if (statusText) statusText.innerHTML = `STREAM HAS ENDED - <a href="${watchUrl}" target="_blank" rel="noopener noreferrer" style="color:#fff; text-decoration:underline;">Open TikTok <i class="fas fa-external-link-alt" style="margin-left: 8px;"></i></a>`;
                            }

                            // Stop monitoring after showing ended message
                            if (liveCheckInterval) {
                                clearInterval(liveCheckInterval);
                                liveCheckInterval = null;
                            }

                            // Auto-close player after 3 seconds
                            setTimeout(() => {
                                closePlayer();
                            }, 3000);
                        } else {
                            // Stream is still live
                            if (statusDiv) {
                                statusDiv.style.display = 'block';
                                statusDiv.style.background = 'rgba(34, 197, 94, 0.1)';
                                statusDiv.style.borderColor = 'rgba(34, 197, 94, 0.3)';
                                statusDiv.style.color = '#22c55e';
                                if (statusText) statusText.innerHTML = `STREAM IS LIVE - <a href="${watchUrl}" target="_blank" rel="noopener noreferrer" style="color:#fff; text-decoration:underline;">Open TikTok <i class="fas fa-external-link-alt" style="margin-left: 8px;"></i></a>`;
                            }
                        }
                    } catch (e) {
                        // Error checking TikTok live status - handled gracefully
                    }
                };

                // Start monitoring if it's a live stream
                if (isTikTokLive) {
                    checkTikTokLiveStatus(); // Check immediately
                    liveCheckInterval = setInterval(checkTikTokLiveStatus, 10000); // Check every 10 seconds
                }

                // Clean up interval when player is closed
                const originalClosePlayer = closePlayer;
                closePlayer = () => {
                    if (liveCheckInterval) {
                        clearInterval(liveCheckInterval);
                        liveCheckInterval = null;
                    }
                    originalClosePlayer();
                };

                (async () => {
                    const host = document.getElementById('tiktok-oembed-host');
                    const fb = document.getElementById('tiktok-oembed-fallback');
                    if (!host) return;
                    if (isTikTokLive) {
                        // Get current stream data for display
                        const currentStreamData = streamData || {
                            displayName: nameToShow,
                            title: 'Live Stream',
                            profileImageUrl: null,
                            thumbnailUrl: null
                        };

                        host.innerHTML = `
                            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height: 220px; gap:12px;">
                                <img src="${currentStreamData.profileImageUrl || currentStreamData.thumbnailUrl || 'assets/icon/icon.png'}" style="width:80px; height:80px; border-radius:50%; object-fit:cover; border:3px solid rgba(255,255,255,0.2);" onerror="this.style.display='none';" />
                                <div style="text-align:center;">
                                    <div style="color:#fff; font-weight:700; margin-bottom:4px;">${escapeHtml(currentStreamData.displayName || currentStreamData.channelId || nameToShow)}</div>
                                    <div style="color:#aaa; font-size:0.9rem; margin-bottom:12px;">${escapeHtml(String(currentStreamData.title || 'Live Stream'))}</div>
                                </div>
                                <a href="${watchUrl}" target="_blank" rel="noopener noreferrer" class="action-btn" style="padding:18px 28px; font-size: 1.05rem; font-weight: 800; border-radius: 12px;">Open TikTok <i class="fas fa-external-link-alt" style="margin-left: 8px;"></i></a>
                            </div>`;
                        if (fb) fb.style.display = 'none';
                        return;
                    }

                    host.innerHTML = '<div style="padding:12px; color:#aaa;">Loading TikTok embed...</div>';
                    try {
                        const r = await fetch(`${API_BASE_URL}/streaming/tiktok/oembed?url=${encodeURIComponent(watchUrl)}`);
                        const j = await r.json();
                        if (!j || !j.success || !j.data || !j.data.html) {
                            if (fb) fb.style.display = 'block';
                            host.innerHTML = `
                                <div style="display:flex; align-items:center; justify-content:center; min-height: 220px;">
                                    <a href="${watchUrl}" target="_blank" rel="noopener noreferrer" class="action-btn" style="padding:18px 28px; font-size: 1.05rem; font-weight: 800; border-radius: 12px;">Open TikTok <i class="fas fa-external-link-alt" style="margin-left: 8px;"></i></a>
                                </div>`;
                            return;
                        }

                        const html = String(j.data.html || '');
                        const m = html.match(/<blockquote[\s\S]*?<\/blockquote>/i);
                        const blockquote = m ? m[0] : '';
                        if (!blockquote) {
                            if (fb) fb.style.display = 'block';
                            host.innerHTML = `
                                <div style="display:flex; align-items:center; justify-content:center; min-height: 220px;">
                                    <a href="${watchUrl}" target="_blank" rel="noopener noreferrer" class="action-btn" style="padding:18px 28px; font-size: 1.05rem; font-weight: 800; border-radius: 12px;">Open TikTok <i class="fas fa-external-link-alt" style="margin-left: 8px;"></i></a>
                                </div>`;
                            return;
                        }

                        host.innerHTML = blockquote;
                        await loadTikTokEmbedScript();
                    } catch (e) {
                        if (fb) fb.style.display = 'block';
                        host.innerHTML = `
                            <div style="display:flex; align-items:center; justify-content:center; min-height: 220px;">
                                <a href="${watchUrl}" target="_blank" rel="noopener noreferrer" class="action-btn" style="padding:18px 28px; font-size: 1.05rem; font-weight: 800; border-radius: 12px;">Open TikTok <i class="fas fa-external-link-alt" style="margin-left: 8px;"></i></a>
                            </div>`;
                    }
                })();
            } else {
                playerView.innerHTML = `${promoHtml}<div style="padding:16px;">TikTok stream unavailable</div>`;
            }
        }
    };

    const resetToListView = () => {
        if (playerView) playerView.innerHTML = '';
        list.style.display = 'block';
        playerView.style.display = 'none';
        headerTitle.style.display = 'block';
        headerStreamer.style.display = 'none';
        backBtn.style.display = 'none';
        wrapper.classList.remove('is-playing');
    };

    const closeWidget = () => {
        widgetContainer.classList.remove('expanded');
        resetToListView();
    };

    if (avatarsBar) {
        avatarsBar.addEventListener('click', (e) => {
            const btn = e.target && e.target.closest ? e.target.closest('.streaming-avatar-btn') : null;
            if (!btn) {
                widgetContainer.classList.toggle('expanded');
                if (!widgetContainer.classList.contains('expanded')) resetToListView();
                return;
            }

            const payload = {
                channelId: btn.dataset.channelId || '',
                platform: btn.dataset.platform || 'Twitch',
                name: btn.dataset.name || 'Streamer',
                url: btn.dataset.url || '',
                embedUrl: btn.dataset.embedUrl || '',
                title: btn.dataset.title || '',
                accountId: btn.dataset.accountId || '',
                serverType: btn.dataset.serverType || ''
            };

            openStreamByData(payload);
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeWidget();
        });
    }

    if (backBtn) backBtn.addEventListener('click', resetToListView);

    if (list) {
        list.addEventListener('click', (e) => {
            const promoBtn = e.target && e.target.closest ? e.target.closest('.streaming-promo-code') : null;
            if (promoBtn) {
                const code = (promoBtn.dataset && promoBtn.dataset.code) ? promoBtn.dataset.code : '';
                if (!code) return;

                const fallbackCopy = () => {
                    try {
                        const ta = document.createElement('textarea');
                        ta.value = code;
                        ta.style.position = 'fixed';
                        ta.style.left = '-9999px';
                        ta.style.top = '0';
                        document.body.appendChild(ta);
                        ta.focus();
                        ta.select();
                        document.execCommand('copy');
                        document.body.removeChild(ta);
                    } catch (err) {}
                };

                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(code).catch(() => fallbackCopy());
                } else {
                    fallbackCopy();
                }

                if (typeof showNotification === 'function') {
                    showNotification('success', 'Code copied');
                }
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            const codeEl = e.target && e.target.closest ? e.target.closest('.discount-code') : null;
            if (codeEl) {
                const code = (codeEl.dataset && codeEl.dataset.code) ? codeEl.dataset.code : '';
                if (code) {
                    const fallbackCopy = () => {
                        try {
                            const ta = document.createElement('textarea');
                            ta.value = code;
                            ta.style.position = 'fixed';
                            ta.style.left = '-9999px';
                            ta.style.top = '0';
                            document.body.appendChild(ta);
                            ta.focus();
                            ta.select();
                            document.execCommand('copy');
                            document.body.removeChild(ta);
                        } catch (err) {}
                    };

                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(code).catch(() => fallbackCopy());
                    } else {
                        fallbackCopy();
                    }
                    if (typeof showNotification === 'function') {
                        showNotification('success', 'Code copied');
                    }
                }
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            const item = e.target.closest ? e.target.closest('.stream-item') : null;
            if (!item) return;

            const payload = {
                channelId: item.dataset.channelId || '',
                platform: item.dataset.platform || 'Twitch',
                name: item.dataset.name || 'Streamer',
                url: item.dataset.url || '',
                embedUrl: item.dataset.embedUrl || '',
                title: item.dataset.title || '',
                accountId: item.dataset.accountId || '',
                serverType: item.dataset.serverType || ''
            };

            openStreamByData(payload);
        });
    }
}

async function fetchAndRenderLiveStreamers() {
    const serverType = localStorage.getItem('selectedServer');
    if (!serverType) return;

    const listElement = document.getElementById('streaming-list');
    const widgetContainer = document.getElementById('streaming-widget-container');
    const avatarsBar = document.getElementById('streaming-avatars-bar');
    if (!listElement || !widgetContainer) return;

    try {
        const response = await fetch(`${API_BASE_URL}/streaming/live-list?serverType=${encodeURIComponent(serverType)}`);
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
            const titleHtml = renderStreamTitleWithCode(s.title || '');
            return `
            <div class="stream-item"
                 data-channel-id="${s.channelId || ''}"
                 data-platform="${platformVal}"
                 data-name="${String(nameToShow).replace(/"/g, '&quot;')}"
                 data-title="${escapeHtml(String(s.title || ''))}"
                 data-url="${s.watchUrl || ''}"
                 data-embed-url="${s.embedUrl || ''}"
                 data-account-id="${s.accountId || ''}"
                 data-server-type="${s.serverType || serverType || ''}">
                <div class="stream-avatar"><img src="${s.profileImageUrl || 'assets/icon/icon.png'}" referrerpolicy="no-referrer" crossorigin="anonymous"></div>
                <div class="stream-info">
                    <div class="stream-info-name">${escapeHtml(nameToShow)}</div>
                    <div class="stream-info-title">${titleHtml}</div>
                </div>
                <div class="stream-live-details">${escapeHtml(String(s.viewerCount || 0))}</div>
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
                    title="${escapeHtml(String(nameToShow))}"
                    data-channel-id="${s.channelId || ''}"
                    data-platform="${platformVal}"
                    data-name="${escapeHtml(String(nameToShow))}"
                    data-title="${escapeHtml(String(s.title || ''))}"
                    data-url="${escapeHtml(String(s.watchUrl || s.url || ''))}"
                    data-embed-url="${escapeHtml(String(s.embedUrl || ''))}"
                    data-account-id="${escapeHtml(String(s.accountId || ''))}"
                    data-server-type="${escapeHtml(String(s.serverType || serverType || ''))}">
                    <span style="position:relative; display:block; width:46px; height:46px;">
                        <img src="${escapeHtml(String(avatar))}" alt="${escapeHtml(String(nameToShow))}" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.onerror=null;this.src='${fallbackAvatar}';" style="width:46px; height:46px; border-radius: 999px; object-fit: cover;" />
                        ${isLive ? '<span style="position:absolute; right:-2px; bottom:-2px; padding:2px 6px; font-size: 10px; line-height: 1; font-weight: 800; background:#ef4444; color:#fff; border-radius: 999px; border: 2px solid rgba(0,0,0,0.6);">LIVE</span>' : ''}
                    </span>
                </button>`;
            }).join('');

            try { initCardTiltEffect(widgetContainer); } catch (e) {}
        }
    } catch (e) {
        widgetContainer.style.display = 'none';
        widgetContainer.classList.remove('expanded');
    }
}

function startStreamRefresh() {
    if (!(document.body && document.body.classList.contains('page-home'))) return;

    stopStreamRefresh();
    fetchAndRenderLiveStreamers();
    streamRefreshInterval = setInterval(fetchAndRenderLiveStreamers, 120000);

    if (!streamVisibilityBound) {
        streamVisibilityBound = true;
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                stopStreamRefresh();
                return;
            }

            if (document.body && document.body.classList.contains('page-home')) {
                startStreamRefresh();
            }
        });
    }
}

function stopStreamRefresh() {
    if (streamRefreshInterval) clearInterval(streamRefreshInterval);
}

async function updateDiscordWidget() {
    const guildId = (PUBLIC_INFO.discordGuildId || '').toString().trim();
    const countElement = document.getElementById('discord-online-count');
    const avatarContainer = document.querySelector('.DiscordBlock_avatars__xCgl_');
    if (!countElement) return;

    if (!guildId) {
        countElement.innerText = 'N/A';
        return;
    }

    try {
        const response = await fetch(`https://discord.com/api/guilds/${guildId}/widget.json`);
        if (!response.ok) throw new Error();

        const data = await response.json();
        if (data.presence_count) {
            countElement.innerText = `${data.presence_count} MEMBERS`;
            countElement.style.color = '#43b581';
        } else {
            countElement.innerText = 'ONLINE';
        }

        if (avatarContainer && data.members) {
            const membersToShow = data.members.slice(0, 15);
            avatarContainer.innerHTML = membersToShow.map(member => `
                <div class="DiscordBlock_avatar__l1wf_" style="background-image: url('${member.avatar_url}');" title="${String(member.username || '').replace(/"/g, '&quot;')}"></div>
            `).join('');
        }
    } catch (error) {
        countElement.innerText = 'N/A';
    }
}

async function loadTeamSection() {
    const host = document.getElementById('team-grid');
    if (!host) return;
    try {
        const res = await fetch('/assets/json/team.json', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data) || !data.length) return;

        const renderFocus = (arr) => {
            const a = Array.isArray(arr) ? arr : [];
            if (!a.length) return '';
            return `
                <div class="team-tags">
                    ${a.map(x => `<span class="team-tag">${escapeHtml(String(x || ''))}</span>`).join('')}
                </div>
            `.trim();
        };

        host.innerHTML = data.map(m => {
            const name = String(m?.name || '').trim();
            const title = String(m?.title || m?.role || '').trim();
            const bio = String(m?.bio || m?.description || '').trim();
            const focus = m?.focus || m?.areas;
            const icon = String(m?.icon || '').trim();
            const discordTag = String(m?.discordTag || '').trim();
            const discordUrl = String(m?.discordUrl || '').trim();
            const initials = (name.split(/\s+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2) || 'T').toUpperCase();

            const rawId = String(m?.id || name || '').trim().toLowerCase();
            const hue = (() => {
                let h = 0;
                for (let i = 0; i < rawId.length; i++) h = (h + rawId.charCodeAt(i) * (i + 3)) % 360;
                return h;
            })();

            const focusArr = Array.isArray(focus) ? focus : [];
            const badge = focusArr.length ? String(focusArr[0] || '') : '';

            const isAbsUrl = (u) => /^https?:\/\//i.test(String(u || '').trim());
            const safeDiscordUrl = isAbsUrl(discordUrl) ? discordUrl : '';
            const copyDiscordValue = (discordUrl || discordTag).toString().trim();

            const discordHtml = discordTag
                ? (safeDiscordUrl
                    ? `<a class="team-discord" href="${escapeHtml(safeDiscordUrl)}" target="_blank" rel="noopener noreferrer"><i class="fab fa-discord" aria-hidden="true"></i><span>${escapeHtml(discordTag)}</span></a>`
                    : `<button type="button" class="team-discord team-discord--copy" data-discord-copy="${escapeHtml(copyDiscordValue)}" title="Copy Discord"><i class="fab fa-discord" aria-hidden="true"></i><span>${escapeHtml(discordTag)}</span></button>`
                  )
                : '';
            return `
                <div class="team-card" style="--team-hue:${hue}">
                    <div class="team-watermark" aria-hidden="true">${escapeHtml(name || '')}</div>
                    <div class="team-badge">${escapeHtml(badge)}</div>

                    <div class="team-card-top">
                        <div class="team-avatar" aria-hidden="true">${icon ? `<i class="${escapeHtml(icon)}"></i>` : escapeHtml(initials)}</div>
                        <div class="team-head">
                            <div class="team-name">${escapeHtml(name || '-') }</div>
                            <div class="team-title">${escapeHtml(title || '')}</div>
                        </div>
                    </div>

                    ${renderFocus(focus)}
                    <div class="team-bio">${escapeHtml(bio || '')}</div>
                    ${discordHtml}
                </div>
            `.trim();
        }).join('');

        host.querySelectorAll('[data-discord-copy]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const tag = (btn.getAttribute('data-discord-copy') || '').toString();
                if (!tag) return;
                try {
                    await navigator.clipboard.writeText(tag);
                    if (typeof showNotification === 'function') showNotification('success', 'Discord tag copied');
                } catch (e) {
                    if (typeof showNotification === 'function') showNotification('error', 'Copy failed');
                }
            });
        });
    } catch (e) {
    }
}

function setSelectedLang(lang) {
    const next = (lang || '').toString().trim().toLowerCase() || 'en';
    __i18nLang = next;
    localStorage.setItem('selectedLang', next);
}

function getI18nValue(dict, key) {
    const parts = String(key || '').split('.').filter(Boolean);
    let cur = dict;
    for (const p of parts) {
        if (!cur || typeof cur !== 'object') return undefined;
        cur = cur[p];
    }
    return cur;
}

async function loadLanguage(lang, force = false) {
    const l = (lang || 'en').toString().trim().toLowerCase() || 'en';
    if (!force && __i18nPromise && __i18nLang === l) return __i18nPromise;

    __i18nLang = l;
    __i18nPromise = (async () => {
        const cacheKey = `i18n:${l}:v${I18N_CACHE_VERSION}`;
        const fallbackKey = `i18n:en:v${I18N_CACHE_VERSION}`;

        const ensureEnglishFallback = async () => {
            if (l === 'en') {
                __i18nFallbackDict = __i18nDict;
                return;
            }

            try {
                const fallbackCachedRaw = sessionStorage.getItem(fallbackKey);
                if (fallbackCachedRaw) {
                    const fallbackParsed = JSON.parse(fallbackCachedRaw);
                    if (fallbackParsed && typeof fallbackParsed === 'object') {
                        __i18nFallbackDict = fallbackParsed;
                        return;
                    }
                }
            } catch (e) {}

            try {
                const fallbackRes = await fetch(`/assets/lang/en.json?v=${encodeURIComponent(I18N_CACHE_VERSION)}`, { cache: 'no-store' });
                if (!fallbackRes.ok) throw new Error('fallback lang load failed');
                const fallbackData = await fallbackRes.json();
                __i18nFallbackDict = (fallbackData && typeof fallbackData === 'object') ? fallbackData : {};
                try { sessionStorage.setItem(fallbackKey, JSON.stringify(__i18nFallbackDict)); } catch (e) {}
            } catch (e) {
                __i18nFallbackDict = {};
            }
        };

        if (!force) {
            try {
                const cachedRaw = sessionStorage.getItem(cacheKey);
                if (cachedRaw) {
                    const parsed = JSON.parse(cachedRaw);
                    if (parsed && typeof parsed === 'object') {
                        __i18nDict = parsed;
                        await ensureEnglishFallback();
                        return __i18nDict;
                    }
                }
            } catch (e) {}
        }

        try {
            const res = await fetch(`/assets/lang/${encodeURIComponent(l)}.json?v=${encodeURIComponent(I18N_CACHE_VERSION)}`, { cache: 'no-store' });
            if (!res.ok) throw new Error('lang load failed');
            const data = await res.json();
            __i18nDict = (data && typeof data === 'object') ? data : {};
            try { sessionStorage.setItem(cacheKey, JSON.stringify(__i18nDict)); } catch (e) {}
            await ensureEnglishFallback();
            return __i18nDict;
        } catch (e) {
            __i18nDict = {};
            await ensureEnglishFallback();
            return __i18nDict;
        }
    })();

    return __i18nPromise;
}

function t(key, fallback = '') {
    const v = getI18nValue(__i18nDict, key);
    if (typeof v === 'string') return v;

    if (__i18nLang !== 'en') {
        const fv = getI18nValue(__i18nFallbackDict, key);
        if (typeof fv === 'string') return fv;
    }

    return fallback || String(key || '');
}

function escapeHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderStreamTitleWithCode(raw) {
    const title = (raw || '').toString();
    if (!title.trim()) return '';

    const parts = [];
    const re = /(\bCODE\b)\s+([A-Z0-9]{6,32})/gi;
    let last = 0;
    let m;
    while ((m = re.exec(title)) !== null) {
        const before = title.slice(last, m.index);
        if (before) parts.push(escapeHtml(before));
        const code = String(m[2] || '').toUpperCase();
        parts.push(
            `${escapeHtml(m[1])} <span class="discount-code" role="button" tabindex="0" data-code="${escapeHtml(code)}" title="Copy">${escapeHtml(code)}</span>`,
        );
        last = m.index + m[0].length;
    }
    const after = title.slice(last);
    if (after) parts.push(escapeHtml(after));
    return parts.join('');
}

function extractPromoCodes(raw) {
    const title = (raw || '').toString();
    const codes = [];
    const re = /\bCODE\b\s+([A-Z0-9]{6,32})/gi;
    let m;
    while ((m = re.exec(title)) !== null) {
        const code = String(m[1] || '').toUpperCase();
        if (code && !codes.includes(code)) codes.push(code);
    }
    return codes;
}

function applyTranslations(root = document) {
    try {
        root.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (!key) return;
            const value = t(key, '');
            if (!value) return;
            el.innerHTML = value;
        });
        root.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (!key) return;
            const value = t(key, '');
            if (!value) return;
            el.setAttribute('title', value);
        });
        root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (!key) return;
            const value = t(key, '');
            if (!value) return;
            el.setAttribute('placeholder', value);
        });
    } catch (e) {
    }
}

function ensurePromptModal() {
    let modal = document.getElementById('appPromptModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'appPromptModal';
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal" role="button" aria-label="Close">&times;</span>
            <h2 class="modal-title" id="appPromptModalTitle">Title</h2>
            <div id="appPromptModalMessage" style="margin: -10px 0 22px; color: rgba(255,255,255,0.78); font-weight: 600; letter-spacing: 0.2px;"></div>
            <div class="input-group" style="text-align: left; margin-bottom: 18px;">
                <label id="appPromptModalLabel" style="display:block; margin-bottom: 10px; color: rgba(255,255,255,0.8); font-weight: 800; letter-spacing: 1px; font-size: 0.75rem;">Input</label>
                <div class="input-icon">
                    <i class="fas fa-lock" id="appPromptModalIcon"></i>
                    <input id="appPromptModalInput" type="password" autocomplete="current-password" required minlength="1">
                </div>
                <div id="appPromptModalError" style="margin-top: 10px; color: #ef4444; font-weight: 700; min-height: 18px;"></div>
            </div>
            <div style="display:flex; gap: 12px; justify-content: center;">
                <button type="button" class="btn btn-outline" id="appPromptModalCancel">Cancel</button>
                <button type="button" class="btn btn-gold" id="appPromptModalOk">OK</button>
            </div>
        </div>
    `.trim();
    document.body.appendChild(modal);
    return modal;
}

async function promptModal({
    title = 'Confirm',
    message = '',
    label = '',
    inputType = 'text',
    iconClass = '',
    okText = 'OK',
    cancelText = 'Cancel',
    validate = null,
} = {}) {
    const modal = ensurePromptModal();
    const content = modal.querySelector('.modal-content');
    const btnOk = document.getElementById('appPromptModalOk');
    const btnCancel = document.getElementById('appPromptModalCancel');
    const btnClose = modal.querySelector('.close-modal');
    const elTitle = document.getElementById('appPromptModalTitle');
    const elMsg = document.getElementById('appPromptModalMessage');
    const elLabel = document.getElementById('appPromptModalLabel');
    const elInput = document.getElementById('appPromptModalInput');
    const elError = document.getElementById('appPromptModalError');
    const elIcon = document.getElementById('appPromptModalIcon');

    elTitle.textContent = String(title || '');
    elMsg.textContent = String(message || '');
    elMsg.style.display = message ? '' : 'none';
    elLabel.textContent = String(label || '');
    elLabel.style.display = label ? '' : 'none';
    elInput.value = '';
    elInput.type = (inputType || 'text') === 'password' ? 'password' : 'text';
    elInput.autocomplete = elInput.type === 'password' ? 'current-password' : 'one-time-code';
    btnOk.textContent = String(okText || 'OK');
    btnCancel.textContent = String(cancelText || 'Cancel');
    elError.textContent = '';

    const icon = (iconClass || '').toString().trim();
    elIcon.className = icon ? icon : (elInput.type === 'password' ? 'fas fa-lock' : 'fas fa-key');

    try { applyTranslations(modal); } catch (e) {}

    return await new Promise((resolve) => {
        let done = false;
        const finish = (val) => {
            if (done) return;
            done = true;
            modal.classList.remove('show');
            cleanup();
            resolve(val);
        };

        const onOverlayClick = (e) => {
            if (e.target === modal) finish(null);
        };
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                finish(null);
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                tryOk();
            }
        };

        const tryOk = async () => {
            const value = (elInput.value || '').toString();
            if (typeof validate === 'function') {
                try {
                    const msg = await validate(value);
                    if (msg) {
                        elError.textContent = String(msg);
                        try { elInput.focus(); } catch (e) {}
                        return;
                    }
                } catch (e) {
                    elError.textContent = 'Invalid value';
                    return;
                }
            }
            if (!value.trim()) {
                elError.textContent = 'Required';
                try { elInput.focus(); } catch (e) {}
                return;
            }
            finish(value);
        };

        const cleanup = () => {
            modal.removeEventListener('click', onOverlayClick);
            document.removeEventListener('keydown', onKeyDown);
            btnOk.removeEventListener('click', tryOk);
            btnCancel.removeEventListener('click', onCancel);
            btnClose.removeEventListener('click', onCancel);
            if (content) content.removeEventListener('click', stopProp);
        };

        const onCancel = () => finish(null);
        const stopProp = (e) => e.stopPropagation();

        modal.addEventListener('click', onOverlayClick);
        document.addEventListener('keydown', onKeyDown);
        btnOk.addEventListener('click', tryOk);
        btnCancel.addEventListener('click', onCancel);
        btnClose.addEventListener('click', onCancel);
        if (content) content.addEventListener('click', stopProp);

        modal.classList.add('show');
        try { elInput.focus(); } catch (e) {}
    });
}

async function initHeaderLangSelector() {
    const btn = document.getElementById('header-lang-dd-btn');
    const panel = document.getElementById('header-lang-dd-panel');
    const root = document.getElementById('header-lang-dd');
    if (!btn || !panel) return;
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';

    const close = () => {
        panel.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
    };
    const open = () => {
        const other = document.getElementById('header-server-dd-panel');
        const otherBtn = document.getElementById('header-server-dd-btn');
        if (other) other.hidden = true;
        if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        panel.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
    };
    const toggle = () => {
        if (panel.hidden) open(); else close();
    };

    const setActive = (langCode) => {
        const lc = String(langCode || 'en').trim().toLowerCase() || 'en';
        panel.querySelectorAll('[data-lang]').forEach(el => {
            el.classList.toggle('active', (el.getAttribute('data-lang') || '') === lc);
        });
        
        // Actualizar la bandera principal
        const flagImg = document.getElementById('header-lang-curr-flag');
        if (flagImg) {
            const countryCode = lc === 'en' ? 'us' : (lc === 'pt' ? 'br' : lc);
            flagImg.src = `https://flagcdn.com/w40/${countryCode}.png`;
        }
    };

    const lang = getSelectedLang();
    setActive(lang);
    await loadLanguage(lang, true);
    applyTranslations(document);

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        toggle();
    });

    if (root && root.dataset.docBound !== '1') {
        root.dataset.docBound = '1';
        document.addEventListener('click', (e) => {
            const t = e.target;
            if (root.contains(t)) return;
            close();
        });
    }

    panel.addEventListener('click', async (e) => {
        const target = e.target;
        const opt = target && target.closest ? target.closest('[data-lang]') : null;
        if (!opt) return;
        const next = (opt.getAttribute('data-lang') || 'en').toString().trim().toLowerCase() || 'en';
        close();
        setActive(next);
        setSelectedLang(next);
        await loadLanguage(next, true);
        applyTranslations(document);
        try { renderHeaderAuthControls(); } catch (e) {}
    });
}

async function loadPublicInfo() {
    try {
        const res = await fetch('/assets/json/info.json', { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            if (data && typeof data === 'object') {
                PUBLIC_INFO = { ...PUBLIC_INFO, ...data };
            }
        }
    } catch (e) {
    }

    try {
        if (!PUBLIC_INFO.discordInviteUrl) {
            const res = await fetch('/assets/json/invitelink.json', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                if (data && typeof data.discordUrl === 'string' && data.discordUrl.trim()) {
                    PUBLIC_INFO.discordInviteUrl = data.discordUrl.trim();
                }
            }
        }
    } catch (e) {
    }
}

function renderHeaderAuthControls() {
    const container = document.getElementById('header-auth-controls');
    if (!container) return;

    const token = (localStorage.getItem('authToken') || '').toString().trim();
    let profile = null;
    try { profile = JSON.parse(localStorage.getItem('userProfile') || 'null'); } catch (e) {}

    if (token) {
        const username = profile?.username || profile?.Username || t('auth.user', 'User');
        const safeInitial = String(username || 'U').trim().slice(0, 1).toUpperCase() || 'U';
        container.innerHTML = `
            <a href="/dashboard" class="btn btn-outline btn-sm header-user-btn">
                <span class="header-user-initial">${safeInitial}</span>
                <span>${username}</span>
            </a>
            <button id="btn-logout" class="btn btn-outline btn-sm">${t('auth.logout', 'Logout')}</button>
        `;

        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('authToken');
                localStorage.removeItem('userProfile');
                window.location.href = '/';
            });
        }
        return;
    }

    container.innerHTML = `
        <a href="/auth.html#login" class="btn-diablo-premium btn-sm">${t('auth.login', 'Login')}</a>
    `.trim();

    try { renderMobileMenu(); } catch (e) {}
}

window.renderHeaderAuthControls = renderHeaderAuthControls;

// Inicializar selector de idioma del footer al cargar


function applyPublicInfoToDom() {
    try {
        const serverName = (PUBLIC_INFO.serverName || '').toString().trim();
        const season = (PUBLIC_INFO.season || '').toString().trim();

        if (serverName) {
            try {
                const titleEl = document.querySelector('head title');
                if (titleEl) {
                    const template =
                        (titleEl.getAttribute('data-title-template') || '').toString() ||
                        titleEl.textContent ||
                        '';
                    if (!titleEl.getAttribute('data-title-template')) {
                        titleEl.setAttribute('data-title-template', template);
                    }

                    const source = template || titleEl.textContent || '';
                    const next = (() => {
                        const t = String(source || '');
                        const idx = t.indexOf(' - ');
                        if (idx > 0) {
                            return `${serverName}${t.slice(idx)}`;
                        }
                        return t.replace(/\b(Mu-Olimpo|TosaMu|AzuraMu)\b/g, serverName) || serverName;
                    })();

                    titleEl.textContent = next;
                    document.title = next;
                }
            } catch (e) {
            }
        }

        if (serverName) {
            document.querySelectorAll('[alt]').forEach(el => {
                const alt = el.getAttribute('alt');
                if (!alt) return;
                const updated = alt.replace(/\b(Mu-Olimpo|TosaMu)\b/g, serverName);
                if (updated !== alt) el.setAttribute('alt', updated);
            });
        }

        if (serverName || season) {
            const updateText = (text) => {
                let t = text;
                if (serverName) t = t.replace(/\b(Mu-Olimpo|TosaMu)\b/g, serverName);
                if (season) t = t.replace(/\bSeason\s+\d+\b/gi, `Season ${season}`);
                return t;
            };

            if (document.title) {
                document.title = updateText(document.title);
            }

            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
                acceptNode(node) {
                    const p = node.parentElement;
                    if (!p) return NodeFilter.FILTER_REJECT;
                    const tag = p.tagName;
                    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEXTAREA') {
                        return NodeFilter.FILTER_REJECT;
                    }
                    const value = node.nodeValue;
                    if (!value) return NodeFilter.FILTER_REJECT;
                    if (!/(Mu-Olimpo|TosaMu|Season\s+\d+)/i.test(value)) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            });

            const nodes = [];
            while (walker.nextNode()) nodes.push(walker.currentNode);
            nodes.forEach(n => {
                const oldVal = n.nodeValue;
                const newVal = updateText(oldVal);
                if (newVal !== oldVal) n.nodeValue = newVal;
            });
        }

        const discordInviteUrl = PUBLIC_INFO.discordInviteUrl;
        if (discordInviteUrl) {
            document.querySelectorAll('a[href*="discord.gg"], a[href*="discord.com/invite"]').forEach(a => {
                a.setAttribute('href', discordInviteUrl);
            });

            document.querySelectorAll('a[data-discord-invite-link]').forEach(a => {
                a.setAttribute('href', discordInviteUrl);
            });
        }

        const facebookUrl = (PUBLIC_INFO.facebookUrl || '').toString().trim();
        if (facebookUrl) {
            document.querySelectorAll('a[data-tooltip="Follow Facebook"]').forEach(a => {
                a.setAttribute('href', facebookUrl);
            });
        }

        const youtubeUrl = (PUBLIC_INFO.youtubeUrl || '').toString().trim();
        if (youtubeUrl) {
            document.querySelectorAll('a[data-tooltip="Watch on YouTube"]').forEach(a => {
                a.setAttribute('href', youtubeUrl);
            });
        }
    } catch (e) {
    }
}

function renderFixedSocials() {
    const host = document.getElementById('fixed-socials');
    if (!host) return;

    const items = [];

    const discordInviteUrl = (PUBLIC_INFO.discordInviteUrl || '').toString().trim();
    if (discordInviteUrl) {
        items.push({
            key: 'discord',
            href: discordInviteUrl,
            label: 'Discord',
            iconClass: 'fa-brands fa-discord'
        });
    }

    const facebookUrl = (PUBLIC_INFO.facebookUrl || '').toString().trim();
    if (facebookUrl) {
        items.push({
            key: 'facebook',
            href: facebookUrl,
            label: 'Facebook',
            iconClass: 'fa-brands fa-facebook-f'
        });
    }

    const youtubeUrl = (PUBLIC_INFO.youtubeUrl || '').toString().trim();
    if (youtubeUrl) {
        items.push({
            key: 'youtube',
            href: youtubeUrl,
            label: 'YouTube',
            iconClass: 'fa-brands fa-youtube'
        });
    }

    const twitchUrl = (PUBLIC_INFO.twitchUrl || '').toString().trim();
    if (twitchUrl) {
        items.push({
            key: 'twitch',
            href: twitchUrl,
            label: 'Twitch',
            iconClass: 'fa-brands fa-twitch'
        });
    }

    const vkUrl = (PUBLIC_INFO.vkUrl || '').toString().trim();
    if (vkUrl) {
        items.push({
            key: 'vk',
            href: vkUrl,
            label: 'VK',
            iconClass: 'fa-brands fa-vk'
        });
    }

    if (!items.length) {
        host.innerHTML = '';
        host.hidden = true;
        return;
    }

    host.hidden = false;
    host.innerHTML = `
        <ul class="socials__list">
            ${items
                .map(
                    (it) => `
                        <li class="socials__item">
                            <a href="${it.href}" class="social-link btn-diablo-premium" rel="noopener noreferrer" target="_blank" aria-label="${it.label}">
                                <i class="${it.iconClass}" aria-hidden="true"></i>
                            </a>
                        </li>
                    `.trim()
                )
                .join('')}
        </ul>
    `.trim();
}

async function apiFetchJson(path) {
    try {
        const res = await fetch(API_BASE_URL + path);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        return null;
    }
}

const __eventsScheduleCache = new Map();
async function fetchJsonNoStore(url) {
    try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        return null;
    }
}

async function loadEventsSchedule(serverKey) {
    const key = String(serverKey || '').trim();
    const cacheKey = key || '__default__';
    if (__eventsScheduleCache.has(cacheKey)) return __eventsScheduleCache.get(cacheKey);

    const p = (async () => {
        if (key) {
            const perServer = await fetchJsonNoStore(`assets/json/${encodeURIComponent(key)}/events-schedule.json`);
            if (perServer && typeof perServer === 'object') return perServer.content && typeof perServer.content === 'object' ? perServer.content : perServer;
        }
        const globalCfg = await fetchJsonNoStore('assets/json/events-schedule.json');
        if (!(globalCfg && typeof globalCfg === 'object')) return null;
        return globalCfg.content && typeof globalCfg.content === 'object' ? globalCfg.content : globalCfg;
    })();

    __eventsScheduleCache.set(cacheKey, p);
    return p;
}

function parseHHMM(str) {
    const s = String(str || '').trim();
    const m = s.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
    return { hh, mm };
}

function getNextWeeklyOccurrence(now, dayOfWeek, hhmm) {
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) return null;
    const dow = Number(dayOfWeek);
    if (!Number.isFinite(dow) || dow < 0 || dow > 6) return null;
    if (!hhmm) return null;

    const start = new Date(now.getTime());
    start.setSeconds(0, 0);

    const currentDow = start.getDay();
    let delta = (dow - currentDow + 7) % 7;

    const candidate = new Date(start.getTime());
    candidate.setDate(candidate.getDate() + delta);
    candidate.setHours(hhmm.hh, hhmm.mm, 0, 0);

    if (candidate.getTime() <= now.getTime()) {
        candidate.setDate(candidate.getDate() + 7);
    }
    return candidate;
}

function formatCountdown(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const pad2 = (n) => String(n).padStart(2, '0');
    if (days > 0) return `${days}d ${pad2(hours)}h ${pad2(minutes)}m ${pad2(seconds)}s`;
    return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

async function initActiveEventsCountdown() {
    const timerEls = Array.from(document.querySelectorAll('.event-timer[data-event-key]'));
    if (!timerEls.length) return;

    const selectedServer = (localStorage.getItem('selectedServer') || '').toString().trim();
    const scheduleRaw = await loadEventsSchedule(selectedServer);
    const schedule = (scheduleRaw && typeof scheduleRaw === 'object' && scheduleRaw.content && typeof scheduleRaw.content === 'object')
        ? scheduleRaw.content
        : scheduleRaw;
    if (!schedule || typeof schedule !== 'object') return;

    // Support 2 shapes:
    // 1) Per-server file: { timezone, events: { ... } }
    // 2) Global file: { default: { timezone, events: { ... } }, <serverKey>: { ... } }
    const cfg = (schedule.events && typeof schedule.events === 'object')
        ? schedule
        : ((selectedServer && schedule[selectedServer]) ? schedule[selectedServer] : schedule.default);

    if (!cfg || typeof cfg !== 'object') return;
    const events = cfg.events || {};
    if (!events || typeof events !== 'object') return;

    const parseGmtOffsetMinutes = (tz) => {
        const s = String(tz || '').trim();
        if (!s) return null;
        const m = s.match(/^(?:GMT|UTC)\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i);
        if (!m) return null;
        const sign = m[1] === '-' ? -1 : 1;
        const hh = Number(m[2]);
        const mm = m[3] !== undefined ? Number(m[3]) : 0;
        if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
        if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
        return sign * (hh * 60 + mm);
    };

    const serverOffsetMin = parseGmtOffsetMinutes(cfg.timezone);
    const getNowUtcMs = () => Date.now();

    const getNextWeeklyOccurrenceInOffset = (nowUtcMs, offsetMin, dayOfWeek, hhmm) => {
        if (!Number.isFinite(nowUtcMs)) return null;
        const dow = Number(dayOfWeek);
        if (!Number.isFinite(dow) || dow < 0 || dow > 6) return null;
        if (!hhmm) return null;

        const off = Number(offsetMin);
        if (!Number.isFinite(off)) return null;

        const serverNow = new Date(nowUtcMs + off * 60000);
        serverNow.setUTCSeconds(0, 0);

        const currentDow = serverNow.getUTCDay();
        let delta = (dow - currentDow + 7) % 7;

        const candidateServer = new Date(serverNow.getTime());
        candidateServer.setUTCDate(candidateServer.getUTCDate() + delta);
        candidateServer.setUTCHours(hhmm.hh, hhmm.mm, 0, 0);

        if (candidateServer.getTime() <= serverNow.getTime()) {
            candidateServer.setUTCDate(candidateServer.getUTCDate() + 7);
        }

        return new Date(candidateServer.getTime() - off * 60000);
    };

    const getNextForEvent = (nowUtcMs, info) => {
        if (!info || typeof info !== 'object') return null;

        const scheduleArr = Array.isArray(info.schedule) ? info.schedule : null;
        if (scheduleArr && scheduleArr.length) {
            let best = null;
            for (const entry of scheduleArr) {
                const day = entry?.day;
                const time = entry?.time;
                const hhmm = parseHHMM(time);
                const next = (serverOffsetMin === null)
                    ? getNextWeeklyOccurrence(new Date(nowUtcMs), day, hhmm)
                    : getNextWeeklyOccurrenceInOffset(nowUtcMs, serverOffsetMin, day, hhmm);
                if (!next) continue;
                if (!best || next.getTime() < best.getTime()) best = next;
            }
            return best;
        }

        const hhmm = parseHHMM(info.time);
        return (serverOffsetMin === null)
            ? getNextWeeklyOccurrence(new Date(nowUtcMs), info.dayOfWeek, hhmm)
            : getNextWeeklyOccurrenceInOffset(nowUtcMs, serverOffsetMin, info.dayOfWeek, hhmm);
    };

    const getDisplayCorner = (info, nextDate) => {
        if (!info || typeof info !== 'object') return null;

        const scheduleArr = Array.isArray(info.schedule) ? info.schedule : null;
        if (scheduleArr && scheduleArr.length && nextDate instanceof Date && Number.isFinite(nextDate.getTime())) {
            if (serverOffsetMin === null) {
                const nextDow = nextDate.getDay();
                const hh = String(nextDate.getHours()).padStart(2, '0');
                const mm = String(nextDate.getMinutes()).padStart(2, '0');
                return { dayLabel: dayOfWeekLabel(nextDow), timeLabel: `${hh}:${mm}` };
            }

            const serverNext = new Date(nextDate.getTime() + serverOffsetMin * 60000);
            const nextDow = serverNext.getUTCDay();
            const hh = String(serverNext.getUTCHours()).padStart(2, '0');
            const mm = String(serverNext.getUTCMinutes()).padStart(2, '0');
            return { dayLabel: dayOfWeekLabel(nextDow), timeLabel: `${hh}:${mm}` };
        }

        return {
            dayLabel: dayOfWeekLabel(info.dayOfWeek),
            timeLabel: String(info.time || '').trim(),
        };
    };

    const update = () => {
        const nowUtcMs = getNowUtcMs();
        timerEls.forEach(el => {
            const key = (el.getAttribute('data-event-key') || '').toString().trim();
            const info = events[key];
            const valueEl = el.querySelector('.event-timer__value');
            if (!valueEl) return;
            if (!info) {
                valueEl.textContent = '--:--:--';
                return;
            }

            const slide = el.closest ? el.closest('.slide') : null;
            const corner = slide ? slide.querySelector(`.event-corner[data-event-key="${CSS.escape(String(key))}"]`) : null;

            const next = getNextForEvent(nowUtcMs, info);
            if (!next) {
                valueEl.textContent = '--:--:--';
                return;
            }

            if (corner) {
                const dayEl = corner.querySelector('.event-corner__day');
                const timeEl = corner.querySelector('.event-corner__time');
                const display = getDisplayCorner(info, next);
                if (display) {
                    if (dayEl && display.dayLabel) dayEl.textContent = display.dayLabel;
                    if (timeEl && display.timeLabel) timeEl.textContent = display.timeLabel;
                }
            }

            const diff = next.getTime() - nowUtcMs;
            valueEl.textContent = formatCountdown(diff);
        });
    };

    update();
    setInterval(update, 1000);
}

let __serversConfigPromise = null;
let __serversConfigTs = 0;
async function getServersConfigCached(force = false) {
    const ttlMs = 5 * 60 * 1000;
    const now = Date.now();
    if (!force && __serversConfigPromise && (now - __serversConfigTs) < ttlMs) return __serversConfigPromise;

    __serversConfigTs = now;
    __serversConfigPromise = apiFetchJson('/auth/servers');
    try {
        const data = await __serversConfigPromise;
        if (data && typeof data === 'object') {
            try {
                sessionStorage.setItem('serversConfigCache', JSON.stringify({ ts: now, data }));
            } catch (e) {}
        }
        return data;
    } catch (e) {
        // fallback to session cache
        try {
            const raw = sessionStorage.getItem('serversConfigCache');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed?.data) return parsed.data;
            }
        } catch (e2) {}
        return null;
    }
}

const __onlineCountCache = new Map();
async function getOnlineCountCached(serverType, force = false) {
    const ttlMs = 30 * 1000;
    const key = String(serverType || '');
    if (!key) return { onlineCount: 0, ms: null };

    const now = Date.now();
    const existing = __onlineCountCache.get(key);
    if (!force && existing && existing.promise && (now - (existing.ts || 0)) < ttlMs) {
        return existing.promise;
    }

    const promise = (async () => {
        const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const d = await apiFetchJson(`/auth/online-count?serverType=${encodeURIComponent(key)}`);
        const t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const rawMs = Math.max(0, Math.round(t1 - t0));
        const ms = Number.isFinite(rawMs) ? (Math.round(rawMs / 5) * 5) : null;
        const onlineCount = d && typeof d.onlineCount === 'number' ? d.onlineCount : 0;
        return { onlineCount, ms };
    })().catch(() => ({ onlineCount: 0, ms: null }));

    __onlineCountCache.set(key, { ts: now, promise });
    return promise;
}

function getStoredOnlineStats(serverType) {
    const key = String(serverType || '');
    if (!key) return null;
    try {
        const raw = localStorage.getItem(`serverOnlineCache:${key}`);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        const ts = Number(parsed.ts || 0);
        if (!Number.isFinite(ts) || ts <= 0) return null;

        // Keep cached display stable for a short window to avoid jumpy refreshes
        const ttlMs = 2 * 60 * 1000;
        if ((Date.now() - ts) > ttlMs) return null;

        const onlineCount = typeof parsed.onlineCount === 'number' ? parsed.onlineCount : null;
        const ms = typeof parsed.ms === 'number' ? parsed.ms : null;
        if (onlineCount === null && ms === null) return null;
        return { onlineCount: onlineCount ?? 0, ms };
    } catch (e) {
        return null;
    }
}

function storeOnlineStats(serverType, stats) {
    const key = String(serverType || '');
    if (!key) return;
    try {
        localStorage.setItem(
            `serverOnlineCache:${key}`,
            JSON.stringify({ ts: Date.now(), onlineCount: stats?.onlineCount ?? 0, ms: stats?.ms ?? null })
        );
    } catch (e) {
    }
}

async function apiFetch(endpoint, options = {}) {
    const authToken = localStorage.getItem('authToken');
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(API_BASE_URL + endpoint, { ...options, headers });
    if (res.status === 204) return { success: true };
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const msg = data.message || `API Error: ${res.status}`;
        throw new Error(msg);
    }
    return data;
}

async function handleServerSwitch(next, servers) {
    const current = (localStorage.getItem('selectedServer') || '').toString().trim();
    const nextKey = (next || '').toString().trim();
    if (!nextKey || current === nextKey) return;

    const token = (localStorage.getItem('authToken') || '').toString().trim();
    if (!token) {
        localStorage.setItem('selectedServer', nextKey);
        window.SELECTED_SERVER_FILES = (servers?.[nextKey]?.server_files || 'IGCN').toString();
        window.location.reload();
        return;
    }

    let profile = null;
    try { profile = JSON.parse(localStorage.getItem('userProfile') || 'null'); } catch (e) {}

    const username = (profile?.username || profile?.Username || '').toString().trim();
    const email = (profile?.email || profile?.Email || '').toString().trim();
    const country = (profile?.Country || profile?.country || 'ro').toString().trim() || 'ro';

    const nextServer = servers && servers[nextKey] ? servers[nextKey] : null;
    const nextLabel = nextServer ? (nextServer.displayName || nextServer.name || nextServer.title || nextKey) : nextKey;
    const password = await promptModal({
        title: `${t('dashboard.server', 'Server')} ${String(nextLabel || '').trim() ? `- ${String(nextLabel).trim()}` : ''}`,
        message: `Enter your password to switch to ${String(nextLabel || nextKey)}`,
        label: t('auth.password', 'Password'),
        inputType: 'password',
        iconClass: 'fas fa-lock',
        okText: 'OK',
        cancelText: 'Cancel',
    });
    if (!password) {
        showNotification('error', 'Server switch cancelled');
        return;
    }

    const looksLikeMissingUser = (msg) => {
        const m = String(msg || '').toLowerCase();
        return (
            m.includes('not found') ||
            m.includes('does not exist') ||
            m.includes('account not found') ||
            m.includes('user not found') ||
            (m.includes('no account') && m.includes('found'))
        );
    };

    const getCaptchaPayload = async () => {
        try {
            const hv = await apiFetchJson(`/auth/human-verification?serverType=${encodeURIComponent(nextKey)}`);
            if (!hv || hv.success !== true || !hv.captchaId) return null;
            const display = String(hv.display || '').trim() || '-';
            const captchaId = String(hv.captchaId || '').trim();
            const captchaCodeRaw = await promptModal({
                title: t('auth.human_verification', 'Human Verification'),
                message: `${t('auth.enter_code', 'Enter the code')}: ${display}`,
                label: t('auth.enter_code', 'Enter the code'),
                inputType: 'text',
                iconClass: 'fas fa-shield',
                okText: 'OK',
                cancelText: 'Cancel',
            });
            const captchaCode = (captchaCodeRaw || '').toString().trim().toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '');
            if (!captchaId || !captchaCode) return null;
            return { captchaId, captchaCode };
        } catch (e) {
            return null;
        }
    };

    const doLogin = async (twoFactorCode) => {
        const body = { username, password, serverType: nextKey };
        if (twoFactorCode) body.twoFactorCode = twoFactorCode;

        const cap = await getCaptchaPayload();
        if (cap) {
            body.captchaId = cap.captchaId;
            body.captchaCode = cap.captchaCode;
        }
        return await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) });
    };

    const doRegister = async () => {
        const body = {
            username,
            email,
            password,
            confirmPassword: password,
            country,
            serverType: nextKey,
            referralCode: ''
        };
        return await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) });
    };

    try {
        if (!username || !email) {
            showNotification('error', 'Profile missing username/email. Please login again.');
            return;
        }

        let loginData = await doLogin();
        if (loginData && loginData.twoFactorRequired) {
            const code = await promptModal({
                title: 'Two-Factor Authentication',
                message: 'Enter 2FA code',
                label: t('dashboard.twofa', '2FA'),
                inputType: 'text',
                iconClass: 'fas fa-key',
                okText: 'OK',
                cancelText: 'Cancel',
            });
            if (!code) {
                showNotification('error', 'Two-factor authentication required');
                return;
            }
            loginData = await doLogin(code);
        }

        if (loginData && loginData.success !== false && loginData.token) {
            localStorage.setItem('authToken', loginData.token);
            if (loginData.profile) localStorage.setItem('userProfile', JSON.stringify(loginData.profile));
            localStorage.setItem('selectedServer', nextKey);
            window.SELECTED_SERVER_FILES = (servers?.[nextKey]?.server_files || 'IGCN').toString();
            window.location.reload();
            return;
        }

        const msg = loginData?.message || 'Login failed';
        if (!looksLikeMissingUser(msg)) {
            showNotification('error', msg);
            return;
        }

        const regData = await doRegister();
        if (regData && regData.success === false) {
            showNotification('error', regData?.message || 'Registration failed');
            return;
        }

        let loginData2 = await doLogin();
        if (loginData2 && loginData2.twoFactorRequired) {
            const code2 = await promptModal({
                title: 'Two-Factor Authentication',
                message: 'Enter 2FA code',
                label: t('dashboard.twofa', '2FA'),
                inputType: 'text',
                iconClass: 'fas fa-key',
                okText: 'OK',
                cancelText: 'Cancel',
            });
            if (!code2) {
                showNotification('error', 'Two-factor authentication required');
                return;
            }
            loginData2 = await doLogin(code2);
        }

        if (!loginData2 || loginData2.success === false || !loginData2.token) {
            showNotification('error', loginData2?.message || 'Login failed');
            return;
        }

        localStorage.setItem('authToken', loginData2.token);
        if (loginData2.profile) localStorage.setItem('userProfile', JSON.stringify(loginData2.profile));
        localStorage.setItem('selectedServer', nextKey);
        window.SELECTED_SERVER_FILES = (servers?.[nextKey]?.server_files || 'IGCN').toString();
        window.location.reload();
    } catch (err) {
        showNotification('error', err?.message || 'Server switch failed');
    }
}

async function renderServersFromApi() {
    const grid = document.getElementById('servers');
    if (!grid) return;

    const servers = await getServersConfigCached(true);
    if (!servers || typeof servers !== 'object') return;

    const keys = Object.keys(servers);
    if (!keys.length) return;

    const storedSelected = (localStorage.getItem('selectedServer') || '').toString().trim();
    const selectedServer = (storedSelected && servers[storedSelected]) ? storedSelected : keys[0];
    if (selectedServer) localStorage.setItem('selectedServer', selectedServer);
    window.SELECTED_SERVER_FILES = (servers[selectedServer]?.server_files || 'IGCN').toString();

    const cfg = servers[selectedServer] || {};
    const openingDate = (cfg.grandOpeningDate || cfg.openingDate || '').toString();
    const openingTs = openingDate ? new Date(openingDate).getTime() : NaN;
    const isFuture = Number.isFinite(openingTs) ? (openingTs > Date.now()) : false;

    const heroHost = document.getElementById('hero-countdown-host');
    
    const cached = getStoredOnlineStats(selectedServer) || {};
    const onlineCount = cached.onlineCount ?? 0;

    const expRate = (cfg.expRate ?? cfg.exp_rate ?? '').toString().trim();
    const dropRate = (cfg.dropRate ?? cfg.drop_rate ?? cfg.drop ?? cfg.dropPercent ?? '').toString().trim();
    const season = (PUBLIC_INFO?.season || cfg.season || '').toString().trim();
    const statusText = isFuture ? t('server.status.grand_opening', 'GRAND OPENING') : t('server.status.online', 'ONLINE');
    // Track peak online count
    const peakKey = `serverPeakCache:${selectedServer}`;
    let peakCount = 0;
    try {
        const rawPeak = localStorage.getItem(peakKey);
        if (rawPeak) {
            const parsed = JSON.parse(rawPeak);
            peakCount = typeof parsed.peak === 'number' ? parsed.peak : 0;
        }
    } catch (e) {}
    if (onlineCount > peakCount) {
        peakCount = onlineCount;
        try { localStorage.setItem(peakKey, JSON.stringify({ peak: peakCount, ts: Date.now() })); } catch (e) {}
    }
    const peakLabel = peakCount > 0 ? `PEAK: ${Number(peakCount).toLocaleString()}` : '';

    grid.innerHTML = `
        <div class="home-stat" data-stat-type="online">
            <div class="home-stat__icon"><i class="fas fa-users"></i></div>
            <div class="home-stat__value" data-home-stat="online">${Number(onlineCount || 0).toLocaleString()}</div>
            <div class="home-stat__label" data-i18n="stats.online">ONLINE</div>
            ${peakLabel ? `<div class="home-stat__sub">${peakLabel}</div>` : ''}
        </div>
        <div class="home-stat is-active" data-stat-type="status">
            <div class="home-stat__icon"><i class="fas fa-signal"></i></div>
            <div class="home-stat__value" data-home-stat="status">${statusText}</div>
            <div class="home-stat__label" data-i18n="stats.status">STATUS</div>
        </div>
        <div class="home-stat" data-stat-type="season">
            <div class="home-stat__icon"><i class="fas fa-crown"></i></div>
            <div class="home-stat__value" data-home-stat="season">${season || '-'}</div>
            <div class="home-stat__label" data-i18n="stats.season">SEASON</div>
        </div>
        <div class="home-stat" data-stat-type="exp">
            <div class="home-stat__icon"><i class="fas fa-bolt"></i></div>
            <div class="home-stat__value" data-home-stat="exp">${expRate || '-'}</div>
            <div class="home-stat__label" data-i18n="stats.exp">EXP</div>
        </div>
        <div class="home-stat" data-stat-type="drop">
            <div class="home-stat__icon"><i class="fas fa-percent"></i></div>
            <div class="home-stat__value" data-home-stat="drop">${dropRate || '-'}</div>
            <div class="home-stat__label" data-i18n="stats.drop">DROP</div>
        </div>
    `.trim();

    try { initCountdownTimers(document); } catch (e) {}

    try { renderLauncherFeatureCards(servers, selectedServer); } catch (e) {}
    try { await renderPlaytimeRewardsSection(servers, selectedServer); } catch (e) {}

    // Refresh real online stats for selected server
    getOnlineCountCached(selectedServer, true)
        .then(s => {
            if (!s) return;
            storeOnlineStats(selectedServer, s);
            const onlineEl = grid.querySelector('[data-home-stat="online"]');
            if (onlineEl) onlineEl.textContent = Number(s.onlineCount || 0).toLocaleString();
            try {
                initHeroAnnouncementRotator();
            } catch (e) {}
        })
        .catch(() => {});
}

function initHeroVideoOptimization() {
    const video = document.querySelector('.origin-hero__video, .hero-video');
    if (!video) return;
    if (video.dataset.optimized === '1') return;
    video.dataset.optimized = '1';
    const customLoopEndSeconds = 97;

    video.muted = true;
    video.autoplay = true;
    video.loop = true;
    if (!video.getAttribute('playsinline')) {
        video.setAttribute('playsinline', '');
    }
    if (!video.getAttribute('webkit-playsinline')) {
        video.setAttribute('webkit-playsinline', '');
    }

    if (video.preload !== 'auto') {
        video.preload = 'auto';
    }

    if (video.readyState < 2) {
        try { video.load(); } catch (e) {}
    }

    // Ensure video plays
    const playPromise = video.play();
    if (playPromise !== undefined) {
        playPromise.catch(() => {
            video.muted = true;
            video.play().catch(() => {});
        });
    }

    const enforceCustomLoop = () => {
        if (!Number.isFinite(video.currentTime)) return;
        if (video.currentTime < customLoopEndSeconds) return;
        video.currentTime = 0;
        if (video.paused) {
            video.play().catch(() => {});
        }
    };

    video.addEventListener('timeupdate', enforceCustomLoop, { passive: true });

    // Optimize video on scroll
    let ticking = false;
    const updateVideoOpacity = () => {
        const scroll = window.scrollY;
        const heroHeight = video.parentElement?.offsetHeight || window.innerHeight;
        const progress = Math.min(scroll / (heroHeight * 0.5), 1);

        if (progress > 0) {
            video.style.opacity = Math.max(0.3, 0.6 - (progress * 0.2));
        } else {
            video.style.opacity = 0.6;
        }
        ticking = false;
    };

    let scrollListener = () => {
        if (!ticking) {
            requestAnimationFrame(updateVideoOpacity);
            ticking = true;
        }
    };

    window.addEventListener('scroll', scrollListener, { passive: true });
}

function initHeroMotion() {
    const hero = document.querySelector('.origin-hero');
    if (!hero) return;
    if (hero.dataset.motionBound === '1') return;
    hero.dataset.motionBound = '1';

    const enable = () => {
        hero.classList.add('is-ready');
    };

    requestAnimationFrame(enable);

    // Initialize video optimization
    try { initHeroVideoOptimization(); } catch (e) {}
}

// Start hero video as soon as the deferred script executes,
// without waiting for DOMContentLoaded.
if (document.body && document.body.classList.contains('page-home')) {
    try { initHeroVideoOptimization(); } catch (e) {}
}

function initHeroQuickLinks() {
    const discordLink = document.getElementById('hero-quick-discord');
    if (!discordLink) return;

    const invite = (PUBLIC_INFO && PUBLIC_INFO.discordInviteUrl ? String(PUBLIC_INFO.discordInviteUrl) : '').trim();
    if (invite) {
        discordLink.href = invite;
        discordLink.hidden = false;
    } else {
        discordLink.hidden = true;
    }
}

function initHeroAnnouncementRotator() {
    const host = document.getElementById('hero-announcement-text');
    if (!host) return;
    const announce = host.closest('.origin-hero__announce');

    const buildMessages = () => {
        const online = (document.querySelector('[data-home-stat="online"]')?.textContent || '-').trim();
        const season = (document.querySelector('[data-home-stat="season"]')?.textContent || '-').trim();
        const exp = (document.querySelector('[data-home-stat="exp"]')?.textContent || '-').trim();
        const drop = (document.querySelector('[data-home-stat="drop"]')?.textContent || '-').trim();

        return [
            `${t('stats.online', 'ONLINE')}: ${online}`,
            `${t('stats.season', 'SEASON')}: ${season} · ${t('stats.exp', 'EXP')}: ${exp} · ${t('stats.drop', 'DROP')}: ${drop}`,
            `${t('home.latest_news_sub', 'Updates, events, and new features from the realm.')}`
        ].filter(Boolean);
    };

    let index = 0;
    const rotate = () => {
        const messages = buildMessages();
        if (!messages.length) return;
        if (index >= messages.length) index = 0;
        if (announce) {
            announce.classList.remove('is-swap');
            void announce.offsetWidth;
            announce.classList.add('is-swap');
        }
        host.textContent = messages[index];
        index += 1;
    };

    rotate();
    if (__heroAnnouncementInterval) clearInterval(__heroAnnouncementInterval);
    __heroAnnouncementInterval = setInterval(rotate, 4200);
}

function initHomeNewsModal() {
    const modal = document.getElementById('newsModal');
    if (!modal) return;
    const close = () => {
        modal.hidden = true;
        document.body.classList.remove('news-modal-open');
    };

    modal.querySelectorAll('[data-action="close"]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            close();
        });
    });

    document.addEventListener('keydown', (e) => {
        if (modal.hidden) return;
        if ((e && e.key) === 'Escape') close();
    });
}

async function renderHomeNews() {
    const host = document.getElementById('home-news-list');
    if (!host) return;

    const serverType = (localStorage.getItem('selectedServer') || '').toString().trim();
    if (!serverType) {
        host.innerHTML = '';
        return;
    }

    const lang = (localStorage.getItem('selectedLang') || 'en').toString().trim().toLowerCase() || 'en';

    const fetchJson = async (path) => {
        try {
            const res = await fetch(`${window.location.origin}${path}`, { cache: 'no-store' });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            return null;
        }
    };

    let list = await fetchJson(`/news?serverType=${encodeURIComponent(serverType)}&lang=${encodeURIComponent(lang)}`);
    let items = Array.isArray(list) ? list : [];
    if (!items.length) {
        list = await fetchJson(`/news?serverType=${encodeURIComponent(serverType)}`);
        items = Array.isArray(list) ? list : [];
    }

    if (!items.length) {
        host.innerHTML = '';
        return;
    }

    const formatNewsDateShort = (value) => {
        const v = (value || '').toString().trim();
        if (!v) return '';
        const dt = new Date(v);
        if (!Number.isFinite(dt.getTime())) return v;
        const dd = String(dt.getDate()).padStart(2, '0');
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const yy = dt.getFullYear();
        return `${yy}-${mm}-${dd}`;
    };

    const makeExcerpt = (value, maxLen = 120) => {
        const raw = (value || '').toString();
        const clean = raw
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (!clean) return '';
        if (clean.length <= maxLen) return clean;
        return `${clean.slice(0, maxLen).trim()}...`;
    };

    const top = items.slice(0, 3);
    host.innerHTML = top.map(n => {
        const id = Number(n.id ?? n.ID ?? n.newsId ?? n.newsID ?? n.news_id ?? NaN);
        const title = (n.title || n.Title || n.name || n.Name || '').toString().trim() || '-';
        const tag = (n.tag || n.Tag || n.type || n.Type || 'NEWS').toString().trim().toUpperCase();
        const isEvent = /\bevent\b|\bevento\b/i.test(tag);
        const dateRaw = n.date || n.Date || n.createdAt || n.created_at || n.created || n.time || n.timestamp;
        const date = formatNewsDateShort(dateRaw);
        const desc = makeExcerpt(n.desc || n.description || n.summary || n.content || n.body || n.text || n.message || '', 120);
        return `
            <a class="home-news-item${isEvent ? ' home-news-item--event' : ''}" href="#" data-news-id="${Number.isFinite(id) ? id : ''}">
                <div class="home-news-item__meta">
                    <span class="home-news-item__badge">${escapeHtml(tag)}</span>
                    <span class="home-news-item__date">${escapeHtml(date)}</span>
                </div>
                <div class="home-news-item__body">
                    <div class="home-news-item__title">${escapeHtml(title)}</div>
                    <div class="home-news-item__desc">${escapeHtml(desc)}</div>
                </div>
                <span class="home-news-item__more" data-i18n="home.cards.read_more">READ MORE <i class="fas fa-chevron-right" aria-hidden="true"></i></span>
            </a>
        `.trim();
    }).join('');

    host.querySelectorAll('[data-news-id]').forEach(a => {
        a.addEventListener('click', async (e) => {
            e.preventDefault();
            const id = Number(a.getAttribute('data-news-id') || 0);
            if (!Number.isFinite(id) || id <= 0) return;
            let item = await fetchJson(`/news/${id}?serverType=${encodeURIComponent(serverType)}&lang=${encodeURIComponent(lang)}`);
            if (!item) {
                item = await fetchJson(`/news/${id}?serverType=${encodeURIComponent(serverType)}`);
            }
            if (!item) return;

            const modal = document.getElementById('newsModal');
            if (!modal) return;
            const tagEl = document.getElementById('news-modal-tag');
            const dateEl = document.getElementById('news-modal-date');
            const titleEl = document.getElementById('news-modal-title');
            const contentEl = document.getElementById('news-modal-content');

            const tag = (item.tag || item.type || item.category || 'NEWS').toString().trim().toUpperCase();
            const title = (item.title || item.Title || item.name || '').toString().trim() || 'News';
            const rawDate = (item.date || item.Date || item.createdAt || item.created_at || '').toString().trim();
            const content = (item.content || item.body || item.text || item.message || '').toString();

            const formatNewsDate = (value) => {
                const v = (value || '').toString().trim();
                if (!v) return '';
                const dt = new Date(v);
                if (!Number.isFinite(dt.getTime())) return v;
                const dd = String(dt.getDate()).padStart(2, '0');
                const mm = String(dt.getMonth() + 1).padStart(2, '0');
                const yy = dt.getFullYear();
                const hh = String(dt.getHours()).padStart(2, '0');
                const mi = String(dt.getMinutes()).padStart(2, '0');
                // If time looks like midnight, show only date
                if (hh === '00' && mi === '00') return `${dd}/${mm}/${yy}`;
                return `${dd}/${mm}/${yy} ${hh}:${mi}`;
            };

            if (tagEl) tagEl.textContent = tag;
            if (dateEl) dateEl.textContent = formatNewsDate(rawDate);
            if (titleEl) titleEl.textContent = title;
            if (contentEl) contentEl.innerHTML = content;

            modal.hidden = false;
            document.body.classList.add('news-modal-open');
        });
    });
}

async function renderHomeHallOfFame() {
    const host = document.getElementById('home-fame-list');
    if (!host) return;

    const serverType = (localStorage.getItem('selectedServer') || '').toString().trim();
    if (!serverType) {
        host.innerHTML = '';
        return;
    }

    const fetchJson = async (path) => {
        try {
            const res = await fetch(`${window.location.origin}${path}`, { cache: 'no-store' });
            if (!res.ok) return null;
            return await res.json();
        } catch (e) {
            return null;
        }
    };

    const players = await fetchJson(`/top-ranking-characters?serverType=${encodeURIComponent(serverType)}`);
    const playerRows = Array.isArray(players) ? players : [];

    const safeText = (v) => String(v ?? '');
    const toNum = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };

    const getClass = (classId) => {
        try {
            const serverFiles = (window.SELECTED_SERVER_FILES || localStorage.getItem('selectedServerFiles') || 'IGCN').toString();
            if (typeof window.getCharacterClassData === 'function') {
                const d = window.getCharacterClassData(serverFiles, Number(classId) || 0);
                if (Array.isArray(d) && d.length >= 2) return { name: String(d[0] || ''), abbr: String(d[1] || ''), file: String(d[2] || '') };
            }
        } catch (e) {}
        return { name: '', abbr: '', file: '' };
    };

    const classImagePath = (classId) => {
        const cls = getClass(classId);
        const normalizeIconFilename = (filename) => {
            const f = safeText(filename).trim().replace(/\\/g, '/');
            const base = f.split('/').pop() || '';
            const m = /^(.+?)\.([a-z0-9]+)$/i.exec(base);
            if (!m) return '';
            const name = safeText(m[1]).toUpperCase();
            const ext = safeText(m[2]).toLowerCase();
            return `${name}.${ext}`;
        };

        const fromConstants = normalizeIconFilename(cls.file);
        if (fromConstants) {
            return `assets/icon/nowclass/${encodeURIComponent(fromConstants)}`;
        }

        const raw = safeText(cls.abbr).toUpperCase();
        const alias = {
            AF: 'AC',
            ACM: 'AC',
            AMM: 'AC',
            CR: 'AC',
            FEL: 'DL',
            EL: 'DL',
            ER: 'DL',
            FE: 'ELF',
            RE: 'ELF',
            HE: 'ELF',
            NE: 'ELF'
        };
        const normalized = alias[raw] || raw || 'DW';
        return `assets/icon/nowclass/${encodeURIComponent(normalized)}.png`;
    };

    const classImageFallbackPath = (classId) => {
        return classImagePath(classId);
    };

    const avatarSrc = (avatar) => {
        const raw = (avatar || '').toString().trim();
        if (!raw) return '';
        if (raw === 'null' || raw === 'undefined') return '';

        if (/^https?:\/\//i.test(raw) || /^data:image\//i.test(raw)) return raw;

        const a = raw.replace(/\\/g, '/');
        // If backend returns a relative file path
        if (a.startsWith('/')) return a;
        if (a.startsWith('assets/')) return `/${a}`;
        if (a.startsWith('uploads/')) return `/${a}`;
        return a;
    };

    const top = playerRows.slice(0, 5).map((p, idx) => {
        const name = (p?.Name ?? p?.CharacterName ?? p?.name ?? '').toString().trim() || '-';
        const classId = toNum(p?.Class ?? p?.CClass ?? p?.classId ?? p?.class ?? 0);
        const level = toNum(p?.cLevel ?? p?.Level ?? p?.level ?? 0);
        const masterLevel = toNum(p?.mLevel ?? p?.MasterLevel ?? p?.ML ?? 0);
        const resets = toNum(p?.Resets ?? p?.RESETS ?? p?.resets ?? 0);
        const grandResets = toNum(p?.GrandResets ?? p?.GR ?? p?.grandResets ?? p?.grand_resets ?? 0);
        const av = avatarSrc(p?.Avatar ?? p?.avatar ?? '');
        const mainImg = av ? av : classImagePath(classId);

        return {
            rank: idx + 1,
            name,
            level,
            masterLevel,
            resets,
            grandResets,
            classId,
            mainImg,
            medal: idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : null
        };
    });

    const showGR = top.some(x => (Number(x?.grandResets) || 0) > 0);

    if (!top.length) {
        host.innerHTML = '';
        return;
    }

    const rows = top.map(r => {
        const rr = (r.resets > 0) ? `<span class="home-fame__pill" title="Resets"><strong>${escapeHtml(String(r.resets))}</strong></span>` : '';
        const gr = (showGR && r.grandResets > 0) ? `<span class="home-fame__pill" title="Grand Resets"><strong>${escapeHtml(String(r.grandResets))}</strong></span>` : '';
        const pills = (rr && gr)
            ? `${rr}<span class="home-fame__sep" aria-hidden="true">/</span>${gr}`
            : (rr || gr || '');
        const medalEmoji = r.medal === 'gold' ? '🥇' : r.medal === 'silver' ? '🥈' : r.medal === 'bronze' ? '🥉' : '';

        return `
            <div class="home-fame__row${r.medal ? ` home-fame__row--${r.medal}` : ''}">
                <span class="home-fame__name">
                    <span class="home-fame__avatar">
                        <img src="${escapeHtml(String(r.mainImg))}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(String(classImageFallbackPath(r.classId)))}'" />
                        <span class="home-fame__rank">${escapeHtml(String(r.rank))}</span>
                    </span>
                    <span class="home-fame__name-text">${escapeHtml(String(r.name))}</span>
                </span>
                ${medalEmoji ? `<span class="home-fame__medal">${medalEmoji}</span>` : '<span></span>'}
                <span class="home-fame__mlvl">${escapeHtml(String(r.level))}</span>
                <span class="home-fame__pills">${pills || ''}</span>
            </div>
        `.trim();
    }).join('');

    host.innerHTML = `
        <div class="home-fame__head">
            <span class="home-fame__hcol" data-i18n="home.hof.warrior">WARRIOR</span>
            <span class="home-fame__hcol home-fame__hcol--right"></span>
            <span class="home-fame__hcol home-fame__hcol--right">LV</span>
            <span class="home-fame__hcol home-fame__hcol--right">${showGR ? 'RR / GR' : 'RR'}</span>
        </div>
        <div class="home-fame__list">${rows}</div>
        <a class="home-fame__foot" href="/ranking" data-i18n="home.hof.view_ranking">VIEW FULL RANKING</a>
    `.trim();
}

function initCountdownTimers(root = document) {
    const timers = root.querySelectorAll('.countdown-timer');
    timers.forEach(timer => {
        if (timer.dataset.timerBound === '1') return;
        timer.dataset.timerBound = '1';

        const targetDate = new Date(timer.getAttribute('data-date')).getTime();
        if (!Number.isFinite(targetDate)) {
            timer.style.display = 'none';
            return;
        }
        const updateTimer = () => {
            const now = new Date().getTime();
            const distance = targetDate - now;
            if (distance < 0) {
                const parent = timer.closest('.home-stat--opening');
                if (parent) {
                    parent.style.opacity = '0';
                    setTimeout(() => {
                        parent.style.display = 'none';
                    }, 500);
                }
                timer.innerHTML = `<div style="color:#00ff41; font-weight:bold;">${t('server.live_now', 'SERVER LIVE NOW!')}</div>`;
                return;
            }
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            const updateVal = (selector, newVal) => {
                const el = timer.querySelector(selector);
                if (!el) return;
                const oldVal = el.innerText;
                const fmt = String(newVal).padStart(2, '0');
                if (oldVal !== fmt) {
                    el.innerText = fmt;
                    // Trigger peak animation
                    el.classList.remove('tick-anim');
                    void el.offsetWidth; // Force reflow
                    el.classList.add('tick-anim');
                }
            };

            updateVal('.days', days);
            updateVal('.hours', hours);
            updateVal('.minutes', minutes);
            updateVal('.seconds', seconds);
        };

        setInterval(updateTimer, 1000);
        updateTimer();
    });
}

function initCardTiltEffect(root = document) {
    try {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    } catch (e) {}

    try {
        if (window.matchMedia && !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    } catch (e) {}

    const bindTilt = (el, cfg) => {
        if (!el) return;
        if (el.dataset.tiltBound === '1') return;
        el.dataset.tiltBound = '1';

        const onMove = (e) => {
            const r = el.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width;
            const py = (e.clientY - r.top) / r.height;
            const cx = px - 0.5;
            const cy = py - 0.5;

            const rotY = cx * cfg.maxDeg;
            const rotX = -cy * cfg.maxDeg;

            el.style.transform = `perspective(1100px) translateZ(${cfg.z}px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale(${cfg.scale})`;
        };

        const onLeave = () => {
            el.style.transform = '';
        };

        el.addEventListener('mousemove', onMove);
        el.addEventListener('mouseleave', onLeave);
        el.addEventListener('blur', onLeave, true);
    };

    const cards = root.querySelectorAll('.server-card, .champion-card, .team-card, .playtime-card');
    cards.forEach(card => bindTilt(card, { maxDeg: 10, scale: 1.03, z: 0 }));

    const slider = root.querySelectorAll('.slider-container');
    slider.forEach(s => bindTilt(s, { maxDeg: 8, scale: 1.01, z: 0 }));

    const avatars = root.querySelectorAll('.streaming-avatar-btn');
    avatars.forEach(a => bindTilt(a, { maxDeg: 14, scale: 1.08, z: 6 }));
}

function guildMarkHexToDataUrl(hex, size = 34) {
    const raw = (hex || '').toString().trim();
    if (!raw) return '';
    if (/^data:image\//i.test(raw) || /^https?:\/\//i.test(raw)) return raw;
    if (!/^[0-9a-fA-F]+$/.test(raw)) return '';

    try {
        const bytes = new Uint8Array(raw.length / 2);
        for (let i = 0; i < raw.length; i += 2) {
            bytes[i / 2] = parseInt(raw.slice(i, i + 2), 16);
        }

        const nibbles = [];
        for (const b of bytes) {
            nibbles.push((b >> 4) & 0xF);
            nibbles.push(b & 0xF);
        }
        if (nibbles.length < 64) return '';

        const palette = [
            [0, 0, 0, 0],
            [0, 0, 0, 255],
            [255, 255, 255, 255],
            [255, 0, 0, 255],
            [0, 255, 0, 255],
            [0, 0, 255, 255],
            [255, 255, 0, 255],
            [255, 0, 255, 255],
            [0, 255, 255, 255],
            [160, 160, 160, 255],
            [128, 64, 0, 255],
            [255, 128, 0, 255],
            [0, 128, 128, 255],
            [128, 0, 128, 255],
            [0, 128, 0, 255],
            [128, 0, 0, 255]
        ];

        const canvas = document.createElement('canvas');
        canvas.width = 8;
        canvas.height = 8;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';
        const img = ctx.createImageData(8, 8);
        for (let i = 0; i < 64; i++) {
            const idx = nibbles[i] & 0xF;
            const c = palette[idx] || palette[0];
            const off = i * 4;
            img.data[off] = c[0];
            img.data[off + 1] = c[1];
            img.data[off + 2] = c[2];
            img.data[off + 3] = c[3];
        }
        ctx.putImageData(img, 0, 0);

        const out = document.createElement('canvas');
        out.width = size;
        out.height = size;
        const octx = out.getContext('2d');
        if (!octx) return '';
        octx.imageSmoothingEnabled = false;
        octx.drawImage(canvas, 0, 0, size, size);
        return out.toDataURL('image/png');
    } catch (e) {
        return '';
    }
}

async function loadAndRenderEventChampions() {
    const grid = document.querySelector('.champions-grid');
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll('.champion-card'));
    if (cards.length < 3) return;

    const getClassAbbr = (id) => {
        const raw = Number(id) || 0;
        if (raw >= 0 && raw <= 7) return 'DW';
        if (raw >= 16 && raw <= 23) return 'DK';
        if (raw >= 32 && raw <= 39) return 'ELF';
        if (raw >= 48 && raw <= 49) return 'MG';
        if (raw >= 64 && raw <= 66) return 'DL';
        if (raw >= 80 && raw <= 83) return 'SUMM';
        if (raw >= 96 && raw <= 98) return 'RF';
        if (raw >= 112 && raw <= 118) return 'GL';
        if (raw >= 128 && raw <= 135) return 'RW';
        if (raw >= 144 && raw <= 147) return 'SL';
        if (raw >= 160 && raw <= 161) return 'GC';
        return 'DW';
    };

    const serverType = (localStorage.getItem('selectedServer') || '').toString().trim();
    if (!serverType) return;

    // Helper to fetch ranking top 1
    const getTopOne = async (path) => {
        try {
            const res = await fetch(`${window.location.origin}${path}?serverType=${encodeURIComponent(serverType)}`, { cache: 'no-store' });
            if (!res.ok) return null;
            const data = await res.json();
            return (Array.isArray(data) && data.length > 0) ? data[0] : null;
        } catch (e) { return null; }
    };

    // 1. King of Resets
    getTopOne('/top-ranking-characters').then(p => {
        if (!p) return;
        const card = cards[0];
        const nameEl = card.querySelector('.guild-name');
        const subEl = card.querySelector('.guild-master span:not([data-i18n])');
        const iconWrap = card.querySelector('.card-icon');
        if (nameEl) nameEl.textContent = p.Name || p.CharacterName || p.name || '-';
        const resets = p.RESETS ?? p.Resets ?? p.resets ?? p.ResetCount ?? 0;
        if (subEl) subEl.textContent = `RESETS: ${resets}`;
        if (iconWrap) {
            const classId = p.Class ?? p.classId ?? p.class ?? p.CClass ?? 0;
            const avatar = p.Avatar ?? p.avatar ?? '';
            const iconPath = avatar ? avatar : `assets/icon/nowclass/${encodeURIComponent(getClassAbbr(classId))}.png`;
            iconWrap.innerHTML = `<img src="${iconPath}" alt="Class" style="width:38px; height:38px; object-fit:contain; border-radius:50%;" onerror="this.onerror=null;this.src='assets/icon/nowclass/DW.png';" />`;
        }
    });

    // 2. PVP Master
    getTopOne('/top-ranking-pvp').then(p => {
        if (!p) return;
        const card = cards[1];
        const nameEl = card.querySelector('.guild-name');
        const vKills = card.querySelector('.val-kills');
        const vDeaths = card.querySelector('.val-deaths');
        const vKd = card.querySelector('.val-kd');
        const iconWrap = card.querySelector('.card-icon');

        if (nameEl) nameEl.textContent = p.Name || p.CharacterName || p.name || '-';
        
        const kills = Number(p.Kills ?? p.kills ?? p.totalKills ?? 0);
        const deaths = Number(p.Deaths ?? p.deaths ?? 0);
        const kd = (deaths === 0 && kills > 0) ? '∞' : (kills / (deaths || 1)).toFixed(1);

        if (vKills) vKills.textContent = kills;
        if (vDeaths) vDeaths.textContent = deaths;
        if (vKd) vKd.textContent = kd;

        if (iconWrap) {
            const classId = p.Class ?? p.classId ?? p.class ?? p.CClass ?? 0;
            const avatar = p.Avatar ?? p.avatar ?? '';
            const iconPath = avatar ? avatar : `assets/icon/nowclass/${encodeURIComponent(getClassAbbr(classId))}.png`;
            iconWrap.innerHTML = `<img src="${iconPath}" alt="Class" style="width:38px; height:38px; object-fit:contain; border-radius:50%;" onerror="this.onerror=null;this.src='assets/icon/nowclass/DW.png';" />`;
        }
    });

    // 3. Legendary Leader
    getTopOne('/top-ranking-guilds').then(g => {
        if (!g) return;
        const card = cards[2];
        const nameEl = card.querySelector('.guild-name');
        const masterEl = card.querySelector('.guild-master span:not([data-i18n])');
        const iconWrap = card.querySelector('.card-icon');
        if (nameEl) nameEl.textContent = g.G_Name || g.guildName || g.Name || '-';
        if (masterEl) masterEl.textContent = g.G_Master || g.master || g.Master || '-';
        const markHex = g.G_Mark || g.guildMark || g.mark || '';
        if (iconWrap && markHex && typeof guildMarkHexToDataUrl === 'function') {
            const dataUrl = guildMarkHexToDataUrl(markHex, 34);
            if (dataUrl) {
                iconWrap.innerHTML = `<img src="${dataUrl}" alt="Guild Mark" style="width:34px; height:34px; object-fit:contain;" />`;
            }
        }
    });
}

window.API_BASE_URL = API_BASE_URL;
window.PUBLIC_INFO = PUBLIC_INFO;
window.loadPublicInfo = loadPublicInfo;
window.applyPublicInfoToDom = applyPublicInfoToDom;
window.apiFetchJson = apiFetchJson;
window.getServersConfigCached = getServersConfigCached;
window.getOnlineCountCached = getOnlineCountCached;
window.t = t;
window.applyTranslations = applyTranslations;

function renderMobileMenu() {
    const host = document.getElementById('mobile-menu');
    if (!host) return;

    const token = (localStorage.getItem('authToken') || '').toString().trim();
    const pathName = (window.location.pathname || '/').toLowerCase();

    const isHome = (pathName === '/' || pathName === '/index' || pathName === '/home');
    const isServerInfo = (
        pathName === '/server-info' ||
        pathName === '/server-info' ||
        pathName === '/server-classes' ||
        pathName === '/server-classes' ||
        pathName === '/server-details' ||
        pathName === '/server-details' ||
        pathName === '/server-events' ||
        pathName === '/server-events' ||
        pathName === '/server-chaos-cards' ||
        pathName === '/server-chaos-cards' ||
        pathName === '/server-moss-special' ||
        pathName === '/server-moss-special' ||
        pathName === '/server-delgado-lucky-coins' ||
        pathName === '/server-delgado-lucky-coins' ||
        pathName === '/info/server-info' ||
        pathName === '/info/server-info' ||
        pathName === '/info/server-classes' ||
        pathName === '/info/server-classes' ||
        pathName === '/info/server-details' ||
        pathName === '/info/server-details' ||
        pathName === '/info/server-events' ||
        pathName === '/info/server-events' ||
        pathName === '/info/server-chaos-cards' ||
        pathName === '/info/server-chaos-cards' ||
        pathName === '/info/server-moss-special' ||
        pathName === '/info/server-moss-special' ||
        pathName === '/info/server-delgado-lucky-coins' ||
        pathName === '/info/server-delgado-lucky-coins'
    );
    const isDashboard = (pathName === '/dashboard' || pathName === '/dashboard');

    host.innerHTML = `
        <div class="mobile-menu-inner">
            <div class="mm-head">
                <div class="mm-title">MENU</div>
                <button class="mm-close" id="mm-close" type="button" aria-label="Close">×</button>
            </div>
            <a class="mm-link ${isHome ? 'active' : ''}" href="/">${t('nav.home', 'Home')}</a>
            <a class="mm-link" href="/ranking.html">${t('nav.rankings', 'Rankings')}</a>
            <a class="mm-link" href="/downloads.html">${t('nav.downloads', 'Downloads')}</a>
            <a class="mm-link ${isServerInfo ? 'active' : ''}" href="/info/server-details">${t('nav.server_info', 'Server Info')}</a>
            ${token ? '' : ''}
            <div class="mm-sep"></div>
            ${token
                ? `<button class="btn btn-outline" id="mm-logout">${t('auth.logout', 'Logout')}</button>`
                : `
                    <a class="btn btn-outline" href="/auth.html#login" id="mm-login">${t('auth.login', 'Login')}</a>
                    <a class="btn btn-gold" href="/auth.html#register" id="mm-register">${t('auth.register', 'Register')}</a>
                `
            }
        </div>
    `.trim();

    const closeMenu = () => {
        const menu = document.getElementById('mobile-menu');
        if (!menu) return;
        menu.classList.remove('open');
        document.body.classList.remove('mobile-menu-open');
        const toggle = document.getElementById('mobile-menu-toggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
    };

    host.querySelectorAll('a.mm-link').forEach(a => a.addEventListener('click', () => closeMenu()));

    const loginBtn = document.getElementById('mm-login');
    if (loginBtn) loginBtn.addEventListener('click', () => closeMenu());
    const regBtn = document.getElementById('mm-register');
    if (regBtn) regBtn.addEventListener('click', () => closeMenu());
    const closeBtn = document.getElementById('mm-close');
    if (closeBtn) closeBtn.addEventListener('click', (e) => { e.preventDefault(); closeMenu(); });
    const logoutBtn = document.getElementById('mm-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeMenu();
        localStorage.removeItem('authToken');
        localStorage.removeItem('userProfile');
        window.location.href = '/';
    });
}

function initMobileMenu() {
    const toggle = document.getElementById('mobile-menu-toggle');
    const menu = document.getElementById('mobile-menu');
    if (!toggle || !menu) return;
    if (toggle.dataset.bound === '1') return;
    toggle.dataset.bound = '1';

    renderMobileMenu();

    const openMenu = () => {
        menu.classList.add('open');
        document.body.classList.add('mobile-menu-open');
        toggle.setAttribute('aria-expanded', 'true');
    };

    const closeMenu = () => {
        menu.classList.remove('open');
        document.body.classList.remove('mobile-menu-open');
        toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', () => {
        if (menu.classList.contains('open')) closeMenu();
        else openMenu();
    });

    document.addEventListener('click', (e) => {
        const tEl = e.target;
        const clickedToggle = tEl && tEl.closest && tEl.closest('#mobile-menu-toggle');
        const clickedMenu = tEl && tEl.closest && tEl.closest('#mobile-menu');
        if (clickedToggle || clickedMenu) return;
        closeMenu();
    });

    document.addEventListener('keydown', (e) => {
        if (!menu.classList.contains('open')) return;
        if ((e && e.key) !== 'Escape') return;
        closeMenu();
    });
}

document.addEventListener('layout:loaded', () => {
    (async () => {
        try {
            await loadLanguage(getSelectedLang(), true);
            applyTranslations(document);
        } catch (e) {}
        try { renderHeaderAuthControls(); } catch (e) {}
        initHeaderServerSelector();
        initHeaderLangSelector();
        try { initMobileMenu(); } catch (e) {}
    })();
});

async function initHeaderServerSelector() {
    const btn = document.getElementById('header-server-dd-btn');
    const panel = document.getElementById('header-server-dd-panel');
    const label = document.getElementById('header-server-dd-label');
    const root = document.getElementById('header-server-dd');
    if (!btn || !panel || !label) return;
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';

    const close = () => {
        panel.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
    };
    const open = () => {
        const other = document.getElementById('header-lang-dd-panel');
        const otherBtn = document.getElementById('header-lang-dd-btn');
        if (other) other.hidden = true;
        if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        panel.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
    };
    const toggle = () => {
        if (panel.hidden) open(); else close();
    };

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        toggle();
    });

    if (root && root.dataset.docBound !== '1') {
        root.dataset.docBound = '1';
        document.addEventListener('click', (e) => {
            const t = e.target;
            if (root.contains(t)) return;
            close();
        });
    }

    const servers = await getServersConfigCached();
    if (!servers || typeof servers !== 'object') {
        label.textContent = t('server.no_servers', 'No servers');
        btn.disabled = true;
        return;
    }

    const keys = Object.keys(servers);
    if (!keys.length) {
        label.textContent = t('server.no_servers', 'No servers');
        btn.disabled = true;
        return;
    }

    const stored = (localStorage.getItem('selectedServer') || '').toString().trim();
    const selected = (stored && servers[stored]) ? stored : keys[0];
    if (selected) localStorage.setItem('selectedServer', selected);
    window.SELECTED_SERVER_FILES = (servers[selected]?.server_files || 'IGCN').toString();

    const items = keys.map(k => ({
        key: String(k),
        label: (servers[k]?.displayName || servers[k]?.name || servers[k]?.title || k).toString()
    }));

    panel.innerHTML = items
        .map(x => `<div class="dd-opt" role="option" data-server="${String(x.key).replace(/"/g, '&quot;')}" data-label="${String(x.label).replace(/"/g, '&quot;')}">${escapeHtml(x.label)}</div>`)
        .join('');

    const setActive = (k) => {
        const s = String(k || '').trim();
        const txt = (servers?.[s]?.displayName || servers?.[s]?.name || servers?.[s]?.title || s || '').toString();
        label.textContent = txt || '...';
        panel.querySelectorAll('[data-server]').forEach(el => {
            el.classList.toggle('active', el.getAttribute('data-server') === s);
        });
    };
    setActive(selected);

    panel.addEventListener('click', async (e) => {
        const target = e.target;
        const opt = target && target.closest ? target.closest('[data-server]') : null;
        if (!opt) return;
        const next = (opt.getAttribute('data-server') || '').toString().trim();
        if (!next) return;
        close();

        await handleServerSwitch(next, servers);
    });
}

document.addEventListener('DOMContentLoaded', () => {

    // Header Scroll
    const header = document.getElementById('main-header');
    if(header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) header.classList.add('scrolled');
            else header.classList.remove('scrolled');
        });
    }

    // Timer
    initCountdownTimers();

    // Active Events timers
    initActiveEventsCountdown();

    // Tabs
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });

    if (document.body && document.body.classList.contains('page-home')) {
        initHeroMotion();
    }

    (async () => {
        const lang = getSelectedLang();
        await loadLanguage(lang, true);
        await loadPublicInfo();
        window.PUBLIC_INFO = PUBLIC_INFO;
        applyPublicInfoToDom();
        renderFixedSocials();
        applyTranslations(document);
        try {
            if (document.body && document.body.classList.contains('page-home')) {
                initHeroQuickLinks();
                initHeroAnnouncementRotator();
                renderUpcomingEvents();
            }
        } catch (e) {
            console.error('[Main] Error in home page setup:', e);
        }
        try { await loadTeamSection(); } catch (e) {}

        if (window.__layoutPromise && typeof window.__layoutPromise.then === 'function') {
            try { await window.__layoutPromise; } catch (e) {}
        } else {
            await new Promise(resolve => {
                let done = false;
                const finish = () => { if (done) return; done = true; resolve(); };
                document.addEventListener('layout:loaded', finish, { once: true });
                setTimeout(finish, 1500);
            });
        }

        applyPublicInfoToDom();
        renderFixedSocials();
        try { await updateDiscordWidget(); } catch (e) {}

        renderHeaderAuthControls();
        initAuthForms();
        await renderServersFromApi();
        try { initHomeNewsModal(); } catch (e) {}
        try { await renderHomeNews(); } catch (e) {}
        try { await renderHomeHallOfFame(); } catch (e) {}
        initCardTiltEffect(document);
        await loadAndRenderEventChampions();
        initDownloadButton();
        if (document.body && document.body.classList.contains('page-home')) {
            initializeStreamingWidget();
            startStreamRefresh();
        }
        applyTranslations(document);
        try { tryShowIndexPromoPopup(); } catch (e) {}
    })();
});

// Modals & Notifications
function openModal(modalId) {
    const token = (localStorage.getItem('authToken') || '').toString().trim();
    if (token && (modalId === 'registerModal' || modalId === 'loginModal')) {
        return;
    }
    const el = document.getElementById(modalId);
    if (!el) return;
    el.classList.add('show');
}
function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;
    el.classList.remove('show');
}
function switchModal(currentId, targetId) {
    closeModal(currentId);
    setTimeout(() => openModal(targetId), 200);
}
window.onclick = function(event) { if (event.target.classList.contains('modal')) event.target.classList.remove('show'); }

function showNotification(type, message) {
    const container = document.getElementById('notification-area');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span><span class="toast-close" onclick="this.parentElement.remove()">&times;</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 4000);
}

function initAuthForms() {
    const MIN_LEN = 4;
    const MAX_LEN = 10;

    if (document.documentElement.dataset.authFormsBound === '1') return;
    document.documentElement.dataset.authFormsBound = '1';

    const handleDiscordAuth = (e) => {
        e.preventDefault();
        const serverType = (localStorage.getItem('selectedServer') || '').toString();
        window.location.href = `${API_BASE_URL}/auth/discord?serverType=${encodeURIComponent(serverType)}`;
    };

    const discordButtons = document.querySelectorAll(
        '#loginModal .btn-discord, #registerModal .btn-discord, #discord-login-btn, #discord-register-btn'
    );
    discordButtons.forEach(btn => {
        btn.addEventListener('click', handleDiscordAuth);
    });

    const loginForm = document.querySelector('#loginModal form');
    if (loginForm) {
        try { loginForm.removeAttribute('onsubmit'); } catch (e) {}
        loginForm.addEventListener('submit', (e) => handleLogin(e, { minLen: MIN_LEN, maxLen: MAX_LEN }));
    }

    const loginPageForm = document.getElementById('loginForm');
    if (loginPageForm) {
        try { loginPageForm.removeAttribute('onsubmit'); } catch (e) {}
        loginPageForm.addEventListener('submit', (e) => handleLogin(e, { minLen: MIN_LEN, maxLen: MAX_LEN }));
    }

    const registerForm = document.querySelector('#registerModal form');
    if (registerForm) {
        try { registerForm.removeAttribute('onsubmit'); } catch (e) {}
        registerForm.addEventListener('submit', (e) => handleRegister(e, { minLen: MIN_LEN, maxLen: MAX_LEN }));
    }

    const registerPageForm = document.getElementById('registerFormPage');
    if (registerPageForm) {
        try { registerPageForm.removeAttribute('onsubmit'); } catch (e) {}
        registerPageForm.addEventListener('submit', (e) => handleRegister(e, { minLen: MIN_LEN, maxLen: MAX_LEN }));
    }

    const bindCaptcha = (cfg) => {
        const valueEl = document.getElementById(cfg.valueId);
        const inputEl = document.getElementById(cfg.inputId);
        const refreshBtn = document.getElementById(cfg.refreshId);
        if (!valueEl || !inputEl) return;

        const fetchCaptcha = async () => {
            try {
                const serverType = (localStorage.getItem('selectedServer') || '').toString().trim();
                if (!serverType) {
                    window[cfg.storeKey] = '';
                    valueEl.textContent = '-';
                    return;
                }

                const data = await apiFetchJson(`/auth/human-verification?serverType=${encodeURIComponent(serverType)}`);
                if (!data || data.success !== true || !data.captchaId) {
                    window[cfg.storeKey] = '';
                    valueEl.textContent = '-';
                    return;
                }

                window[cfg.storeKey] = String(data.captchaId || '').trim();
                valueEl.textContent = String(data.display || '-');
                inputEl.value = '';

                // Find the human-verify head and create timer element dynamically
                const humanVerifyHead = document.querySelector('.human-verify__head');
                if (humanVerifyHead && !document.getElementById('auth-captcha-timer')) {
                    const timerSpan = document.createElement('span');
                    timerSpan.id = 'auth-captcha-timer';
                    timerSpan.style.color = 'rgba(255, 255, 255, 0.7)';
                    timerSpan.style.fontSize = '0.65rem';
                    timerSpan.style.marginLeft = '8px';
                    humanVerifyHead.appendChild(timerSpan);
                }

                // Get timer element
                const timerEl = document.getElementById('auth-captcha-timer');

                if (timerEl) {
                    let secondsLeft = data.expiresInSeconds || 30;
                    timerEl.textContent = `(${secondsLeft}s)`;

                    const timerInterval = setInterval(() => {
                        secondsLeft--;
                        if (secondsLeft <= 0) {
                            clearInterval(timerInterval);
                            timerEl.textContent = '';
                            valueEl.textContent = 'EXPIRED';
                            inputEl.value = '';
                            window[cfg.storeKey] = '';
                        } else {
                            timerEl.textContent = `(${secondsLeft}s)`;
                        }
                    }, 1000);
                }

            } catch (e) {
                window[cfg.storeKey] = '';
                valueEl.textContent = '-';
            }
        };

        if (!window[cfg.storeKey]) fetchCaptcha();

        if (refreshBtn && refreshBtn.dataset.bound !== '1') {
            refreshBtn.dataset.bound = '1';
            refreshBtn.addEventListener('click', (e) => {
                e.preventDefault();
                fetchCaptcha();
                try { inputEl.focus(); } catch (err) {}
            });
        }

        if (inputEl.dataset.bound !== '1') {
            inputEl.dataset.bound = '1';
            inputEl.addEventListener('input', () => {
                const v = (inputEl.value || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
                inputEl.value = v;
            });
        }

        window[cfg.regenKey] = fetchCaptcha;
    };

    // auth.html right panel (shared for login/register)
    bindCaptcha({
        valueId: 'auth-captcha-value',
        inputId: 'auth-captcha-input',
        refreshId: 'auth-captcha-refresh',
        storeKey: '__authCaptchaId',
        regenKey: '__regenAuthCaptcha',
        timerId: 'auth-captcha-timer'
    });

    // header modals
    bindCaptcha({
        valueId: 'login-captcha-value',
        inputId: 'login-captcha-input',
        refreshId: 'login-captcha-refresh',
        storeKey: '__loginCaptchaId',
        regenKey: '__regenLoginCaptcha',
        timerId: 'login-captcha-timer'
    });
    bindCaptcha({
        valueId: 'register-captcha-value',
        inputId: 'register-captcha-input',
        refreshId: 'register-captcha-refresh',
        storeKey: '__registerCaptchaId',
        regenKey: '__regenRegisterCaptcha',
        timerId: 'register-captcha-timer'
    });

    const countrySelect = document.getElementById('register-country');
    const cDdRoot = document.getElementById('register-country-dd');
    const cDdBtn = document.getElementById('register-country-dd-btn');
    const cDdPanel = document.getElementById('register-country-dd-panel');
    const cDdLabel = document.getElementById('register-country-dd-label');
    const cDdSearch = document.getElementById('register-country-search');
    const cDdList = document.getElementById('register-country-dd-list');
    const cDdOriginalParent = cDdPanel ? cDdPanel.parentElement : null;

    if (countrySelect && typeof countries === 'object' && countries) {
        const items = Object.keys(countries)
            .map(code => ({ code: String(code).toLowerCase(), label: String(countries[code] || code) }))
            .sort((a, b) => a.label.localeCompare(b.label));

        countrySelect.innerHTML = items
            .map(x => `<option value="${x.code}">${x.label}</option>`)
            .join('');

        const renderList = (query = '') => {
            const q = (query || '').toString().trim().toLowerCase();
            const filtered = q
                ? items.filter(x => x.label.toLowerCase().includes(q) || x.code.includes(q))
                : items;

            if (cDdList) {
                cDdList.innerHTML = filtered
                    .map(x => `<div class="dd-opt" role="option" data-country="${x.code}" data-label="${escapeHtml(x.label)}">${escapeHtml(x.label)}</div>`)
                    .join('');
            }

            const activeCode = String(countrySelect.value || '').toLowerCase();
            if (cDdList) {
                cDdList.querySelectorAll('[data-country]').forEach(el => {
                    el.classList.toggle('active', el.getAttribute('data-country') === activeCode);
                });
            }
        };

        renderList('');

        const setCountry = (code) => {
            const c = String(code || '').toLowerCase();
            if (!c) return;
            if (countrySelect.value !== c) countrySelect.value = c;

            const txt = (countries?.[c] ? String(countries[c]) : '') || (countrySelect.selectedOptions?.[0]?.textContent || '');
            if (cDdLabel) cDdLabel.textContent = txt || 'Select...';

            if (cDdPanel) {
                if (cDdList) {
                    cDdList.querySelectorAll('[data-country]').forEach(el => {
                        el.classList.toggle('active', el.getAttribute('data-country') === c);
                    });
                }
            }
        };

        const defaultCode = countrySelect.querySelector('[value="ro"]') ? 'ro' : (items[0]?.code || '');
        if (defaultCode) setCountry(defaultCode);

        if (cDdBtn && cDdPanel && cDdBtn.dataset.bound !== '1') {
            cDdBtn.dataset.bound = '1';

            const positionCountryPanel = () => {
                if (!cDdPanel) return;
                const btnRect = cDdBtn.getBoundingClientRect();
                const modalContent = cDdBtn.closest('.modal-content');
                const modalRect = modalContent ? modalContent.getBoundingClientRect() : btnRect;

                const margin = 12;
                const vw = Math.max(320, window.innerWidth || 0);
                const vh = Math.max(320, window.innerHeight || 0);

                const desiredWidth = Math.min(420, Math.max(320, Math.floor(vw * 0.34)));
                const maxH = Math.min(520, Math.max(260, vh - margin * 2));

                let left = Math.round(modalRect.right + margin);
                const rightOverflow = left + desiredWidth > vw - margin;
                if (rightOverflow) {
                    left = Math.round(modalRect.left - margin - desiredWidth);
                }

                if (left < margin) {
                    left = Math.round(Math.min(Math.max(margin, btnRect.left), vw - margin - desiredWidth));
                }

                let top = Math.round(btnRect.top);
                if (top + maxH > vh - margin) {
                    top = Math.round(Math.max(margin, vh - margin - maxH));
                }

                cDdPanel.style.position = 'fixed';
                cDdPanel.style.left = `${left}px`;
                cDdPanel.style.top = `${top}px`;
                cDdPanel.style.width = `${desiredWidth}px`;
                cDdPanel.style.maxHeight = `${maxH}px`;
                cDdPanel.style.zIndex = '3200';
            };

            const close = () => {
                cDdPanel.hidden = true;
                cDdBtn.setAttribute('aria-expanded', 'false');

                if (cDdOriginalParent && cDdPanel.parentElement !== cDdOriginalParent) {
                    try { cDdOriginalParent.appendChild(cDdPanel); } catch (e) {}
                }
                cDdPanel.style.position = '';
                cDdPanel.style.left = '';
                cDdPanel.style.top = '';
                cDdPanel.style.width = '';
                cDdPanel.style.maxHeight = '';
                cDdPanel.style.zIndex = '';
            };
            const open = () => {
                try {
                    if (cDdPanel.parentElement !== document.body) document.body.appendChild(cDdPanel);
                } catch (e) {}
                cDdPanel.hidden = false;
                cDdBtn.setAttribute('aria-expanded', 'true');
                positionCountryPanel();
                if (cDdSearch) {
                    cDdSearch.value = '';
                    renderList('');
                    try { cDdSearch.focus(); } catch (e) {}
                }
            };
            const toggle = () => {
                if (cDdPanel.hidden) open(); else close();
            };

            cDdBtn.addEventListener('click', (e) => {
                e.preventDefault();
                toggle();
            });

            if (cDdRoot && cDdRoot.dataset.docBound !== '1') {
                cDdRoot.dataset.docBound = '1';
                document.addEventListener('click', (e) => {
                    const t = e.target;
                    if (cDdRoot.contains(t)) return;
                    if (cDdPanel && cDdPanel.contains(t)) return;
                    close();
                });
            }

            window.addEventListener('resize', () => {
                if (!cDdPanel.hidden) {
                    try { positionCountryPanel(); } catch (e) {}
                }
            });

            if (cDdSearch && cDdSearch.dataset.bound !== '1') {
                cDdSearch.dataset.bound = '1';
                cDdSearch.addEventListener('input', () => {
                    renderList(cDdSearch.value);
                });
                cDdSearch.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        close();
                    }
                });
            }

            const clickHost = cDdList || cDdPanel;
            if (clickHost) {
                clickHost.addEventListener('click', (e) => {
                    const target = e.target;
                    const opt = target && target.closest ? target.closest('[data-country]') : null;
                    if (!opt) return;
                    const code = opt.getAttribute('data-country');
                    close();
                    setCountry(code);
                });
            }
        }
    }
}

function handleLogin(e, options = null) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button');
    const originalText = btn ? btn.innerText : '';

    const minLen = options?.minLen ?? 1;
    const maxLen = options?.maxLen ?? 999;

    const uEl = document.getElementById('login-username');
    const pEl = document.getElementById('login-password');
    const username = uEl?.value?.toString().trim() || '';
    const password = pEl?.value?.toString() || '';

    const loginModalCaptchaEl = document.getElementById('login-captcha-input');
    const authPanelCaptchaEl = document.getElementById('auth-captcha-input');
    const isLoginModalSubmit = !!(loginModalCaptchaEl && form && typeof form.contains === 'function' && form.contains(loginModalCaptchaEl));

    const captchaInputEl = isLoginModalSubmit ? loginModalCaptchaEl : authPanelCaptchaEl;
    const captchaId = (isLoginModalSubmit ? (window.__loginCaptchaId || '') : (window.__authCaptchaId || '')).toString().trim();
    const captchaCode = (captchaInputEl?.value || '').toString().trim().toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '');
    if (captchaInputEl) {
        if (!captchaId || !captchaCode) {
            showNotification('error', 'Invalid verification code');
            try {
                if (isLoginModalSubmit && typeof window.__regenLoginCaptcha === 'function') window.__regenLoginCaptcha();
                else if (!isLoginModalSubmit && typeof window.__regenAuthCaptcha === 'function') window.__regenAuthCaptcha();
            } catch (err) {}
            try { captchaInputEl.focus(); } catch (err) {}
            return;
        }
    }

    if (!username || !password) return;
    if (username.includes(' ')) {
        showNotification('error', 'Username cannot contain spaces.');
        return;
    }
    if (username.length < minLen || username.length > maxLen) {
        showNotification('error', `Username must be between ${minLen} and ${maxLen} characters.`);
        return;
    }
    if (password.length < minLen || password.length > maxLen) {
        showNotification('error', `Password must be between ${minLen} and ${maxLen} characters.`);
        return;
    }
    if (btn) btn.innerText = 'AUTHENTICATING...';

    (async () => {
        try {
            const serverType = localStorage.getItem('selectedServer') || '';

            let data = await apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password, serverType, captchaId, captchaCode })
            });

            if (data && data.twoFactorRequired) {
                const code = await promptModal({
                    title: 'Two-Factor Authentication',
                    message: 'Enter 2FA code',
                    label: '2FA',
                    inputType: 'text',
                    iconClass: 'fas fa-key',
                    okText: 'OK',
                    cancelText: 'Cancel',
                });
                if (!code) {
                    showNotification('error', 'Two-factor authentication required');
                    return;
                }
                data = await apiFetch('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({ username, password, serverType, twoFactorCode: code, captchaId, captchaCode })
                });
            }

            if (!data || data.success === false) {
                showNotification('error', data?.message || 'Login failed');
                return;
            }
            if (!data.token) {
                showNotification('error', data?.message || 'Login failed');
                return;
            }

            localStorage.setItem('authToken', data.token);
            if (data.profile) localStorage.setItem('userProfile', JSON.stringify(data.profile));
            if (data.profile && data.profile.serverType) localStorage.setItem('selectedServer', data.profile.serverType);

            renderHeaderAuthControls();

            showNotification('success', data.message || 'Login successful! Redirecting...');
            setTimeout(() => { window.location.href = '/dashboard'; }, 800);
        } catch (err) {
            showNotification('error', err?.message || 'Login failed');
        } finally {
            if (btn) btn.innerText = originalText || 'LOGIN';
        }
    })();
}

function handleRegister(e, options = null) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button');
    const originalText = btn ? btn.innerText : '';

    const minLen = options?.minLen ?? 1;
    const maxLen = options?.maxLen ?? 999;

    const uEl = document.getElementById('register-username');
    const eEl = document.getElementById('register-email');
    const pEl = document.getElementById('register-password');
    const cEl = document.getElementById('register-confirm-password');
    const rEl = document.getElementById('register-referral');
    const countryEl = document.getElementById('register-country');
    const username = uEl?.value?.toString().trim() || '';
    const email = eEl?.value?.toString().trim() || '';
    const password = pEl?.value?.toString() || '';
    const confirmPassword = cEl?.value?.toString() || '';
    const referralCode = rEl?.value?.toString().trim() || '';
    const country = countryEl?.value?.toString().trim() || '';

    const registerModalCaptchaEl = document.getElementById('register-captcha-input');
    const authPanelCaptchaEl = document.getElementById('auth-captcha-input');
    const isRegisterModalSubmit = !!(registerModalCaptchaEl && form && typeof form.contains === 'function' && form.contains(registerModalCaptchaEl));

    // Human verification (modal or auth.html panel)
    const captchaInputEl = isRegisterModalSubmit ? registerModalCaptchaEl : authPanelCaptchaEl;
    const captchaId = (isRegisterModalSubmit ? (window.__registerCaptchaId || '') : (window.__authCaptchaId || '')).toString().trim();
    const captchaCode = (captchaInputEl?.value || '').toString().trim().toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '');
    if (captchaInputEl) {
        if (!captchaId || !captchaCode) {
            showNotification('error', t('auth.invalid_code', 'Invalid verification code'));
            try {
                if (isRegisterModalSubmit && typeof window.__regenRegisterCaptcha === 'function') window.__regenRegisterCaptcha();
                else if (!isRegisterModalSubmit && typeof window.__regenAuthCaptcha === 'function') window.__regenAuthCaptcha();
            } catch (err) {}
            try { captchaInputEl.focus(); } catch (err) {}
            return;
        }
    }

    if (!username || !email || !password || !confirmPassword) return;
    if (username.includes(' ')) {
        showNotification('error', 'Username cannot contain spaces.');
        return;
    }
    if (password !== confirmPassword) {
        showNotification('error', 'Passwords do not match');
        return;
    }
    if (username.length < minLen || username.length > maxLen) {
        showNotification('error', `Username must be between ${minLen} and ${maxLen} characters.`);
        return;
    }
    if (password.length < minLen || password.length > maxLen) {
        showNotification('error', `Password must be between ${minLen} and ${maxLen} characters.`);
        return;
    }
    if (btn) btn.innerText = 'CREATING ACCOUNT...';

    (async () => {
        try {
            const serverType = localStorage.getItem('selectedServer') || '';
            const data = await apiFetch('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, email, password, confirmPassword, country, serverType, referralCode, captchaId, captchaCode })
            });

            if (data && data.success === false) {
                showNotification('error', data?.message || 'Registration failed');
                return;
            }

            let loginData = await apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password, serverType })
            });

            if (loginData && loginData.twoFactorRequired) {
                const code = await promptModal({
                    title: 'Two-Factor Authentication',
                    message: 'Enter 2FA code',
                    label: '2FA',
                    inputType: 'text',
                    iconClass: 'fas fa-key',
                    okText: 'OK',
                    cancelText: 'Cancel',
                });
                if (!code) {
                    showNotification('error', 'Two-factor authentication required');
                    return;
                }
                loginData = await apiFetch('/auth/login', {
                    method: 'POST',
                    body: JSON.stringify({
                        username,
                        password,
                        twoFactorCode: code,
                        serverType,
                    })
                });
            }

            if (!loginData || loginData.success === false || !loginData.token) {
                showNotification('success', (data && data.message) ? data.message : 'Account created! Please login.');
                setTimeout(() => {
                    window.location.href = '/auth.html#login';
                }, 500);
                return;
            }

            localStorage.setItem('authToken', loginData.token);
            if (loginData.profile) localStorage.setItem('userProfile', JSON.stringify(loginData.profile));
            if (loginData.profile && loginData.profile.serverType) localStorage.setItem('selectedServer', loginData.profile.serverType);

            renderHeaderAuthControls();

            showNotification('success', (data && data.message) ? data.message : 'Account created! Redirecting...');
            setTimeout(() => { window.location.href = '/dashboard'; }, 800);
        } catch (err) {
            showNotification('error', err?.message || 'Register failed');
        } finally {
            if (btn) btn.innerText = originalText || 'REGISTER';
        }
    })();
}

// ====== UPCOMING EVENTS ======

// Timezone offset for America/Bogota (UTC-5)
const SERVER_TIMEZONE_OFFSET = -5 * 60; // minutes

function getServerTime() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const serverTime = new Date(utc + (SERVER_TIMEZONE_OFFSET * 60000));
    return serverTime;
}

function formatTimeDisplay(date, compact = false) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    if (compact) {
        return `${hours}:${minutes}:${seconds}`;
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    return `${hours}:${minutes}:${seconds} ${month} ${day}`;
}

function updateServerAndLocalTime() {
    const serverDisplayEl = document.getElementById('server-time-display');
    const serverSpanEl = document.getElementById('server-time');
    const localEl = document.getElementById('local-time-display');
    
    // Elementos del Countdown en el Header
    const cdDays = document.getElementById('countdown-days');
    const cdHours = document.getElementById('countdown-hours');
    const cdMins = document.getElementById('countdown-mins');
    const cdSecs = document.getElementById('countdown-secs');

    const serverTime = getServerTime();
    const localTime = new Date();

    // Actualizar Relojes
    if (serverDisplayEl) {
        serverDisplayEl.textContent = formatTimeDisplay(serverTime, true);
    } else if (serverSpanEl) {
        serverSpanEl.textContent = formatTimeDisplay(serverTime, true);
    }

    if (localEl) {
        localEl.textContent = formatTimeDisplay(localTime, true);
    }

    // LÓGICA DEL GRAND OPENING
    if (cdDays && cdHours && cdMins && cdSecs) {
        // FECHA OBJETIVO REAL (RESTAURADA)
        const targetDate = new Date("2026-05-10T20:00:00"); 
        const now = serverTime.getTime();
        const distance = targetDate - now;

        const clockBlocks = document.querySelectorAll('.header-clock-block');

        if (distance > 0) {
            const d = Math.floor(distance / (1000 * 60 * 60 * 24));
            const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((distance % (1000 * 60)) / 1000);

            cdDays.innerText = d.toString().padStart(2, '0');
            cdHours.innerText = h.toString().padStart(2, '0');
            cdMins.innerText = m.toString().padStart(2, '0');
            cdSecs.innerText = s.toString().padStart(2, '0');
        } else {
            // El contador ha terminado: Limpiamos y HACEMOS MÁS GRANDES LOS RELOJES
            const openingModule = document.getElementById('header-opening-module');
            const sep1 = document.getElementById('countdown-sep-1');
            const sep2 = document.getElementById('countdown-sep-2');
            
            if (openingModule) openingModule.style.display = 'none';
            if (sep1) sep1.style.display = 'none';
            if (sep2) sep2.style.display = 'none';

            // Aumentar tamaño de los relojes restantes
            clockBlocks.forEach(block => {
                block.style.transform = 'scale(1.25)'; // Los hacemos un 25% más grandes
                block.style.margin = '0 20px';
            });
        }
    }
}

updateServerAndLocalTime();
setInterval(updateServerAndLocalTime, 1000);

function calculateNextEventTime(times, days) {
    if (!Array.isArray(times) || !times.length) {
        return null;
    }

    const serverTime = getServerTime();
    const currentDayOfWeek = serverTime.getDay(); // 0-6 (Sunday-Saturday)
    const currentHours = serverTime.getHours();
    const currentMinutes = serverTime.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;

    // Parse times (HH:MM format)
    const parsedTimes = times.map(t => {
        if (typeof t === 'string') {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        }
        return null;
    }).filter(t => t !== null && !isNaN(t) && t >= 0);

    if (!parsedTimes.length) {
        return null;
    }

    // Parse days (array of 0-6) - if empty, consider all days
    let activeDays;
    if (Array.isArray(days) && days.length > 0) {
        activeDays = days.map(d => Number(d)).filter(d => !isNaN(d) && d >= 0 && d <= 6);
    } else {
        // If days is empty, event occurs every day
        activeDays = [0, 1, 2, 3, 4, 5, 6];
    }

    if (!activeDays.length) {
        return null;
    }

    let nextTime = null;
    let nextDiff = Infinity;

    // Check today and future days (up to 8 days to ensure we find something)
    for (let dayOffset = 0; dayOffset <= 8; dayOffset++) {
        const checkDate = new Date(serverTime);
        checkDate.setDate(checkDate.getDate() + dayOffset);
        const checkDayOfWeek = checkDate.getDay();

        if (!activeDays.includes(checkDayOfWeek)) continue;

        // Check all times for this day
        for (const timeInMinutes of parsedTimes) {
            const eventDate = new Date(checkDate);
            const hours = Math.floor(timeInMinutes / 60);
            const minutes = timeInMinutes % 60;
            eventDate.setHours(hours, minutes, 0, 0);

            // Only consider future times
            if (eventDate > serverTime) {
                const diff = eventDate.getTime() - serverTime.getTime();
                if (diff < nextDiff) {
                    nextDiff = diff;
                    nextTime = eventDate;
                }
            }
        }

        // If we found something, stop searching (no need to search further)
        if (nextTime) break;
    }

    return nextTime;
}

function formatCountdown(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    if (totalSeconds < 0) return '00:00:00';

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // Always show HH:MM:SS format like Castle Siege
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatEventTime(dateObj) {
    if (!dateObj || !(dateObj instanceof Date)) return '--:--';
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

function formatLocalEventTimeFromDiff(milliseconds) {
    const diff = Number(milliseconds);
    if (!Number.isFinite(diff)) return '--:--';
    const localDate = new Date(Date.now() + Math.max(0, diff));
    const hours = String(localDate.getHours()).padStart(2, '0');
    const minutes = String(localDate.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

function getEventDisplayType(event) {
    if (!event) return 'PVE';
    const rawType = (event.type || '').toString().trim().toLowerCase();
    const rawTitle = (event.title || '').toString().trim().toLowerCase();

    if (rawType === 'pvp') return 'PVP';
    if (rawType === 'inv' || rawType === 'invasion') return 'PVE';
    if (/(siege|war|duel|pk|battle)/i.test(rawTitle)) return 'PVP';
    return 'PVE';
}

function getEventRewardLabel(event) {
    const mode = getEventDisplayType(event);
    if (mode === 'PVP') return 'Puntos PVP + ranking';

    const title = normalizeEventText(event.title || '');
    if (title.includes('skeleton')) return 'Joyas y Alas Small';
    if (title.includes('mago blanco') || title.includes('wizard')) return 'Anillo de Mago (Wizard Ring)';
    if (title.includes('kundun')) return 'Items Ancient y Sockets';
    if (title.includes('erohim')) return 'Items Ancient y Joyas';
    if (title.includes('dragon roja')) return 'Joyas y zen';
    if (title.includes('conejo') || title.includes('rabbit')) return 'Items Especiales';
    if (title.includes('dorada') || title.includes('golden')) return 'Box of Kundun +1 a +5';
    if (title.includes('medusa')) return 'Items Socket y Ancient';
    if (title.includes('blood castle')) return 'Joyas y Zen';
    if (title.includes('chaos castle')) return 'Items Ancient y Joyas';
    if (title.includes('devil square')) return 'Experiencia y Zen';

    const rawType = (event && event.type ? String(event.type) : '').toLowerCase();
    if (rawType === 'inv' || rawType === 'invasion') return 'Drops de invasión';

    return 'Loot del evento';
}

function getEventThemeClass(event) {
    const mode = getEventDisplayType(event);
    if (mode === 'PVP') return 'event-theme--pvp';

    const rawType = (event && event.type ? String(event.type) : '').toLowerCase();
    if (rawType === 'inv' || rawType === 'invasion') return 'event-theme--invasion';
    if (rawType === 'boss') return 'event-theme--boss';

    return 'event-theme--pve';
}

function normalizeEventText(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function resolveEventImageUrl(event) {
    if (!event) return '/assets/images/home/noria.png';

    const customImage = (event.imageUrl || '').toString().trim();
    if (customImage) return customImage;

    const title = normalizeEventText(event.title || '');
    const type = normalizeEventText(event.type || '');

    // BOSSES
    if (title.includes('skeleton')) return '/assets/images/events/skeleton_king.png';
    if (title.includes('kundun')) return '/assets/images/events/kundun.png';
    if (title.includes('erohim')) return '/assets/images/home/home2.png';
    if (title.includes('mago blanco') || title.includes('wizard')) return '/assets/images/home/Lorencia.png';

    // INVASIONS
    if (title.includes('dorada') || title.includes('golden')) return '/assets/images/events/golden_invasion.png';
    if (title.includes('medusa')) return '/assets/images/home/home2.png';
    if (title.includes('dragon rojo') || title.includes('dragon')) return '/assets/images/home/Lorencia.png';
    if (title.includes('conejo') || title.includes('rabbit')) return '/assets/images/home/noria.png';
    if (title.includes('verano')) return '/assets/images/home/noria.png';

    // EVENTS
    if (title.includes('castle siege')) return '/assets/images/home/Castle%20Siege.png';
    if (title.includes('arka')) return '/assets/images/home/arka%20war.png';
    if (title.includes('ice') || title.includes('wind')) return '/assets/images/home/ICEWINDCASTLE.png';

    if (title.includes('chaos castle')) return '/assets/images/home/home2.png';
    if (title.includes('blood castle')) return '/assets/images/home/home.png';
    if (title.includes('devil square')) return '/assets/images/home/Lorencia.png';

    if (type === 'inv' || type === 'invasion') return '/assets/images/home/noria.png';
    return '/assets/images/home/home2.png';
}

function getEventCardBackground(event) {
    const mode = getEventDisplayType(event);
    const rawType = (event && event.type ? String(event.type) : '').toLowerCase();
    const imageUrl = resolveEventImageUrl(event);
    const imageLayer = `url('${String(imageUrl).replace(/'/g, "\\'")}')`;

    if (rawType === 'inv' || rawType === 'invasion') {
        return `linear-gradient(155deg, rgba(12, 8, 8, 0.5), rgba(12, 8, 8, 0.64)), radial-gradient(circle at 85% 10%, rgba(255, 90, 90, 0.45), transparent 48%), ${imageLayer}`;
    }

    if (rawType === 'boss') {
        return `linear-gradient(155deg, rgba(10, 8, 12, 0.5), rgba(10, 8, 12, 0.64)), radial-gradient(circle at 85% 10%, rgba(160, 90, 255, 0.45), transparent 48%), ${imageLayer}`;
    }

    if (mode === 'PVP') {
        return `linear-gradient(155deg, rgba(8, 11, 18, 0.52), rgba(8, 11, 18, 0.65)), radial-gradient(circle at 85% 10%, rgba(95, 165, 255, 0.45), transparent 48%), ${imageLayer}`;
    }

    return `linear-gradient(155deg, rgba(14, 12, 8, 0.5), rgba(14, 12, 8, 0.64)), radial-gradient(circle at 85% 10%, rgba(215, 166, 81, 0.4), transparent 48%), ${imageLayer}`;
}

function getEventHeroCta(event) {
    const rawType = (event && event.type ? String(event.type) : '').toLowerCase();
    if (rawType === 'inv' || rawType === 'invasion') {
        return {
            text: 'Ver reglas',
            href: '/info/invasion-rewards.html'
        };
    }

    return {
        text: 'Participar',
        href: '/downloads.html'
    };
}

function formatEventDays(days) {
    if (!Array.isArray(days) || !days.length) return '';

    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const uniq = [...new Set(days
        .map(d => Number(d))
        .filter(d => Number.isInteger(d) && d >= 0 && d <= 6))];

    if (!uniq.length) return '';
    return uniq.slice(0, 3).map(d => t(`days.${dayKeys[d]}`)).join(' • ');
}

function formatEventScheduleTimes(times) {
    if (!Array.isArray(times) || !times.length) return '--:--';
    const cleaned = times
        .map(v => (v == null ? '' : String(v).trim()))
        .filter(v => /^\d{1,2}:\d{2}$/.test(v));
    if (!cleaned.length) return '--:--';
    return cleaned.slice(0, 3).join(' • ');
}

function renderUpcomingEvents() {
    const container = document.getElementById('upcoming-events-grid');
    const highlightHost = document.getElementById('upcoming-events-highlight');
    if (!container) {
        return;
    }

    const events = (PUBLIC_INFO && Array.isArray(PUBLIC_INFO.upcomingEvents)) ? PUBLIC_INFO.upcomingEvents : [];

    if (!events.length) {
        container.innerHTML = '';
        return;
    }

    // Clear old interval
    if (__eventCountdownInterval) {
        clearInterval(__eventCountdownInterval);
        __eventCountdownInterval = null;
    }

    // Calculate and render events
    const eventData = events
        .map(event => {
            if (!event || !event.id) return null;

            const nextTime = calculateNextEventTime(event.times, event.days);
            if (!nextTime) return null;

            const serverTime = getServerTime();
            const diff = nextTime.getTime() - serverTime.getTime();

            return {
                id: event.id,
                title: event.title || 'Unknown Event',
                type: event.type || 'event',
                map: event.map || '',
                nextTime: nextTime,
                countdownMs: diff,
                times: event.times || [],
                days: event.days || []
            };
        })
        .filter(e => e !== null)
        .sort((a, b) => a.countdownMs - b.countdownMs)
        .slice(0, 6);

    // Render HTML
    const renderedHTML = eventData.map(event => {
        const isActive = event.countdownMs <= 0;
        const localTimeStr = formatLocalEventTimeFromDiff(event.countdownMs);
        const dayLabel = formatEventDays(event.days) || 'Diario';
        const rewardLabel = getEventRewardLabel(event);
        const themeClass = getEventThemeClass(event);
        const countdownStr = formatCountdown(event.countdownMs);

        return `
            <div class="event-card ${isActive ? 'is-active' : ''} ${themeClass}" data-event-id="${event.id}">
                <div class="event-card__corner event-card__corner--tl"></div>
                <div class="event-card__corner event-card__corner--tr"></div>
                <div class="event-card__corner event-card__corner--bl"></div>
                <div class="event-card__corner event-card__corner--br"></div>
                <div class="event-card__name">${escapeHtml(event.title)}</div>
                <div class="event-card__date">
                    <i class="fas fa-clock"></i>
                    <span>${escapeHtml(localTimeStr)} · ${escapeHtml(dayLabel)}</span>
                </div>
                ${event.map ? `
                <div class="event-card__map">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${escapeHtml(event.map)}</span>
                </div>
                ` : ''}
                <div class="event-card__reward">
                    <span class="event-card__reward-label">Recompensa</span>
                    <span class="event-card__reward-value">${escapeHtml(rewardLabel)}</span>
                </div>
                <div class="event-card__countdown">
                    ${isActive
                        ? `<span class="event-card__countdown-live">✓ ${t('events.active')}</span>`
                        : `<span class="event-card__countdown-label">${t('events.next_in')}</span><span class="event-card__countdown-value" data-event-id="${event.id}">${countdownStr}</span>`}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = renderedHTML;

    if (highlightHost) {
        const topEvent = eventData[0] || null;
        if (!topEvent) {
            highlightHost.innerHTML = '';
        } else {
            const topIsActive = topEvent.countdownMs <= 0;
            const topCountdown = topIsActive ? t('events.active') : formatCountdown(topEvent.countdownMs);
            const topTime = formatLocalEventTimeFromDiff(topEvent.countdownMs);
            const topDays = formatEventDays(topEvent.days) || '—';
            const topType = getEventDisplayType(topEvent);
            const topThemeClass = getEventThemeClass(topEvent);
            const topCta = getEventHeroCta(topEvent);

            highlightHost.innerHTML = `
                <article class="event-highlight ${topIsActive ? 'is-active' : ''} ${topThemeClass}">
                    <div class="event-highlight__left">
                        <div class="event-highlight__eyebrow">${t('events.next_events')}</div>
                        <h3 class="event-highlight__title">${escapeHtml(topEvent.title)}</h3>
                        <div class="event-highlight__meta">
                            <span class="event-highlight__pill"><i class="fas fa-crosshairs"></i>${escapeHtml(topType)}</span>
                            <span><i class="fas fa-calendar-alt"></i>${escapeHtml(topDays)}</span>
                            <span><i class="fas fa-clock"></i>${escapeHtml(topTime)} (Local)</span>
                        </div>
                    </div>
                    <div class="event-highlight__right">
                        <div class="event-highlight__label">${t('events.next_in')}</div>
                        <div class="event-highlight__countdown ${topIsActive ? 'is-live' : ''}">
                            <span class="event-highlight__countdown-value" data-event-id="${topEvent.id}">${topCountdown}</span>
                        </div>
                        <a class="event-highlight__cta" href="${escapeHtml(topCta.href)}">${escapeHtml(topCta.text)}</a>
                    </div>
                </article>
            `.trim();
        }
    }

    // Start countdown updates AFTER rendering
    if (eventData.length > 0) {
        startEventCountdownUpdates(eventData);
    }

    // Initialize navigation arrows
    initEventsNavigation();
}

let __eventCountdownInterval = null;

function startEventCountdownUpdates(eventData) {
    // Clear any existing interval
    if (__eventCountdownInterval) {
        clearInterval(__eventCountdownInterval);
        __eventCountdownInterval = null;
    }

    // Build a map for quick lookup
    const eventMap = new Map();
    eventData.forEach(e => {
        eventMap.set(e.id, e);
    });

    // Update function - similar to Castle Siege timer
    const updateCounters = () => {
        const elements = document.querySelectorAll('.event-card__countdown-value, .event-highlight__countdown-value');
        if (!elements.length) {
            return;
        }

        elements.forEach((el, idx) => {
            const eventId = el.getAttribute('data-event-id');
            if (!eventId) {
                return;
            }

            const eventObj = eventMap.get(Number(eventId));
            if (!eventObj) {
                return;
            }

            try {
                // Recalculate next time
                const nextTime = calculateNextEventTime(eventObj.times, eventObj.days);
                if (!nextTime) {
                    el.textContent = '--:--:--';
                    return;
                }

                const serverTime = getServerTime();
                const diff = nextTime.getTime() - serverTime.getTime();

                const countdownStr = formatCountdown(diff);
                el.textContent = countdownStr;

                // If event passed, rerender
                if (diff <= 0) {
                    renderUpcomingEvents();
                }
            } catch (err) {
                console.error('Error updating event countdown:', err);
            }
        });
    };

    // Start interval at 1 second - just like Castle Siege
    __eventCountdownInterval = setInterval(updateCounters, 1000);

    // Initial update immediately
    updateCounters();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize events navigation
function initEventsNavigation() {
    const gridContainer = document.getElementById('upcoming-events-grid');
    const prevBtn = document.getElementById('events-nav-prev');
    const nextBtn = document.getElementById('events-nav-next');

    if (!gridContainer || !prevBtn || !nextBtn) return;

    const scrollAmount = 320; // pixels to scroll - smooth incremental scroll

    prevBtn.addEventListener('click', () => {
        gridContainer.scrollBy({
            left: -scrollAmount,
            behavior: 'smooth'
        });
    });

    nextBtn.addEventListener('click', () => {
        gridContainer.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    });

    // Update button visibility based on scroll position
    function updateNavButtons() {
        const isAtStart = gridContainer.scrollLeft === 0;
        const isAtEnd = gridContainer.scrollLeft >= (gridContainer.scrollWidth - gridContainer.clientWidth - 10);

        prevBtn.style.opacity = isAtStart ? '0.4' : '1';
        prevBtn.style.pointerEvents = isAtStart ? 'none' : 'auto';

        nextBtn.style.opacity = isAtEnd ? '0.4' : '1';
        nextBtn.style.pointerEvents = isAtEnd ? 'none' : 'auto';
    }

    gridContainer.addEventListener('scroll', updateNavButtons);
    window.addEventListener('resize', updateNavButtons);

    // Initial check
    setTimeout(updateNavButtons, 100);
}

// Initialize events on page load
function initUpcomingEvents() {
    if (!document.body.classList.contains('page-home')) {
        return;
    }

    // Wait for PUBLIC_INFO to be loaded
    if (!window.PUBLIC_INFO || !window.PUBLIC_INFO.upcomingEvents || !Array.isArray(window.PUBLIC_INFO.upcomingEvents)) {
        // Try again in a moment
        setTimeout(initUpcomingEvents, 500);
        return;
    }

    try {
        renderUpcomingEvents();
    } catch (err) {
        console.error('Error rendering upcoming events:', err);
    }
}

// ============================================================================
// CLASSES SHOWCASE LOGIC (Etereal Style)
// ============================================================================

const MU_CLASSES = [
    {
        id: 'dk',
        name: 'DARK KNIGHT',
        icon: 'assets/images/chars/DK/dk-icon.png',
        titleImage: 'assets/images/chars/DK/dk encabezado.png',
        renderImage: 'assets/images/chars/DK/9cf99386-845b-4a33-bdc6-51d8cbe6399c.png',
        customStyle: 'transform: scale(1.0) translate(0px, 0px);', /* Edita esto */
        description: 'Maestro del combate cuerpo a cuerpo. Posee un gran poder físico y una defensa inquebrantable, ideal para liderar las batallas en primera línea y destrozar armaduras enemigas.',
        created: '1,542',
        video: 'https://cdn.streamelements.com/uploads/01knggksp3zvma9emxmn1rj937.mp4',
        skills: [
            { name: 'Twisting Slash', icon: 'fas fa-sync-alt' },
            { name: 'Death Stab', icon: 'fas fa-khanda' },
            { name: 'Rageful Blow', icon: 'fas fa-meteor' },
            { name: 'Swell Life', icon: 'fas fa-heart' }
        ]
    },
    {
        id: 'dw',
        name: 'DARK WIZARD',
        icon: 'assets/images/chars/SM/dw-icon.png',
        titleImage: 'assets/images/chars/SM/DW encabezado.png',
        renderImage: 'assets/images/chars/SM/8f3ead6e-38c7-4165-baff-1a9159493e1f.png',
        customStyle: 'transform: scale(1.0) translate(0px, 0px);',
        description: 'Dominador de los elementos arcanos. Capaz de desatar tormentas mágicas devastadoras sobre múltiples enemigos desde la distancia, controlando el flujo de la batalla.',
        created: '1,289',
        video: 'https://cdn.streamelements.com/uploads/01knggksp3zvma9emxmn1rj937.mp4',
        skills: [
            { name: 'Evil Spirits', icon: 'fas fa-ghost' },
            { name: 'Ice Storm', icon: 'fas fa-snowflake' },
            { name: 'Decay', icon: 'fas fa-skull-crossbones' },
            { name: 'Soul Barrier', icon: 'fas fa-shield-virus' }
        ]
    },
    {
        id: 'elf',
        name: 'FAIRY ELF',
        icon: 'assets/images/chars/FAIRY ELF/elf-icon.png',
        titleImage: 'assets/images/chars/FAIRY ELF/ELf encabezado-WmkejHhTPPZ6wZaPMkqTLLQg1QRAoB.png',
        renderImage: 'assets/images/chars/FAIRY ELF/0816d782-a116-4f59-a0f9-eafe0559f02d.png',
        customStyle: 'transform: scale(1.0) translate(0px, 0px);',
        description: 'Experta tiradora y sanadora de los bosques de Noria. Combina ataques precisos a distancia con magias de soporte e invocaciones vitales para cualquier grupo de asalto.',
        created: '1,054',
        video: 'https://cdn.streamelements.com/uploads/01knggksp3zvma9emxmn1rj937.mp4',
        skills: [
            { name: 'Multi-Shot', icon: 'fas fa-bullseye' },
            { name: 'Ice Arrow', icon: 'fas fa-icicles' },
            { name: 'Greater Def', icon: 'fas fa-shield-alt' },
            { name: 'Penetration', icon: 'fas fa-arrow-right' }
        ]
    },
    {
        id: 'mg',
        name: 'MAGIC GLADIATOR',
        icon: 'assets/images/chars/MG/mg icon.png',
        titleImage: 'assets/images/chars/MG/MG encabezado.png',
        renderImage: 'assets/images/chars/MG/30a9b3c7-2e2e-4b7a-8834-02c93227f974.png',
        customStyle: 'transform: scale(1.1) translateY(30px);',
        description: 'Guerrero híbrido excepcional. Empuña la fuerza bruta destructiva del caballero y domina los hechizos elementales del mago simultáneamente para una versatilidad sin igual.',
        created: '984',
        video: 'https://cdn.streamelements.com/uploads/01knggksp3zvma9emxmn1rj937.mp4',
        skills: [
            { name: 'Fire Slash', icon: 'fas fa-fire' },
            { name: 'Power Slash', icon: 'fas fa-bolt' },
            { name: 'Gigantic Storm', icon: 'fas fa-poo-storm' },
            { name: 'Flame Strike', icon: 'fas fa-fire-alt' }
        ]
    },
    {
        id: 'dl',
        name: 'DARK LORD',
        icon: 'assets/images/chars/DL/dl icon.png',
        titleImage: 'assets/images/chars/DL/DL encabezado.png',
        renderImage: 'assets/images/chars/DL/3e2d13c1-d58f-4e1f-bf28-1d222820b0c6.png',
        customStyle: 'transform: scale(1.0) translate(0px, 0px);',
        description: 'Señor oscuro y líder nato. Domina el campo de batalla montado en su corcel, utilizando su cuervo divino y hechizos de daño masivo con área de efecto para aniquilar legiones.',
        created: '845',
        video: 'https://cdn.streamelements.com/uploads/01knggksp3zvma9emxmn1rj937.mp4',
        skills: [
            { name: 'Fireburst', icon: 'fas fa-link' },
            { name: 'Earthshake', icon: 'fas fa-mountain' },
            { name: 'Chaotic Desier', icon: 'fas fa-crow' },
            { name: 'Critical Dmg', icon: 'fas fa-star' }
        ]
    },
    {
        id: 'su',
        name: 'SUMMONER',
        icon: 'assets/images/chars/SUMONNER/sm icon.png',
        titleImage: 'assets/images/chars/SUMONNER/SM encabezado.png',
        renderImage: 'assets/images/chars/SUMONNER/6ce54a81-4338-490e-b759-a314057cb2ed.png',
        customStyle: 'transform: scale(1.0) translate(0px, 0px);',
        description: 'Mística de las artes oscuras de Elbeland. Utiliza maldiciones para debilitar gravemente al enemigo, extrayendo su fuerza vital e invocando entidades de otra dimensión.',
        created: '751',
        video: 'https://cdn.streamelements.com/uploads/01knggksp3zvma9emxmn1rj937.mp4',
        skills: [
            { name: 'Chain Lightning', icon: 'fas fa-bolt' },
            { name: 'Berserker', icon: 'fas fa-angry' },
            { name: 'Sleep', icon: 'fas fa-moon' },
            { name: 'Red Storm', icon: 'fas fa-cloud-showers-heavy' }
        ]
    },
    {
        id: 'rf',
        name: 'RAGE FIGHTER',
        icon: 'assets/images/chars/RAGE/rf icon.png',
        titleImage: 'assets/images/chars/RAGE/RF-encabezado.png',
        renderImage: 'assets/images/chars/RAGE/4429ba1e-aaeb-4537-8252-e8cdaa20bcab.png',
        customStyle: 'transform: scale(1.0) translate(0px, 0px);',
        description: 'Luchador letal especializado en artes marciales antiguas. Destaca en el combate cercano con daño explosivo capaz de ignorar las defensas del enemigo, un verdadero asesino veloz.',
        created: '632',
        video: 'https://cdn.streamelements.com/uploads/01knggksp3zvma9emxmn1rj937.mp4',
        skills: [
            { name: 'Chain Drive', icon: 'fas fa-shoe-prints' },
            { name: 'Dark Side', icon: 'fas fa-user-ninja' },
            { name: 'Dragon Roar', icon: 'fas fa-dragon' },
            { name: 'Ignore Def', icon: 'fas fa-fist-raised' }
        ]
    }
];

function initClassesShowcase() {
    const sidebar = document.getElementById('classes-sidebar');
    if (!sidebar) return; // Not on home page

    // Render Sidebar Buttons
    sidebar.innerHTML = MU_CLASSES.map((cls, idx) => `
        <button class="class-btn ${idx === 0 ? 'active' : ''}" data-class-id="${cls.id}" aria-label="${cls.name}">
            <img src="${cls.icon}" alt="${cls.name} icon">
        </button>
    `).join('');

    const btns = sidebar.querySelectorAll('.class-btn');
    
    // Elements to update
    const titleImgEl = document.getElementById('class-title-img');
    const renderImgEl = document.getElementById('class-render-img');
    const descEl = document.getElementById('class-description');
    const createdTextEl = document.getElementById('class-created-text');
    const skillsListEl = document.getElementById('class-skills-list');

    const pluralNames = {
        'DARK KNIGHT': 'DARK KNIGHTS',
        'DARK WIZARD': 'DARK WIZARDS',
        'FAIRY ELF': 'FAIRY ELVES',
        'MAGIC GLADIATOR': 'MAGIC GLADIATORS',
        'DARK LORD': 'DARK LORDS',
        'SUMMONER': 'SUMMONERS',
        'RAGE FIGHTER': 'RAGE FIGHTERS'
    };

    // Fetch real character counts
    const loadRealCounts = async () => {
        try {
            const serverType = localStorage.getItem('selectedServer') || '';
            const url = `/top-ranking-characters?serverType=${encodeURIComponent(serverType)}`;
            const res = await fetch(window.location.origin + url);
            if (!res.ok) return;
            const players = await res.json();
            if (!Array.isArray(players)) return;

            const counts = { dk: 0, dw: 0, elf: 0, mg: 0, dl: 0, su: 0, rf: 0 };
            players.forEach(p => {
                const classId = Number(p.Class ?? p.ClassId ?? 0);
                const serverFiles = (window.SELECTED_SERVER_FILES || window.SERVER_FILES || 'IGCN').toString();
                const classData = typeof getCharacterClassData === 'function' ? getCharacterClassData(serverFiles, classId) : null;
                if (classData && classData[5]) {
                    let baseClass = classData[5].toLowerCase();
                    if (baseClass === 'fe') baseClass = 'elf';
                    if (baseClass === 'summ') baseClass = 'su';
                    if (counts[baseClass] !== undefined) {
                        counts[baseClass]++;
                    }
                }
            });

            MU_CLASSES.forEach(cls => {
                if (counts[cls.id] !== undefined) {
                    cls.created = counts[cls.id].toLocaleString();
                }
            });

            const activeBtn = sidebar.querySelector('.class-btn.active');
            if (activeBtn && createdTextEl) {
                const activeId = activeBtn.getAttribute('data-class-id');
                const activeCls = MU_CLASSES.find(c => c.id === activeId);
                if (activeCls) {
                    const plName = pluralNames[activeCls.name] || `${activeCls.name}S`;
                    createdTextEl.innerHTML = `<span class="stat-label">${plName} CREADOS:</span> <strong id="class-created-count" class="stat-value">${activeCls.created || '0'}</strong>`;
                }
            }
        } catch (e) {
            console.error('Error al cargar recuentos reales de personajes', e);
        }
    };

    loadRealCounts();

    const updateClassInfo = (clsId) => {
        const cls = MU_CLASSES.find(c => c.id === clsId) || MU_CLASSES[0];

        // Update Images & Text
        titleImgEl.src = cls.titleImage;
        renderImgEl.src = cls.renderImage;
        renderImgEl.style.cssText = cls.customStyle || ''; 
        if(descEl) descEl.innerHTML = cls.description || '';
        
        if(createdTextEl) {
            const plName = pluralNames[cls.name] || `${cls.name}S`;
            createdTextEl.innerHTML = `<span class="stat-label"><i class="fas fa-chart-line" style="color: rgba(255,215,0,0.8); margin-right: 5px;"></i> ${plName} CREADOS:</span> <strong id="class-created-count" class="stat-value">0</strong>`;
            
            const targetCount = parseInt((cls.created || '0').replace(/,/g, ''), 10) || 0;
            const countEl = document.getElementById('class-created-count');
            if(countEl && targetCount > 0) {
                let start = 0;
                const duration = 1000;
                const stepTime = 20;
                const steps = duration / stepTime;
                const increment = Math.ceil(targetCount / steps);
                
                const timer = setInterval(() => {
                    start += increment;
                    if (start >= targetCount) {
                        countEl.innerText = targetCount.toLocaleString();
                        clearInterval(timer);
                    } else {
                        countEl.innerText = start.toLocaleString();
                    }
                }, stepTime);
            }
        }

        // Update Skills
        skillsListEl.innerHTML = cls.skills.map(skill => `
            <div class="skill-box">
                <div class="skill-icon-wrapper">
                    <i class="${skill.icon}"></i>
                </div>
                <span class="skill-name">${skill.name}</span>
            </div>
        `).join('');

        // Trigger animations by cloning and replacing
        titleImgEl.style.animation = 'none';
        renderImgEl.style.animation = 'none';
        
        // Trigger reflow
        void titleImgEl.offsetWidth;
        
        titleImgEl.style.animation = 'fadeInDown 0.8s ease-out';
        renderImgEl.style.animation = 'slideInLeft 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)';
    };

    // Attach listeners
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateClassInfo(btn.getAttribute('data-class-id'));
        });
    });

    // Sidebar navigation arrows
    const navUp = document.querySelector('.nav-up');
    const navDown = document.querySelector('.nav-down');
    
    if (navUp && navDown) {
        navUp.addEventListener('click', () => {
            sidebar.scrollBy({ top: -80, behavior: 'smooth' });
        });
        navDown.addEventListener('click', () => {
            sidebar.scrollBy({ top: 80, behavior: 'smooth' });
        });
    }

    // Initialize first class
    if (MU_CLASSES.length > 0) {
        updateClassInfo(MU_CLASSES[0].id);
    }
}

// Call on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initUpcomingEvents();
        initClassesShowcase();
    });
} else {
    initUpcomingEvents();
    initClassesShowcase();
}

