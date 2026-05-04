(function () {
    'use strict';

    const PAGE_CONFIG = {
        boss_rewards: { title: 'Bosses Rewards', file: 'bosses.json' }
    };

    const MENU_CHUNK_SIZE = 80; // tune 50..200 based on performance

    async function fetchJson(url) {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load: ' + url);
        return res.json();
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
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
            return fetchJson(fallback);
        }
    }

    function normalizeBossSlug(boss) {
        // stable slug for data attributes (not for routing)
        const idx = Number(boss?.monsterIndex ?? -1);
        const name = String(boss?.monsterName ?? '').trim().toLowerCase();
        const safeName = name.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        return `${idx}-${safeName || 'boss'}`;
    }

    function setActiveMenuSlug(nav, slug) {
        if (!nav) return;
        const links = nav.querySelectorAll('a[data-slug]');
        for (let i = 0; i < links.length; i++) {
            const a = links[i];
            a.classList.toggle('active', a.getAttribute('data-slug') === slug);
        }
    }

    function setSelectedBossPlaceholder(root, boss) {
        if (!root) return;

        // Menu-only phase: show a tiny placeholder on the left so user sees selection works.
        const title = boss?.monsterName ? escapeHtml(boss.monsterName) : 'Select a boss';
        root.innerHTML = `<div class="section-card"><div class="si-bar"><span>${title}</span></div></div>`;
    }

    function buildBossMenuItem(boss, slug) {
        const label = boss?.monsterName ? String(boss.monsterName) : `Boss ${boss?.monsterIndex ?? ''}`;
        return `<a href="#boss-${escapeHtml(slug)}" data-slug="${escapeHtml(slug)}">${escapeHtml(label)}</a>`;
    }

    function renderBossMenuChunked(nav, bosses, onSelect) {
        if (!nav) return;

        nav.innerHTML = '';
        const fragment = document.createDocumentFragment();

        let index = 0;

        function appendChunk() {
            const end = Math.min(index + MENU_CHUNK_SIZE, bosses.length);

            for (; index < end; index++) {
                const boss = bosses[index];
                const slug = normalizeBossSlug(boss);

                const wrapper = document.createElement('div');
                wrapper.innerHTML = buildBossMenuItem(boss, slug);
                const link = wrapper.firstChild;

                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    onSelect(slug, boss);
                });

                fragment.appendChild(link);
            }

            nav.appendChild(fragment);

            if (index < bosses.length) {
                requestAnimationFrame(appendChunk);
            }
        }

        requestAnimationFrame(appendChunk);
    }

    function buildBossIndex(bosses) {
        const map = new Map();
        for (let i = 0; i < bosses.length; i++) {
            const boss = bosses[i];
            map.set(normalizeBossSlug(boss), boss);
        }
        return map;
    }

    function statCards(items) {
        const arr = Array.isArray(items) ? items : [];
        if (!arr.length) return '';
        return `
    <div class="si-stat-grid">
      ${arr.map(x => `
        <div class="si-stat-card">
          <div class="si-stat-label">${escapeHtml(x?.label ?? '')}</div>
          <div class="si-stat-value">${escapeHtml(x?.value ?? '')}</div>
        </div>
      `.trim()).join('')}
    </div>
  `.trim();
    }

    function formatPickMode(mode) {
        if (mode === 'RANDOM_ONE') return { text: 'Random item', icon: 'fa-dice' };
        if (mode === 'ALL') return { text: 'All items', icon: 'fa-layer-group' };
        return { text: String(mode || ''), icon: 'fa-circle-question' };
    }

    function formatCount(count) {
        const n = Number(count || 0);
        if (!n || n === 1) return 'x1';
        return `x${n}`;
    }

    function isExcellentItem(item) {
        // exc can be number or string like "1;6;40;6"
        const exc = item?.exc;
        if (typeof exc === 'string') return exc.trim() !== '' && exc.trim() !== '-1';
        const n = Number(exc);
        // -1 none, -2 random exc, -3 fixed count, 0..6 sometimes used in other contexts
        return n === -2 || n === -3 || n > 0;
    }

    function isSocketItem(item) {
        const sc = Number(item?.socketCount ?? 0);
        return sc > 0;
    }


    function isNonExcellent(item) {
        const exc = item?.exc;
        if (typeof exc === 'string') return exc.trim() === '-1' || exc.trim() === '';
        return Number(exc) === -1;
    }

    function chipClass(item) {
        if (isExcellentItem(item)) return 'br-chip br-chip-exc';
        if (isSocketItem(item)) return 'br-chip br-chip-socket';
        if (isNonExcellent(item)) return 'br-chip br-chip-nonexc';
        return 'br-chip';
    }


    function socketText(socketCount) {
        const sc = Number(socketCount ?? 0);
        if (sc <= 0) return 'Sockets: none';
        return `Sockets: ${sc}`;
    }

    function elementalText(elementalItem) {
        const el = Number(elementalItem ?? 0);
        return el === 1 ? 'Elemental: Yes' : 'Elemental: No';
    }

    function excText(exc) {
        if (exc === null || exc === undefined) return 'Excellent: none';
        if (typeof exc === 'string') return `Excellent: ${exc}`;
        const n = Number(exc);
        if (n === -1) return 'Excellent: none';
        if (n === -2) return 'Excellent: random options';
        if (n === -3) return 'Excellent: fixed options';
        if (n > 0) return `Excellent: ${n}`;
        return `Excellent: ${n}`;
    }

    function levelText(item) {
        const min = Number(item?.levelMin ?? 0);
        const max = Number(item?.levelMax ?? 0);

        // keep raw, but you can later translate 0/0 -> "0..15" in UI if you want
        if (min === max) return `Level: ${min}`;
        return `Level: ${min}–${max}`;
    }

    function flagsText(item) {
        const parts = [];
        if (Number(item?.skill ?? 0) === 1) parts.push('Skill');
        if (Number(item?.luck ?? 0) === 1) parts.push('Luck');
        if (Number(item?.option ?? 0) === 1) parts.push('Add Option');
        return parts.length ? `Flags: ${parts.join(', ')}` : 'Flags: none';
    }


    function itemTooltipHtml(item) {
        const lines = [];

        // Level
        lines.push(levelText(item));

        // Excellent (only if applicable)
        if (isExcellentItem(item)) {
            lines.push(excText(item?.exc));
        }

        // Socket info
        if (isSocketItem(item)) {
            lines.push(socketText(item?.socketCount));
        }

        // Elemental flag (only if true)
        if (Number(item?.elementalItem ?? 0) === 1) {
            lines.push('Elemental: Yes');
        }

        // Flags (skill/luck/option)
        lines.push(flagsText(item));

        return lines.map(escapeHtml).join('<br>');
    }


    function hasTooltip(item) {
        return isExcellentItem(item) || isSocketItem(item);
    }

    function shouldShowCountBadge(item) {
        // Only show xN for "normal" items (yellow) where durability usually means pack/stack count.
        // Never show it for excellent/socket items (durability there is real durability, not quantity).
        if (isExcellentItem(item) || isSocketItem(item)) return false;

        const d = Number(item?.durability ?? 0);
        return Number.isFinite(d) && d >= 2;
    }

    function renderItemsChips(items) {
        const arr = Array.isArray(items) ? items : [];
        if (!arr.length) return '';

        return `
    <div class="br-items">
      ${arr.map(it => {
            const cls = chipClass(it);

            const countSuffix = shouldShowCountBadge(it)
                ? `<span class="br-chip-count">x${escapeHtml(it.durability)}</span>`
                : '';

            const tipAttr = hasTooltip(it)
                ? ` data-tip="${escapeHtml(itemTooltipHtml(it))}"`
                : '';

            return `
          <span class="${cls}"${tipAttr}>
            ${escapeHtml(it?.name ?? 'Unknown')}
            ${countSuffix}
          </span>
        `.trim();
        }).join('')}
    </div>
  `.trim();
    }


    function renderDropGroup(group) {
        const chance = Number(group?.chancePercent ?? 0);
        const count = Number(group?.count ?? 0);
        const countText = count === 1 ? '1 item' : `${count} items`;
        const info = formatPickMode(group?.pickMode);

        return `
    <div class="br-drop-group">
      <div class="br-drop-meta br-drop-meta-lg">
        <div class="br-meta-pill">
          <div class="br-meta-label"><i class="fa-solid fa-percent"></i> Drop Chance</div>
          <div class="br-meta-value">${escapeHtml(chance)}%</div>
        </div>

        <div class="br-meta-pill">
          <div class="br-meta-label"><i class="fa-solid fa-box"></i> Item Drop Count</div>
          <div class="br-meta-value">${escapeHtml(countText)}</div>
        </div>

        <div class="br-meta-pill">
          <div class="br-meta-label"><i class="fa-solid ${escapeHtml(info.icon)}"></i> Drop Type</div>
          <div class="br-meta-value">${escapeHtml(info.text)}</div>
        </div>
      </div>

      ${renderItemsChips(group?.items)}
    </div>
  `.trim();
    }

    function renderSectionAccordion(section, index) {
        const name = String(section?.name ?? `Section ${index + 1}`);
        const groups = Array.isArray(section?.dropGroups) ? section.dropGroups : [];

        return `
    <details class="br-accordion" ${index === 0 ? 'open' : ''}>
      <summary class="br-accordion-summary">
        <span class="br-accordion-title">${escapeHtml(name)}</span>
        <span class="br-accordion-hint">${escapeHtml(groups.length)} group${groups.length === 1 ? '' : 's'}</span>
      </summary>
      <div class="br-accordion-body">
        ${groups.map(renderDropGroup).join('')}
      </div>
    </details>
  `.trim();
    }

    function renderBossDetails(root, boss) {
        if (!root) return;

        const coinName = boss?.coins?.name ?? 'Unknown';
        const coinAmount = Number(boss?.coins?.amount ?? 0);
        const coinEnabled = Boolean(boss?.coins?.enabled);

        const ruudChance = Number(boss?.ruud?.chancePercent ?? 0);
        const ruudMin = Number(boss?.ruud?.min ?? 0);
        const ruudMax = Number(boss?.ruud?.max ?? 0);

        let ruudLabel;
        let ruudValue;

        if (ruudChance <= 0) {
            ruudLabel = 'Ruud';
            ruudValue = 'No Drop';
        } else {
            ruudLabel = `Ruud (${ruudChance}%)`;
            ruudValue = (ruudMin === ruudMax)
                ? `${ruudMin}`
                : `${ruudMin}–${ruudMax}`;
        }

        const stats = [
            { label: coinEnabled ? `${coinName}` : `${coinName} (disabled)`, value: coinAmount },
            { label: ruudLabel, value: ruudValue }
        ];


        const sections = Array.isArray(boss?.sections) ? boss.sections : [];

        root.innerHTML = `
    <div class="section-card">
      <div class="si-bar"><span>${escapeHtml(boss?.monsterName ?? 'Boss')}</span></div>

      <div class="br-top">
        ${statCards(stats)}
      </div>

      <div class="br-sections">
        ${sections.map(renderSectionAccordion).join('')}
      </div>
    </div>
  `.trim();

        // Tooltip handler (single delegated listener)
        const cardsRoot = root.querySelector('.section-card');
        if (!cardsRoot) return;

        const tooltip = document.createElement('div');
        tooltip.className = 'br-tooltip';
        tooltip.style.display = 'none';
        document.body.appendChild(tooltip);

        let lastTarget = null;

        const show = (target) => {
            const tip = target.getAttribute('data-tip');
            if (!tip) return;

            tooltip.innerHTML = tip;
            tooltip.style.display = 'block';
            lastTarget = target;

            const rect = target.getBoundingClientRect();
            const top = rect.top + window.scrollY - tooltip.offsetHeight - 10;
            const left = rect.left + window.scrollX;

            tooltip.style.top = `${Math.max(8, top)}px`;
            tooltip.style.left = `${Math.max(8, left)}px`;
        };

        const hide = () => {
            tooltip.style.display = 'none';
            lastTarget = null;
        };

        cardsRoot.addEventListener('mouseover', (e) => {
            const t = e.target;
            if (t && t.classList && t.classList.contains('br-chip')) show(t);
        });

        cardsRoot.addEventListener('mouseout', (e) => {
            const t = e.target;
            if (t && t === lastTarget) hide();
        });

        window.addEventListener('scroll', () => {
            if (lastTarget) show(lastTarget);
        }, { passive: true });
    }


    async function init() {
        const root = document.getElementById('extras-root');
        const nav = document.getElementById('extras-menu');
        if (!root || !nav) return;

        const pageKey = String(root.getAttribute('data-page') || '').trim();
        const cfg = PAGE_CONFIG[pageKey];

        if (!cfg) {
            root.innerHTML = '<div class="section-card">Invalid page.</div>';
            return;
        }

        root.innerHTML = '<div class="section-card">Loading...</div>';

        try {
            const bosses = await fetchServerJson(cfg.file);

            if (!Array.isArray(bosses) || bosses.length === 0) {
                root.innerHTML = '<div class="section-card">No data.</div>';
                nav.innerHTML = '';
                return;
            }

            // Optional: sort by monsterName (stable and user-friendly)
            bosses.sort((a, b) => String(a?.monsterName ?? '').localeCompare(String(b?.monsterName ?? '')));

            const bossBySlug = buildBossIndex(bosses);

            const onSelect = (slug, boss) => {
                setActiveMenuSlug(nav, slug);
                setSelectedBossPlaceholder(root, boss);
                renderBossDetails(root, boss);
            };

            renderBossMenuChunked(nav, bosses, onSelect);

            // Auto-select first boss
            const firstBoss = bosses[0];
            const firstSlug = normalizeBossSlug(firstBoss);
            setActiveMenuSlug(nav, firstSlug);
            setSelectedBossPlaceholder(root, firstBoss);
            renderBossDetails(root, firstBoss);


            // If page has a hash, select that boss if present
            const hash = String(location.hash || '');
            const match = /^#boss-(.+)$/.exec(hash);
            if (match && match[1]) {
                const desiredSlug = match[1];
                const desiredBoss = bossBySlug.get(desiredSlug);
                if (desiredBoss) {
                    setActiveMenuSlug(nav, desiredSlug);
                    setSelectedBossPlaceholder(root, desiredBoss);
                }
            }
        } catch (e) {
            root.innerHTML = '<div class="section-card">Failed to load.</div>';
            nav.innerHTML = '';
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();
