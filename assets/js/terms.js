(function () {
    const TERMS_JSON_PATH = 'assets/json/terms-data.json';

    const getSelectedLangSafe = () => {
        try {
            if (typeof window.getSelectedLang === 'function') return window.getSelectedLang();
        } catch (e) {}
        try {
            return (localStorage.getItem('selectedLang') || 'en').toString().trim().toLowerCase() || 'en';
        } catch (e) {
            return 'en';
        }
    };

    const pickByLang = (value, lang) => {
        if (value == null) return '';
        if (typeof value === 'string') return value;
        if (typeof value !== 'object') return String(value);

        const l = (lang || 'en').toString().trim().toLowerCase() || 'en';
        const direct = value[l];
        if (typeof direct === 'string' && direct.trim()) return direct;

        const en = value.en;
        if (typeof en === 'string' && en.trim()) return en;

        const first = Object.values(value).find(v => typeof v === 'string' && v.trim());
        return typeof first === 'string' ? first : '';
    };

    const escapeHtml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));

    const buildNavLabelFallback = (key) => {
        const map = {
            serverRules: 'Server Rules & Conduct',
            streamingAffiliate: 'Streaming & Affiliate Program',
            termsAndConditions: 'Terms of Service',
            refundPolicy: 'Refund Policy',
            privacyPolicy: 'Privacy Policy'
        };
        return map[key] || key;
    };

    const render = (data) => {
        const navHost = document.getElementById('terms-nav');
        const kickerEl = document.getElementById('terms-section-kicker');
        const titleEl = document.getElementById('terms-section-title');
        const contentEl = document.getElementById('terms-section-content');
        let hasRenderedSection = false;
        let contentSwapTimer = null;

        if (!navHost || !titleEl || !contentEl) return;

        const lang = getSelectedLangSafe();
        const entries = Object.entries(data || {}).map(([key, section]) => ({ key, section })).filter(x => x.section && typeof x.section === 'object');

        if (!entries.length) {
            navHost.innerHTML = `<div style="color:#aaa;" data-i18n="terms.no_sections">No sections.</div>`;
            if (typeof window.applyTranslations === 'function') window.applyTranslations(document);
            return;
        }

        navHost.innerHTML = entries.map((e, idx) => {
            const section = e.section;
            const id = (section.id || e.key || '').toString().trim();
            const title = pickByLang(section.title, lang) || buildNavLabelFallback(e.key);
            const icon = (section.icon || 'bx-file').toString().trim();

            return `
                <button
                    class="terms-nav-item"
                    data-terms-id="${escapeHtml(id)}"
                    data-terms-key="${escapeHtml(e.key)}"
                    ${idx === 0 ? 'data-terms-default="1"' : ''}
                >
                    <i class='bx ${escapeHtml(icon)}'></i>
                    <span>${title}</span>
                </button>
            `.trim();
        }).join('');

        const setSectionContent = (html, animate = true) => {
            if (contentSwapTimer) {
                clearTimeout(contentSwapTimer);
                contentSwapTimer = null;
            }

            if (!animate) {
                contentEl.innerHTML = html || '';
                if (typeof window.applyTranslations === 'function') window.applyTranslations(document);
                return;
            }

            contentEl.classList.add('is-switching');
            contentSwapTimer = window.setTimeout(() => {
                contentEl.innerHTML = html || '';
                if (typeof window.applyTranslations === 'function') window.applyTranslations(document);
                window.requestAnimationFrame(() => {
                    contentEl.classList.remove('is-switching');
                });
                contentSwapTimer = null;
            }, 120);
        };

        const selectSection = (key) => {
            const entry = entries.find(e => e.key === key);
            if (!entry) return;

            navHost.querySelectorAll('button[data-terms-key]').forEach(b => {
                const isActive = b.getAttribute('data-terms-key') === key;
                b.classList.toggle('active', isActive);
            });

            const section = entry.section;
            const headerLabel = pickByLang(section.title, lang) || buildNavLabelFallback(entry.key);
            if (kickerEl) kickerEl.textContent = headerLabel;
            titleEl.textContent = headerLabel;
            setSectionContent(pickByLang(section.content, lang) || '', hasRenderedSection);
            hasRenderedSection = true;
        };

        const setFromHashOrDefault = () => {
            const rawHash = (window.location.hash || '').replace(/^#/, '');
            const foundById = entries.find(e => String(e.section.id || '') === rawHash);
            if (foundById) {
                selectSection(foundById.key);
                return;
            }
            const defaultBtn = navHost.querySelector('button[data-terms-default="1"]');
            const defaultKey = defaultBtn ? defaultBtn.getAttribute('data-terms-key') : entries[0].key;
            selectSection(defaultKey);
        };

        navHost.addEventListener('click', (ev) => {
            const btn = ev.target && ev.target.closest ? ev.target.closest('button[data-terms-key]') : null;
            if (!btn) return;
            const key = btn.getAttribute('data-terms-key');
            if (!key) return;
            const id = btn.getAttribute('data-terms-id');
            if (id) window.location.hash = `#${id}`;
            selectSection(key);
        });

        window.addEventListener('hashchange', setFromHashOrDefault);

        setFromHashOrDefault();
    };

    const loadTermsData = async () => {
        try {
            const res = await fetch(TERMS_JSON_PATH, { cache: 'no-store' });
            if (!res.ok) throw new Error('terms load failed');
            const data = await res.json();
            render(data);
        } catch (e) {
            const navHost = document.getElementById('terms-nav');
            const kickerEl = document.getElementById('terms-section-kicker');
            const titleEl = document.getElementById('terms-section-title');
            const contentEl = document.getElementById('terms-section-content');
            if (navHost) navHost.innerHTML = `<div style="color:#aaa;">${escapeHtml((typeof window.t === 'function') ? window.t('terms.load_failed', 'Failed to load terms.') : 'Failed to load terms.')}</div>`;
            if (kickerEl) kickerEl.textContent = '-';
            if (titleEl) titleEl.textContent = '-';
            if (contentEl) contentEl.innerHTML = '';
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        loadTermsData();

        const langSelect = document.getElementById('header-lang-select');
        if (langSelect) {
            langSelect.addEventListener('change', () => {
                setTimeout(() => loadTermsData(), 0);
            });
        }
    });
})();
