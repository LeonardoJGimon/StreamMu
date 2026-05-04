(function () {
    async function fetchJson(path) {
        const res = await fetch(path, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load: ' + path);
        return await res.json();
    }

    function getSelectedServerFolder() {
        try {
            const raw = String(localStorage.getItem('selectedServer') || '').trim().toLowerCase();
            const safe = raw.replace(/[^a-z0-9_-]/g, '');
            return safe || 'server1';
        } catch (e) {
            return 'server1';
        }
    }

    async function fetchServerJson(fileName) {
        const folder = getSelectedServerFolder();
        const primary = `/assets/json/${encodeURIComponent(folder)}/${fileName}`;
        const fallback = `/assets/json/server1/${fileName}`;

        try {
            return await fetchJson(primary);
        } catch (e) {
            return await fetchJson(fallback);
        }
    }

    function slugify(s) {
        return String(s ?? '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 80) || 'item';
    }

    function escapeHtml(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function renderPills(items, kind) {
        const cls = kind === 'good' ? 'pill pill--good' : kind === 'bad' ? 'pill pill--bad' : 'pill pill--even';
        const arr = Array.isArray(items) ? items : [];
        if (!arr.length) return '<div class="pills"></div>';
        return `<div class="pills">${arr.map(x => `<span class="${cls}">${escapeHtml(x)}</span>`).join('')}</div>`;
    }

    function normalizeImage(src) {
        const raw = String(src ?? '').trim();
        if (!raw) return '';
        if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw;
        return raw.replace(/\\/g, '/');
    }

    function buildViewer(k, info) {
        const title = info?.title || k;
        const mainStat = info?.mainStat || '-';
        const secondaryStat = info?.secondaryStat || '-';
        const autoStat = info?.autoStat || '-';
        const img = normalizeImage(info?.image);
        const altBuild = info?.altBuild;
        const slug = slugify(title);

        const sub = altBuild && (altBuild.mainStat || altBuild.secondaryStat)
            ? `Alt build: ${altBuild.mainStat || '-'} / ${altBuild.secondaryStat || '-'}`
            : '';

        return `
            <article class="class-view-card" data-slug="${escapeHtml(slug)}" data-label="${escapeHtml(title)}">
                ${img ? `<div class="class-bg" style="background-image: url('${escapeHtml(img)}')"></div>` : ''}
                <div class="class-view-content">
                    <div class="class-view-head">
                        <div>
                            <h2 class="class-view-title">${escapeHtml(title)}</h2>
                            ${sub ? `<div class="class-sub">${escapeHtml(sub)}</div>` : ''}
                        </div>
                    </div>

                    <div class="class-card-body">
                        <div class="kv">
                            <div class="kv-row"><span>Main Stat</span><strong>${escapeHtml(mainStat)}</strong></div>
                            <div class="kv-row"><span>Secondary Stat</span><strong>${escapeHtml(secondaryStat)}</strong></div>
                            <div class="kv-row">
                                <span>Autostat</span>
                                <strong class="autostat-wrap">
                                    <span class="autostat-text" data-autostat="${escapeHtml(autoStat)}">${escapeHtml(autoStat)}</span>
                                    <button class="copy-btn" type="button" data-copy="autostat" data-value="${escapeHtml(autoStat)}" aria-label="Copy autostat">
                                        <i class="fas fa-copy"></i>
                                    </button>
                                </strong>
                            </div>
                        </div>

                        <div>
                            <div class="class-sub">Strong Against</div>
                            ${renderPills(info?.strongAgainst, 'good')}
                        </div>

                        <div>
                            <div class="class-sub">Weak Against</div>
                            ${renderPills(info?.weakAgainst, 'bad')}
                        </div>

                        <div>
                            <div class="class-sub">Equal To</div>
                            ${renderPills(info?.equalTo, 'even')}
                        </div>
                    </div>
                </div>
            </article>
        `.trim();
    }

    async function copyText(value) {
        const v = String(value ?? '').trim();
        if (!v) return false;

        try {
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                await navigator.clipboard.writeText(v);
                return true;
            }
        } catch (e) {}

        try {
            const ta = document.createElement('textarea');
            ta.value = v;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            ta.style.top = '0';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return !!ok;
        } catch (e) {
            return false;
        }
    }

    function setSelectedClassSlug(slug) {
        const s = String(slug || '').trim();
        if (!s) return;
        try { sessionStorage.setItem('classes:selected', s); } catch (e) {}
        setActiveMenuSlug(s);
    }

    function getSelectedClassSlug() {
        try { return String(sessionStorage.getItem('classes:selected') || '').trim(); } catch (e) { return ''; }
    }

    function renderSelected(viewer, dataBySlug, slug) {
        const entry = dataBySlug.get(slug);
        if (!entry) return;
        viewer.innerHTML = buildViewer(entry.k, entry.v);
        setSelectedClassSlug(slug);

        const copyBtn = viewer.querySelector('button.copy-btn[data-copy="autostat"]');
        if (copyBtn && copyBtn.dataset.bound !== '1') {
            copyBtn.dataset.bound = '1';
            copyBtn.addEventListener('click', async () => {
                const val = copyBtn.getAttribute('data-value') || '';
                const ok = await copyText(val);
                copyBtn.classList.toggle('copy-btn--ok', ok);
                setTimeout(() => copyBtn.classList.remove('copy-btn--ok'), 900);
            });
        }
    }

    function initDropdown(prefix, onSelect) {
        const root = document.getElementById(`${prefix}-dd`);
        const btn = document.getElementById(`${prefix}-dd-btn`);
        const panel = document.getElementById(`${prefix}-dd-panel`);
        const label = document.getElementById(`${prefix}-dd-label`);
        if (!btn || !panel || !label) return null;

        const close = () => {
            panel.hidden = true;
            btn.setAttribute('aria-expanded', 'false');
        };
        const open = () => {
            panel.hidden = false;
            btn.setAttribute('aria-expanded', 'true');
        };
        const toggle = () => {
            if (panel.hidden) open(); else close();
        };

        if (btn.dataset.bound !== '1') {
            btn.dataset.bound = '1';
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                toggle();
            });
        }

        if (root && root.dataset.docBound !== '1') {
            root.dataset.docBound = '1';
            document.addEventListener('click', (e) => {
                const t = e.target;
                if (root.contains(t)) return;
                close();
            });
        }

        panel.addEventListener('click', (e) => {
            const target = e.target;
            const opt = target && target.closest ? target.closest('[data-slug]') : null;
            if (!opt) return;
            const slug = opt.getAttribute('data-slug');
            const text = opt.getAttribute('data-label') || opt.textContent || '';
            label.textContent = text.trim() || 'Select...';
            close();
            onSelect && onSelect(slug);
        });

        return {
            setItems(items) {
                const arr = Array.isArray(items) ? items : [];
                panel.innerHTML = arr
                    .map(x => `<div class="dd-opt" role="option" data-slug="${escapeHtml(x.slug)}" data-label="${escapeHtml(x.label)}">${escapeHtml(x.label)}</div>`)
                    .join('');
            },
            setSelected(slug, labelText) {
                const s = String(slug || '').trim();
                if (s) {
                    panel.querySelectorAll('[data-slug]').forEach(el => {
                        el.classList.toggle('active', el.getAttribute('data-slug') === s);
                    });
                }
                if (labelText) label.textContent = String(labelText);
            },
            close
        };
    }

    function buildMenu(items, onSelect) {
        const nav = document.getElementById('classes-menu');
        const dd = initDropdown('classes', onSelect);
        if (!nav && !dd) return;

        const safeItems = Array.isArray(items) ? items : [];

        if (dd) dd.setItems(safeItems);

        if (nav) {
            nav.innerHTML = safeItems
                .map(x => `<a href="#class-${escapeHtml(x.slug)}" data-slug="${escapeHtml(x.slug)}">${escapeHtml(x.label)}</a>`)
                .join('');

            nav.querySelectorAll('a[data-slug]').forEach(a => {
                if (a.dataset.bound === '1') return;
                a.dataset.bound = '1';
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    const slug = a.getAttribute('data-slug');
                    onSelect && onSelect(slug);
                });
            });
        }
    }

    function setActiveMenuSlug(slug) {
        const nav = document.getElementById('classes-menu');
        const ddLabelEl = document.getElementById('classes-dd-label');
        const ddPanel = document.getElementById('classes-dd-panel');
        if (nav) {
            nav.querySelectorAll('a[data-slug]').forEach(a => {
                a.classList.toggle('active', a.getAttribute('data-slug') === slug);
            });
        }

        if (ddPanel && slug) {
            ddPanel.querySelectorAll('[data-slug]').forEach(el => {
                el.classList.toggle('active', el.getAttribute('data-slug') === slug);
            });
            if (ddLabelEl) {
                const active = ddPanel.querySelector(`[data-slug="${CSS.escape(slug)}"]`);
                const txt = active ? (active.getAttribute('data-label') || active.textContent || '') : '';
                if (txt) ddLabelEl.textContent = txt.trim();
            }
        }
    }

    function bindSearch(input, getItems, applyVisible) {
        if (!input) return;

        const update = () => {
            const q = String(input.value || '').trim().toLowerCase();
            const items = getItems();
            const visible = items.filter(x => !q || String(x.label || '').toLowerCase().includes(q));
            applyVisible(visible);
        };

        input.addEventListener('input', update);
        update();
    }

    async function init() {
        const viewer = document.getElementById('class-viewer');
        const search = document.getElementById('class-search');
        if (!viewer) return;

        try {
            const data = await fetchServerJson('classes.json');
            const entries = Object.entries(data || {});

            const normalized = entries
                .map(([k, v]) => ({ k, v, label: String(v?.title || k), slug: slugify(String(v?.title || k)) }));

            const dataBySlug = new Map(normalized.map(x => [x.slug, { k: x.k, v: x.v }]));
            let visibleItems = normalized.map(x => ({ slug: x.slug, label: x.label }));

            const applyVisible = (list) => {
                visibleItems = Array.isArray(list) ? list : [];
                buildMenu(visibleItems, (slug) => {
                    if (!slug) return;
                    renderSelected(viewer, dataBySlug, slug);
                });

                const selected = getSelectedClassSlug();
                const stillVisible = visibleItems.some(x => x.slug === selected);
                const fallback = visibleItems[0]?.slug;
                const next = stillVisible ? selected : fallback;
                if (next) renderSelected(viewer, dataBySlug, next);
            };

            applyVisible(visibleItems);
            bindSearch(search, () => normalized.map(x => ({ slug: x.slug, label: x.label })), applyVisible);
        } catch (e) {
            viewer.innerHTML = '<div class="info-card">Failed to load classes.</div>';
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();
