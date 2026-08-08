(function () {
    async function fetchJson(path) {
        const res = await fetch(path, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load: ' + path);
        return await res.json();
    }

    function escapeHtml(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function slugify(s) {
        return String(s ?? '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 80) || 'section';
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

    function sectionBar(title) {
        return `<div class="si-bar"><span>${escapeHtml(title)}</span></div>`;
    }

    function rowList(items) {
        const arr = Array.isArray(items) ? items : [];
        if (!arr.length) return '';
        return `
            <div class="si-row-list">
                ${arr.map(x => `
                    <div class="si-row">
                        <div class="si-row-left">${escapeHtml(x?.left ?? '')}</div>
                        <div class="si-row-right">${escapeHtml(x?.right ?? '')}</div>
                    </div>
                `.trim()).join('')}
            </div>
        `.trim();
    }

    function bullets(items) {
        const arr = Array.isArray(items) ? items : [];
        if (!arr.length) return '';
        return `<ul class="si-list">${arr.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
    }

    function tableKV(rows, headLeft, headRight) {
        const arr = Array.isArray(rows) ? rows : [];
        if (!arr.length) return '';
        const body = arr.map(r => `<tr><td>${escapeHtml(r?.left ?? '')}</td><td>${escapeHtml(r?.right ?? '')}</td></tr>`).join('');
        return `
            <div class="si-table-wrap">
                <table class="si-table">
                    <thead><tr><th>${escapeHtml(headLeft)}</th><th>${escapeHtml(headRight)}</th></tr></thead>
                    <tbody>${body}</tbody>
                </table>
            </div>
        `.trim();
    }

    function setOnlyVisibleSection(root, slug) {
        const s = String(slug || '').trim();
        if (!root || !s) return;
        root.querySelectorAll('.section-card[data-slug]').forEach(sec => {
            sec.style.display = (sec.getAttribute('data-slug') === s) ? '' : 'none';
        });
    }

    function setActiveMenuSlug(slug) {
        const nav = document.getElementById('extras-menu');
        if (nav) {
            nav.querySelectorAll('a[data-slug]').forEach(a => {
                a.classList.toggle('active', a.getAttribute('data-slug') === slug);
            });
        }
    }

    function renderEvents(data) {
        const farmEvents = Array.isArray(data?.farmEvents) ? data.farmEvents : [];
        const pvpEvents = Array.isArray(data?.pvpEvents) ? data.pvpEvents : [];
        const rr = data?.resetRewards || {};

        const mkEvent = (e) => {
            const drops = Array.isArray(e?.drops) ? e.drops : [];
            const winner = Array.isArray(e?.winner) ? e.winner : [];
            const loser = Array.isArray(e?.loser) ? e.loser : [];
            const note = e?.note ? `<div style="color: rgba(255,255,255,0.65); margin-top:8px;">${escapeHtml(e.note)}</div>` : '';
            const parts = [
                drops.length ? `${sectionBar('Drops')}${bullets(drops)}` : '',
                winner.length ? `${sectionBar('Winner')}${bullets(winner)}` : '',
                loser.length ? `${sectionBar('Loser')}${bullets(loser)}` : ''
            ].filter(Boolean).join('');
            return `<div class="section-card" data-item="1">${parts}${note}</div>`;
        };

        const farmHtml = farmEvents.length
            ? `<div class="section-card" data-slug="farm-events" data-label="Farm Events">${sectionBar('Farm Events')}${farmEvents.map(e => `
                <div style="margin-top:14px;">
                    <div class="section-title"><i class="fas fa-seedling"></i> ${escapeHtml(e.name || '')}</div>
                    ${bullets(e?.drops || [])}
                </div>
            `.trim()).join('')}</div>`
            : '';

        const pvpHtml = pvpEvents.length
            ? `<div class="section-card" data-slug="pvp-events" data-label="PvP Events">${sectionBar('PvP Events')}${pvpEvents.map(e => `
                <div style="margin-top:14px;">
                    <div class="section-title"><i class="fas fa-skull-crossbones"></i> ${escapeHtml(e.name || '')}</div>
                    ${e?.note ? `<div style="color: rgba(255,255,255,0.65); margin: 8px 0 10px;">${escapeHtml(e.note)}</div>` : ''}
                    ${Array.isArray(e?.winner) ? `${sectionBar('Winner')}${bullets(e.winner)}` : ''}
                    ${Array.isArray(e?.loser) ? `${sectionBar('Loser')}${bullets(e.loser)}` : ''}
                </div>
            `.trim()).join('')}</div>`
            : '';

        const resetsHtml = rr && typeof rr === 'object'
            ? `<div class="section-card" data-slug="reset-rewards" data-label="Reset Rewards">
                ${sectionBar('Reset Rewards')}
                ${Array.isArray(rr.base) ? `${sectionBar('Base')}${rowList(rr.base.map(x => ({ left: x?.label || '', right: x?.reward || '' })))}` : ''}
                ${Array.isArray(rr.milestones) ? `${sectionBar('Milestones')}${rowList(rr.milestones.map(x => ({ left: `Reset ${x?.reset ?? ''}`, right: x?.reward || '' })))}` : ''}
                ${Array.isArray(rr.periodic) ? `${sectionBar('Periodic')}${rowList(rr.periodic.map(x => ({ left: x?.interval || '', right: x?.reward || '' })))}` : ''}
                ${Array.isArray(rr.special) ? `${sectionBar('Special')}${rowList(rr.special.map(x => ({ left: `Reset ${x?.reset ?? ''}`, right: x?.reward || '' })))}` : ''}
            </div>`
            : '';

        return [farmHtml, pvpHtml, resetsHtml].filter(Boolean).join('');
    }

    function renderRewardGroups(data, groups) {
        const out = [];
        for (const g of groups) {
            const arr = Array.isArray(data?.[g.key]) ? data[g.key] : [];
            if (!arr.length) continue;
            const first = arr[0] || {};
            const title = first.name || g.label;
            const drops = Array.isArray(first.drops) ? first.drops : [];
            out.push(`<div class="section-card" data-slug="${escapeHtml(g.slug)}" data-label="${escapeHtml(g.label)}">${sectionBar(title)}${bullets(drops)}</div>`);
        }
        return out.join('');
    }

    async function init() {
        const root = document.getElementById('extras-root');
        const nav = document.getElementById('extras-menu');
        if (!root) return;

        const page = String(root.getAttribute('data-page') || '').trim();

        const pageConfig = {
            events: { title: 'Events', file: 'events.json' },
            chaos_cards: { title: 'Chaos Cards', file: 'chaos-card-rewards.json' },
            moss_special: { title: 'Moss Special', file: 'moss-rewards-special.json' },
            delgado_lucky: { title: 'Delgado Lucky Coin', file: 'delgado-lucky-coin-rewards.json' },
            boss_rewards: { title: 'Bosses Rewards', file: 'boss-rewards.json' },
            invasion_rewards: { title: 'Invasion Rewards', file: 'invasion-rewards.json' }
        };

        const cfg = pageConfig[page];
        if (!cfg) {
            root.innerHTML = '<div class="section-card">Invalid page.</div>';
            return;
        }

        try {
            const data = await fetchServerJson(cfg.file);

            let html = '';
            if (page === 'events') {
                html = renderEvents(data);
            }
            if (page === 'chaos_cards') {
                html = renderRewardGroups(data, [
                    { key: 'chaosCard', label: 'Chaos Card', slug: 'chaos-card' },
                    { key: 'chaosCardMini', label: 'Chaos Card Mini', slug: 'chaos-card-mini' },
                    { key: 'chaosCardGold', label: 'Chaos Card Gold', slug: 'chaos-card-gold' },
                    { key: 'chaosCardRare', label: 'Chaos Card Rare', slug: 'chaos-card-rare' }
                ]);
            }
            if (page === 'moss_special') {
                html = renderRewardGroups(data, [
                    { key: 'mossRewardsSpecial', label: 'Moss Special', slug: 'moss-special' }
                ]);
            }
            if (page === 'delgado_lucky') {
                html = renderRewardGroups(data, [
                    { key: 'delgadoLuckyCoin', label: 'Delgado Lucky Coin', slug: 'delgado-lucky-coin' }
                ]);
            }
            if (page === 'boss_rewards') {
                html = renderRewardGroups(data, [
                    { key: 'bossRewards', label: 'Bosses Rewards', slug: 'bosses-rewards' }
                ]);
            }
            if (page === 'invasion_rewards') {
                html = renderRewardGroups(data, [
                    { key: 'invasionRewards', label: 'Invasion Rewards', slug: 'invasion-rewards' }
                ]);
            }

            root.innerHTML = html || '<div class="section-card">No data.</div>';

            const sections = Array.from(root.querySelectorAll('.section-card[data-slug]'))
                .map(s => ({ slug: s.getAttribute('data-slug') || '', label: s.getAttribute('data-label') || '' }))
                .filter(x => x.slug && x.label);

            nav.innerHTML = sections.map(x => `<a href="#sec-${escapeHtml(x.slug)}" data-slug="${escapeHtml(x.slug)}">${escapeHtml(x.label)}</a>`).join('');
            nav.querySelectorAll('a[data-slug]').forEach(a => {
                if (a.dataset.bound === '1') return;
                a.dataset.bound = '1';
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    const slug = a.getAttribute('data-slug');
                    setOnlyVisibleSection(root, slug);
                    setActiveMenuSlug(slug);
                });
            });

            const first = sections[0]?.slug;
            if (first) {
                setOnlyVisibleSection(root, first);
                setActiveMenuSlug(first);
            }
        } catch (e) {
            root.innerHTML = '<div class="section-card">Failed to load.</div>';
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();
