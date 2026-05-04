/**
 * Promos Module
 * Manages promotional popups and events in the UI.
 */

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
        <div class="promo-modal__panel" role="document">
            <div class="promo-modal__border-glow"></div>
            <div class="promo-modal__vfx" id="promo-modal-vfx"></div>
            <button class="promo-modal__close" type="button" aria-label="Close" data-action="close">
                <i class="fas fa-times"></i>
            </button>
            <div class="promo-modal__timer-banner" id="promo-modal-timer-banner" hidden>
                <i class="fas fa-bolt"></i>
                <span data-i18n="promo.expires_in">ENDS IN:</span>
                <strong id="promo-modal-timer-value">00:00:00</strong>
            </div>
            <div class="promo-modal__art" id="promo-modal-art" aria-label="Promo">
                <div class="promo-modal__overlay" id="promo-modal-overlay" hidden>
                    <div class="promo-modal__overlay-box">
                        <div class="promo-modal__badge" id="promo-modal-badge" hidden></div>
                        <div class="promo-modal__rarity" id="promo-modal-rarity" hidden>
                            <div class="rarity-head">
                                <i class="fas fa-fire"></i>
                                <label id="promo-modal-rarity-label">LIMITED STOCK</label>
                            </div>
                            <div class="rarity-bar"><div class="rarity-bar-fill" id="promo-modal-rarity-fill"></div></div>
                        </div>
                        <div class="promo-modal__title" id="promo-modal-title" hidden></div>
                        <div class="promo-modal__subtitle" id="promo-modal-subtitle" hidden></div>
                        <div class="promo-modal__lines" id="promo-modal-lines" hidden></div>
                    </div>
                </div>
            </div>
            <div class="promo-modal__footer">
                <label class="promo-modal__dont">
                    <input id="promo-modal-dont" type="checkbox" />
                    <span class="promo-modal__switch" aria-hidden="true">
                        <span class="promo-modal__switch-track"></span>
                        <span class="promo-modal__switch-thumb"></span>
                    </span>
                    <span class="promo-modal__dont-text">Don't show for 24 hours</span>
                </label>
                <a class="promo-modal__cta" id="promo-modal-cta" href="#" target="_blank" rel="noopener">Learn more</a>
            </div>
        </div>
    `.trim();



    document.body.appendChild(modal);
    return modal;
}

function tryShowIndexPromoPopup() {
    try {
        if (!document.body || !document.body.classList.contains('page-home')) return;

        const events = (window.PUBLIC_INFO && Array.isArray(window.PUBLIC_INFO.events)) ? window.PUBLIC_INFO.events : [];
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
        const overlay = document.getElementById('promo-modal-overlay');
        const badgeEl = document.getElementById('promo-modal-badge');
        const titleEl = document.getElementById('promo-modal-title');
        const subEl = document.getElementById('promo-modal-subtitle');
        const linesEl = document.getElementById('promo-modal-lines');
        const dont = document.getElementById('promo-modal-dont');
        const cta = document.getElementById('promo-modal-cta');
        if (!art || !cta || !dont || !overlay || !badgeEl || !titleEl || !subEl || !linesEl) return;

        const timerBanner = document.getElementById('promo-modal-timer-banner');
        const timerValue = document.getElementById('promo-modal-timer-value');
        const rarityEl = document.getElementById('promo-modal-rarity');
        const rarityLabel = document.getElementById('promo-modal-rarity-label');
        const rarityFill = document.getElementById('promo-modal-rarity-fill');
        // Reset & Generate VFX (Embers)
        if (vfx) {
            vfx.innerHTML = '';
            const particleCount = 40;
            for(let i=0; i<particleCount; i++) {
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


        const img = (pick.imageUrl || '').toString().trim();
        art.style.backgroundImage = img ? `url('${img.replace(/'/g, "\\'")}')` : '';

        const badge = (pick.badge || '').toString().trim();
        const title = (pick.title || '').toString().trim();
        const subtitle = (pick.subtitle || '').toString().trim();
        const lines = Array.isArray(pick.lines) ? pick.lines : [];
        const hasOverlay = !!(badge || title || subtitle || lines.length);
        overlay.hidden = !hasOverlay;

        // --- REFINEMENT: FORCE DEMO DATA IF MISSING ---
        const pickExpiresAt = pick.expiresAt || new Date(Date.now() + 86400000 * 2).toISOString(); // Default 48h
        const expiresAt = new Date(pickExpiresAt).getTime();
        
        const pickStock = pick.stockPercent !== undefined ? Number(pick.stockPercent) : 85; // Default 85%
        
        // Timer Logic
        let timerInterval = null;
        if (timerBanner && timerValue) {
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
        }

        // Rarity / Stock Logic
        if (rarityEl && rarityFill && rarityLabel) {
            rarityEl.hidden = false;
            rarityFill.style.width = pickStock + '%';
            rarityLabel.textContent = pick.rarityLabel || `ONLY ${pickStock}% REMAINING`;
        }


        badgeEl.hidden = !badge;
        badgeEl.innerHTML = badge ? esc(badge) : '';

        titleEl.hidden = !title;
        titleEl.innerHTML = title ? esc(title) : '';

        subEl.hidden = !subtitle;
        subEl.innerHTML = subtitle ? esc(subtitle) : '';

        const renderIcon = (icon, text) => {
            if (!icon) {
                // Smart auto-icon based on text
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
            ? `<ul>${safeLines.map((x, i) => `
                <li class="cascade-item" style="animation-delay: ${0.5 + (i * 0.15)}s">
                    ${renderIcon(x.icon, x.text)}
                    <span>${esc(x.text)}</span>
                </li>`).join('')}</ul>`
            : '';



        const url = (pick.linkUrl || '').toString().trim();
        if (url) {
            cta.setAttribute('href', url);
            cta.style.display = '';
        } else {
            cta.setAttribute('href', '#');
            cta.style.display = 'none';
        }

        const ctaText = (pick.ctaText || '').toString().trim();
        cta.textContent = ctaText || 'Learn more';

        const label = modal.querySelector('.promo-modal__dont-text');
        if (label) label.textContent = `Don't show for ${Math.max(1, dismissHours)} hours`;

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
    }
}

window.tryShowIndexPromoPopup = tryShowIndexPromoPopup;
window.ensurePromoPopupModal = ensurePromoPopupModal;
