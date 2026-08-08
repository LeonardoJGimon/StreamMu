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
            .slice(0, 80) || 'section';
    }

    function escapeHtml(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function stringList(items) {
        const arr = Array.isArray(items) ? items : [];
        if (!arr.length) return '';
        return `<ul class="list">${arr.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
    }

    function commandsTable(items) {
        const arr = Array.isArray(items) ? items : [];
        if (!arr.length) return '';
        const rows = arr.map(x => `<tr><td>${escapeHtml(x?.command ?? '')}</td><td>${escapeHtml(x?.description ?? '')}</td></tr>`).join('');
        return `
            <table class="table">
                <thead><tr><th>Command</th><th>Description</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        `.trim();
    }

    // ES5-friendly helpers
    function isObj(x) {
        return x && typeof x === 'object';
    }

    function getArr(obj, key) {
        const v = obj && obj[key];
        return Array.isArray(v) ? v : [];
    }

    function keyValueRows(items) {
        const arr = Array.isArray(items) ? items : [];
        if (!arr.length) return '';

        let html = '<div class="si-row-list">';

        for (let i = 0; i < arr.length; i++) {
            const x = arr[i] || {};
            const label = escapeHtml(String(x.label ?? ''));
            const value = escapeHtml(String(x.value ?? ''));

            html +=
                '<div class="si-row">' +
                '<div class="si-row-left">' + label + '</div>' +
                '<div class="si-row-right">' + value + '</div>' +
                '</div>';
        }

        html += '</div>';

        return html;
    }

    function renderInfoSection(title, items) {
        const rows = keyValueRows(items);
        if (!rows) return '';
        return sectionBar(title) + rows;
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

    function renderInfoNotAvailable(message) {
        const text = message || 'Information not available';

        return `
        <div class="si-empty">
            <div class="si-empty-text">${escapeHtml(text)}</div>
        </div>
    `.trim();
    }

    function renderJwlExplanationRows(items) {
        const arr = Array.isArray(items) ? items : [];
        if (!arr.length) return '';

        // Hardcoded icon (as requested)
        const iconHtml = '<i class="fas fa-gem"></i>';

        return `
        <div class="si-exp-list">
            ${arr.map((x, idx) => {
            const name = escapeHtml(String(x && x.name != null ? x.name : ''));
            const desc = escapeHtml(String(x && x.description != null ? x.description : ''));
            const info = Array.isArray(x && x.info) ? x.info : [];

            const body = info.length
                ? `<div class="si-exp-body" data-exp-body="${idx}">
                        <ul class="si-exp-bullets">
                          ${info.map((line) => `<li>${escapeHtml(String(line != null ? line : ''))}</li>`).join('')}
                        </ul>
                       </div>`
                : `<div class="si-exp-body" data-exp-body="${idx}">
                        <div class="si-exp-empty">No details available.</div>
                       </div>`;

            return `
                    <div class="si-exp-item" data-exp-item="${idx}">
                        <button type="button" class="si-exp-row" data-exp-toggle="${idx}">
                            <div class="si-exp-left">
                                <div class="si-exp-title">
                                    <span class="si-exp-icon">${iconHtml}</span>
                                    <span class="si-exp-name">${name}</span>
                                </div>
                                ${desc ? `<div class="si-exp-desc">${desc}</div>` : ''}
                            </div>

                            <div class="si-exp-right" aria-hidden="true">
                                <i class="fas fa-chevron-down"></i>
                            </div>
                        </button>
                        ${body}
                    </div>
                `.trim();
        }).join('')}
        </div>
    `.trim();
    }

    /**
     * Call this once after you inject the HTML (or after section opens).
     * It wires click handlers for the explanation rows.
     */
    function bindJwlExplanations(container) {
        const root = container || document;
        const toggles = root.querySelectorAll('[data-exp-toggle]');
        if (!toggles || !toggles.length) return;

        for (let i = 0; i < toggles.length; i++) {
            const btn = toggles[i];

            // Prevent double-binding if your UI re-renders frequently
            if (btn.__boundExp) continue;
            btn.__boundExp = true;

            btn.addEventListener('click', function () {
                const idx = btn.getAttribute('data-exp-toggle');
                const item = root.querySelector('[data-exp-item="' + idx + '"]');
                const body = root.querySelector('[data-exp-body="' + idx + '"]');
                if (!item || !body) return;

                const isOpen = item.classList.contains('is-open');

                if (isOpen) {
                    item.classList.remove('is-open');
                    body.style.maxHeight = '0px';
                } else {
                    item.classList.add('is-open');
                    // animate: set maxHeight to scrollHeight
                    body.style.maxHeight = body.scrollHeight + 'px';
                }
            });
        }
    }

    function bindAzuraTrader(rootEl) {
        const root = rootEl || document;
        const toggles = root.querySelectorAll('[data-trader-toggle]');
        if (!toggles || !toggles.length) return;

        for (let i = 0; i < toggles.length; i++) {
            const btn = toggles[i];
            if (btn.__boundTrader) continue;
            btn.__boundTrader = true;

            btn.addEventListener('click', function () {
                const key = btn.getAttribute('data-trader-toggle');
                const card = root.querySelector('[data-trader-recipe="' + key + '"]');
                const body = root.querySelector('[data-trader-body="' + key + '"]');
                if (!card || !body) return;

                const isOpen = card.classList.contains('is-open');

                if (isOpen) {
                    card.classList.remove('is-open');
                    body.style.maxHeight = '0px';
                } else {
                    card.classList.add('is-open');
                    body.style.maxHeight = '0px';
                    body.style.maxHeight = body.scrollHeight + 'px';
                }
            });
        }
    }


    function sectionBar(title) {
        return `<div class="si-bar"><span>${escapeHtml(title)}</span></div>`;
    }

    function errtelRatesTable(title, groupObj) {
        const group = groupObj && typeof groupObj === 'object' ? groupObj : null;
        if (!group) return '';

        const ranks = Object.keys(group)
            .map(k => group[k])
            .filter(x => x && typeof x === 'object' && Array.isArray(x.rates) && x.rates.length);
        if (!ranks.length) return '';

        const isFullRate = (v) => String(v ?? '').trim().replace(/\s+/g, '').toLowerCase() === '100%';

        const levels = Array.from({ length: 10 }, (_, i) => i + 1);
        const head = `<tr><th>RANK / LVL</th>${levels.map(l => `<th>LVL ${l}</th>`).join('')}</tr>`;

        const body = ranks.map(r => {
            const map = new Map((r.rates || []).map(x => [Number(x.level), String(x.rate ?? '')]));
            const cells = levels.map((l, idx) => {
                const v = map.get(l) || '';
                const cls = [
                    idx === 0 ? 'si-rate-first' : '',
                    isFullRate(v) ? 'si-rate-100' : ''
                ].filter(Boolean).join(' ');
                return `<td class="${escapeHtml(cls)}">${escapeHtml(v)}</td>`;
            }).join('');
            return `<tr><td class="si-rank">${escapeHtml(r.name || '')}</td>${cells}</tr>`;
        }).join('');

        return `
            ${sectionBar(title)}
            <div class="si-table-wrap">
                <table class="si-table">
                    <thead>${head}</thead>
                    <tbody>${body}</tbody>
                </table>
            </div>
        `.trim();
    }

    function renderChaosGoblin(cg) {
        const o = cg && typeof cg === 'object' ? cg : {};
        const cards = statCards([
            { label: 'Luck Item Bonus', value: o.lkItemBonus ?? '-' },
            { label: 'Mastery Upgrade Event', value: o.masteryUpgradeEvent ?? '-' },
            { label: 'TOL with TOCA', value: o.tolWithTOCA ?? '-' },
            { label: 'Max TOL', value: o.maxTOL ?? '-' }
        ]);

        const mixRates = keyValueRows(o.rates);
        const wingsRates = keyValueRows(o.wingsRates);
        const otherRates = keyValueRows(o.otherRates);

        const err = o.errtelRates || {};
        const errNormal = errtelRatesTable('Normal Errtels Success Rates', err.normal);
        const errMastery = errtelRatesTable('Mastery Errtels Success Rates', err.mastery);

        return [
            cards,
            mixRates ? `${sectionBar('Item Mix Rates')}${mixRates}` : '',
            wingsRates ? `${sectionBar('Wings Mix Rates')}${wingsRates}` : '',
            otherRates ? `${sectionBar('Other Rates')}${otherRates}` : '',
            errNormal,
            errMastery
        ].filter(Boolean).join('');
    }

    function renderGeneralInfo(svInfo) {
        if (!isObj(svInfo)) {
            return renderInfoNotAvailable('General server info not available');
        }

        const xpRates = getArr(svInfo, 'xpRates');
        const cards = xpRates.length ? statCards(xpRates) : '';

        const baseInfo = renderInfoSection('Base Info', getArr(svInfo, 'baseInfo'));
        const rrInfo = renderInfoSection('RR Info', getArr(svInfo, 'rrInfo'));
        const grInfo = renderInfoSection('GR Reward Info', getArr(svInfo, 'grInfo'));
        const pctDetails = renderInfoSection('Points Details', getArr(svInfo, 'pctDetails'));
        const srvMaxRates = renderInfoSection('Server Max Rates', getArr(svInfo, 'srvMaxRates'));

        const content = [
            cards,
            baseInfo,
            rrInfo,
            grInfo,
            pctDetails,
            srvMaxRates
        ].filter(Boolean).join('');

        // If object exists but contains no usable data
        if (!content) {
            return renderInfoNotAvailable('General server info not available');
        }

        return content;
    }


    function renderJewelSettingsInfo(jwlInfo) {
        const infoNotAvailable = renderInfoNotAvailable('General Jewels info not available');

        if (!isObj(jwlInfo)) {
            return infoNotAvailable;
        }

        const jwlRates = renderInfoSection('General Jewels Success Rates', getArr(jwlInfo, 'jwlRates'));

        const exps = getArr(jwlInfo, 'jwlExplanations');
        const jwlExplanations = exps.length
            ? (sectionBar('New Jewels Explanations') + renderJwlExplanationRows(exps))
            : '';

        const content = [jwlRates, jwlExplanations].filter(Boolean).join('');
        return content || infoNotAvailable;
    }





    function renderSocketInfo(si) {
        const s = si && typeof si === 'object' ? si : {};
        const elementOptions = Array.isArray(s.elementOptions) ? s.elementOptions : [];
        const packageOptions = Array.isArray(s.socketPackageOptions) ? s.socketPackageOptions : [];

        const elementRows = elementOptions.flatMap(opt => {
            const elements = Array.isArray(opt?.elements) ? opt.elements : [];
            const elHtml = elements.map(e => {
                const m = String(e || '');
                const type = m.toLowerCase().includes('fire') ? 'fire'
                    : m.toLowerCase().includes('water') ? 'water'
                        : m.toLowerCase().includes('ice') ? 'ice'
                            : m.toLowerCase().includes('wind') ? 'wind'
                                : m.toLowerCase().includes('lightning') ? 'lightning'
                                    : m.toLowerCase().includes('earth') ? 'earth'
                                        : 'muted';
                return `<span class="si-tag si-tag--${type}">${escapeHtml(m)}</span>`;
            }).join(' ');
            const bonuses = Array.isArray(opt?.bonuses) ? opt.bonuses : [];
            if (!bonuses.length) {
                return [`<tr><td>${escapeHtml(opt?.items ?? '')}</td><td>${elHtml}</td><td>-</td><td>-</td></tr>`];
            }
            return bonuses.map((b, idx) => {
                const itemsCell = idx === 0 ? `<td rowspan="${bonuses.length}">${escapeHtml(opt?.items ?? '')}</td>` : '';
                const elCell = idx === 0 ? `<td rowspan="${bonuses.length}">${elHtml}</td>` : '';
                return `<tr>${itemsCell}${elCell}<td>${escapeHtml(b?.bonus ?? '')}</td><td>${escapeHtml(b?.rate ?? '')}</td></tr>`;
            });
        }).join('');

        const elementTable = elementOptions.length ? `
            ${sectionBar('Element Options')}
            <div class="si-table-wrap">
                <table class="si-table si-table--wide">
                    <thead>
                        <tr><th>Items</th><th>Elements</th><th>Bonus</th><th>Rate</th></tr>
                    </thead>
                    <tbody>
                        ${elementRows}
                    </tbody>
                </table>
            </div>
        `.trim() : '';

        const pkgRows = packageOptions.map(p => {
            const combo = Array.isArray(p?.combination) ? p.combination : [];
            const comboHtml = combo.map(x => {
                const m = String(x || '');
                const type = m.toLowerCase().includes('fire') ? 'fire'
                    : m.toLowerCase().includes('water') ? 'water'
                        : m.toLowerCase().includes('ice') ? 'ice'
                            : m.toLowerCase().includes('wind') ? 'wind'
                                : m.toLowerCase().includes('lightning') ? 'lightning'
                                    : m.toLowerCase().includes('earth') ? 'earth'
                                        : 'muted';
                return `<span class="si-tag si-tag--${type}">${escapeHtml(m)}</span>`;
            }).join(' ');
            return `<tr><td>${escapeHtml(p?.items ?? '')}</td><td><div class="si-combo-wrap">${comboHtml}</div></td><td>${escapeHtml(p?.option ?? '')}</td><td>${escapeHtml(p?.rate ?? '')}</td></tr>`;
        }).join('');

        const pkgTable = packageOptions.length ? `
            ${sectionBar('Package Options')}
            <div class="si-table-wrap">
                <table class="si-table si-table--wide">
                    <thead>
                        <tr><th>Items</th><th>Combo</th><th>Bonus</th><th>Rate</th></tr>
                    </thead>
                    <tbody>
                        ${pkgRows}
                    </tbody>
                </table>
            </div>
        `.trim() : '';

        return [elementTable, pkgTable].filter(Boolean).join('');
    }

    function donationTrackTable(track) {
        const t = track && typeof track === 'object' ? track : null;
        const stages = Array.isArray(t?.stages) ? t.stages : [];
        if (!t || !stages.length) return '';

        const title = String(t?.label || 'Track');
        const target = (t?.target != null) ? `${escapeHtml(t.target)} ${escapeHtml(t.currency || '')}`.trim() : '';
        const rows = stages.map(s => ({ label: `${s?.amount ?? ''} ${t.currency || ''}`.trim(), value: String(s?.reward ?? '') }));

        return `
            ${sectionBar(title)}
            ${target ? `<div class="si-row-list"><div class="si-row"><div class="si-row-left">Target</div><div class="si-row-right">${target}</div></div></div>` : ''}
            ${keyValueRows(rows)}
        `.trim();
    }

    function renderDonationJourney(dj) {
        const d = dj && typeof dj === 'object' ? dj : {};
        
        const policyRows = [
            d?.carryAcross ? { label: 'Legacy Rewards', value: String(d.carryAcross) } : null,
            d?.currentDbRewards ? { label: 'Current DB Rewards', value: String(d.currentDbRewards) } : null
        ].filter(Boolean);

        const policy = policyRows.length ? `${sectionBar('Support Policy')}${keyValueRows(policyRows)}` : '';
        const current = donationTrackTable(d.currentTrack);
        const legacy = donationTrackTable(d.legacyTrack);

        return [
            policy,
            current,
            legacy
        ].filter(Boolean).join('');
    }

    function renderMasterLevelGuide(items) {
        const arr = Array.isArray(items) ? items : [];
        if (!arr.length) return '';

        const rows = arr
            .map(x => `<tr><td>${escapeHtml(x?.playerType ?? '')}</td><td>${escapeHtml(x?.xpType ?? '')}</td><td>${escapeHtml(x?.minMapToLevel ?? '')}</td></tr>`)
            .join('');

        return `
            <table class="table">
                <thead><tr><th>Player Type</th><th>XP Type</th><th>Minimum Map</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        `.trim();
    }

    function renderHuntPointSystem(hp) {
        const o = hp && typeof hp === 'object' ? hp : {};
        const general = o && o.general && typeof o.general === 'object' ? o.general : {};
        const dailyLimits = Array.isArray(general && general.dailyMonsterLimitsVIP) ? general.dailyMonsterLimitsVIP : [];
        const maps = Array.isArray(o && o.huntMaps) ? o.huntMaps : [];
        const buffs = Array.isArray(o && o.buffSettings) ? o.buffSettings : [];

        const generalKv = (function () {
            const rows = [
                { label: 'Active on Non PvP Servers?', value: general.activeOnNonPvpServers != null ? general.activeOnNonPvpServers : '-' },
                { label: 'Get Point X Monsters', value: general.activeEveryXMonsters != null ? general.activeEveryXMonsters : '-' },
                { label: 'Buffs Increase Percentage', value: general.buffsIncreasePercentage != null ? general.buffsIncreasePercentage : '-' },
                { label: 'Monster Limit', value: general.weeklyMonsterLimit != null ? general.weeklyMonsterLimit : '-' }
            ];

            const html = keyValueRows(rows);
            return html ? (sectionBar('General') + html) : '';
        })();

        const daily = dailyLimits.length ? (`
        ${sectionBar('Daily Monster Limits (VIP)')}
        <table class="table">
            <thead><tr><th>VIP Type</th><th>Monsters Limit</th></tr></thead>
            <tbody>${dailyLimits.map(function (x) {
            const vipType = escapeHtml(String(x && x.vipType != null ? x.vipType : ''));
            const limit = escapeHtml(String(x && x.monstersLimit != null ? x.monstersLimit : ''));
            return '<tr><td>' + vipType + '</td><td>' + limit + '</td></tr>';
        }).join('')}</tbody>
        </table>
    `.trim()) : '';

        // Maps: 2 columns, no ID, just text
        const mapsGrid = maps.length ? (`
        ${sectionBar('Hunt Maps')}
        <div class="hp-maps-grid">
            ${maps.map(function (m) {
            const name = escapeHtml(String(m && m.name != null ? m.name : ''));
            return '<div class="hp-map-item"><i class="fas fa-location-dot"></i><span>' + name + '</span></div>';
        }).join('')}
        </div>
    `.trim()) : '';

        // Buff Settings: compact table with Name / Max / Requirements (Reset / ML / GR)
        const buffsTable = buffs.length ? (`
        ${sectionBar('Buff Settings')}
        <table class="table hp-buffs-table">
            <thead><tr><th>Buff</th><th>Max</th><th>Requirements</th></tr></thead>
            <tbody>${buffs.map(function (b) {
            const req = b && b.requirements && typeof b.requirements === 'object' ? b.requirements : {};

            const reqParts = [];
            if (req.minMasterLevel != null) {
                reqParts.push('<span class="req-ml">ML: ' + escapeHtml(String(req.minMasterLevel)) + '</span>');
            }
            if (req.minReset != null) {
                reqParts.push('<span class="req-rr">RR: ' + escapeHtml(String(req.minReset)) + '</span>');
            }
            if (req.minGr != null) {
                reqParts.push('<span class="req-gr">GR: ' + escapeHtml(String(req.minGr)) + '</span>');
            }


            const reqTxt = reqParts.length ? reqParts.join(' <span class="req-sep">/</span> ') : '-';
            const maxTxt = escapeHtml(String(b && b.maxValue != null ? b.maxValue : '')) + (b && b.isPercent ? '%' : '');

            return '<tr>'
                + '<td class="hp-buff-name">' + escapeHtml(String(b && b.name != null ? b.name : '')) + '</td>'
                + '<td class="hp-buff-max">' + maxTxt + '</td>'
                + '<td class="hp-buff-req">' + reqTxt + '</td>'
                + '</tr>';
        }).join('')}</tbody>
        </table>
    `.trim()) : '';

        return [generalKv, daily, mapsGrid, buffsTable].filter(Boolean).join('');
    }


    function renderMossGambler(ms) {
        const o = ms && typeof ms === 'object' ? ms : {};
        const how = Array.isArray(o?.howToGetCurrency) ? o.howToGetCurrency : [];
        const tiers = Array.isArray(o?.tiers) ? o.tiers : [];
        if (!how.length && !tiers.length) return '';

        const howHtml = how.length ? `${sectionBar('How To Get Currencies')}${stringList(how)}` : '';

        const tiersHtml = tiers.map(t => {
            const name = String(t?.name || 'Tier');
            const c1 = String(t?.currency1 || '').trim();
            const c2 = String(t?.currency2 || '').trim();
            const cost1 = String(t?.cost1 || '').trim();
            const cost2 = String(t?.cost2 || '').trim();
            const rewards = Array.isArray(t?.potentialBigReward) ? t.potentialBigReward : [];

            const costTxt = [
                (cost1 && c1) ? `${cost1} ${c1}` : '',
                (cost2 && c2 && cost2 !== '0') ? `${cost2} ${c2}` : ''
            ].filter(Boolean).join(' + ');

            return `
                ${sectionBar(name)}
                ${costTxt ? `<div class="si-row-list"><div class="si-row"><div class="si-row-left">Cost</div><div class="si-row-right">${escapeHtml(costTxt)}</div></div></div>` : ''}
                ${rewards.length ? `${sectionBar('Potential Big Rewards')}${stringList(rewards)}` : ''}
            `.trim();
        }).join('');

        return [howHtml, tiersHtml].filter(Boolean).join('');
    }

    function renderVipSystem(vip) {
        const tiers = Array.isArray(vip?.tiers) ? vip.tiers : [];
        if (!tiers.length) return '';
        return tiers.map(t => {
            const name = String(t?.name ?? '');
            const cost = String(t?.cost ?? '');
            const duration = String(t?.duration ?? '');
            const benefits = Array.isArray(t?.benefits) ? t.benefits : [];
            return `
                <div class="vip-tier">
                    <div class="vip-tier-title">${escapeHtml(name)}</div>
                    <div class="vip-tier-grid">
                        <div class="vip-tier-card"><div class="vip-tier-label">Cost</div><div class="vip-tier-value">${escapeHtml(cost || '-')}</div></div>
                        <div class="vip-tier-card"><div class="vip-tier-label">Duration</div><div class="vip-tier-value">${escapeHtml(duration || '-')}</div></div>
                    </div>
                    ${benefits.length ? `
                        <div class="vip-benefits-title">Benefits:</div>
                        <div class="si-row-list">
                            ${benefits.map(b => `<div class="si-row"><div class="si-row-left">${escapeHtml(b)}</div><div class="si-row-right"></div></div>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `.trim();
        }).join('');
    }

    function renderAzuraTrader(trader) {
        const infoNotAvailable = renderInfoNotAvailable('Azura Trader info not available');
        if (!isObj(trader)) return infoNotAvailable;

        const rows = [
            { label: 'NPC Name', value: trader.name != null ? trader.name : '-' },
            { label: 'Location', value: trader.location != null ? trader.location : '-' },
            { label: 'Coordinates', value: trader.coordinates != null ? trader.coordinates : '-' },
            { label: 'How To Use', value: trader.howToUse != null ? trader.howToUse : '-' }
        ];

        const headerKv = keyValueRows(rows);

        const def = trader.definition ? (
            sectionBar('Overview') +
            '<div class="si-note">' + escapeHtml(String(trader.definition)) + '</div>'
        ) : '';

        const categories = Array.isArray(trader.categories) ? trader.categories : [];

        function isNum(x) {
            return x != null && x !== '' && !isNaN(Number(x));
        }

        function n(x, fallback) {
            return isNum(x) ? Number(x) : (fallback != null ? fallback : 0);
        }

        function computeTotal(count, stackAmount) {
            return n(count, 1) * n(stackAmount, 1);
        }

        function renderBadges(badges) {
            return badges && badges.length ? ('<span class="trader-badges">' + badges.join('') + '</span>') : '';
        }

        // REQUIRED row format:
        // "Star of Sacred Birth x1"  [Stack: 100] [Total: 100]
        function renderRequiredRow(it) {
            const name = escapeHtml(String(it && it.name != null ? it.name : ''));
            const cons = it && it.constraints && typeof it.constraints === 'object' ? it.constraints : {};
            const req = it && it.requirement && typeof it.requirement === 'object' ? it.requirement : null;

            var itemCount = 1;
            var badges = [];

            // New exact stack requirement (preferred)
            if (req && isNum(req.stacks) && isNum(req.stackAmount)) {
                itemCount = Number(req.stacks);
                var stackAmount = Number(req.stackAmount);
                var total = itemCount * stackAmount;

                badges.push('<span class="trader-badge trader-badge-stack">Stack: ' + escapeHtml(String(stackAmount)) + '</span>');
                badges.push('<span class="trader-badge trader-badge-total">Total: ' + escapeHtml(String(total)) + '</span>');
            } else if (it && isNum(it.count)) {
                // Old format fallback
                itemCount = Number(it.count);
            }

            // Constraints badges (keep if you want them; they were in your original)
            if (cons.minLevel != null) {
                badges.push('<span class="trader-badge trader-badge-lvl">+' + escapeHtml(String(cons.minLevel)) + '</span>');
            }
            if (cons.minExcellentOptions != null) {
                badges.push('<span class="trader-badge trader-badge-exc">Exc≥' + escapeHtml(String(cons.minExcellentOptions)) + '</span>');
            }

            return (
                '<div class="trader-row trader-row-split">' +
                '<div class="trader-row-left">' +
                '<span class="trader-item">' + name + '</span>' +
                '<span class="trader-inline-count">x' + escapeHtml(String(itemCount)) + '</span>' +
                '</div>' +
                '<div class="trader-row-right">' +
                renderBadges(badges) +
                '</div>' +
                '</div>'
            );
        }

        // REWARD row format:
        // "Jewel of Harmony"                      [x10 green on right]
        // No stack/total on reward.
        function renderRewardRow(output) {
            if (!output || typeof output !== 'object') return '';

            const name = escapeHtml(String(output.name != null ? output.name : ''));
            const total = computeTotal(output.count, output.stackAmount); // show as xTotal

            return (
                '<div class="trader-out-row trader-row-split">' +
                '<div class="trader-row-left">' +
                '<span class="trader-item trader-item-out">' + name + '</span>' +
                '</div>' +
                '<div class="trader-row-right">' +
                '<span class="trader-reward-qty">x' + escapeHtml(String(total)) + '</span>' +
                '</div>' +
                '</div>'
            );
        }

        // Header preview: "→ Jewel of Harmony x10"
        function getOutputPreview(output) {
            if (!output || typeof output !== 'object') return '';
            if (output.name == null) return '';
            var total = computeTotal(output.count, output.stackAmount);
            return '→ ' + escapeHtml(String(output.name)) + ' x' + escapeHtml(String(total));
        }

        const catsHtml = categories.length ? (
            sectionBar('Exchange Recipes') +
            '<div class="trader-cats">' +
            categories.map(function (cat, cIdx) {
                const title = escapeHtml(String(cat && cat.title != null ? cat.title : ('Category ' + (cIdx + 1))));
                const recipes = Array.isArray(cat && cat.recipes) ? cat.recipes : [];

                const recipesHtml = recipes.length ? recipes.map(function (r, rIdx) {
                    const inputs = Array.isArray(r && r.inputs) ? r.inputs : [];
                    const output = r && r.output && typeof r.output === 'object' ? r.output : null;

                    if (!inputs.length && !output) return '';

                    const headerText = 'Recipe ' + (rIdx + 1);
                    const preview = getOutputPreview(output);

                    const inputsHtml = inputs.length ? (
                        '<div class="trader-req">' +
                        '<div class="trader-req-title"><i class="fas fa-list-check"></i> Required</div>' +
                        '<div class="trader-req-list">' +
                        inputs.map(function (it) { return renderRequiredRow(it); }).join('') +
                        '</div>' +
                        '</div>'
                    ) : '';

                    const outputHtml = output ? (
                        '<div class="trader-out">' +
                        '<div class="trader-out-title"><i class="fas fa-gift"></i> Reward</div>' +
                        renderRewardRow(output) +
                        '</div>'
                    ) : '';

                    // Notes: one line + orange + spacing from border
                    const notesHtml = r && r.notes ? (
                        '<div class="trader-notes">' +
                        '<span class="trader-notes-title"><i class="fas fa-circle-info"></i> Notes:</span>' +
                        '<span class="trader-notes-text">' + escapeHtml(String(r.notes)) + '</span>' +
                        '</div>'
                    ) : '';

                    return (
                        '<div class="trader-recipe" data-trader-recipe="' + cIdx + '_' + rIdx + '">' +
                        '<button type="button" class="trader-recipe-head" data-trader-toggle="' + cIdx + '_' + rIdx + '">' +
                        '<div class="trader-recipe-head-left">' +
                        '<i class="fas fa-arrow-right-arrow-left"></i>' +
                        '<span class="trader-recipe-name">' + escapeHtml(headerText) + '</span>' +
                        (preview ? '<span class="trader-recipe-preview">' + preview + '</span>' : '') +
                        '</div>' +
                        '<div class="trader-recipe-head-right" aria-hidden="true">' +
                        '<i class="fas fa-chevron-down"></i>' +
                        '</div>' +
                        '</button>' +
                        '<div class="trader-recipe-body" data-trader-body="' + cIdx + '_' + rIdx + '">' +
                        inputsHtml +
                        outputHtml +
                        notesHtml +
                        '</div>' +
                        '</div>'
                    );
                }).filter(Boolean).join('') : renderInfoNotAvailable('No recipes available in this category');

                return (
                    '<div class="trader-cat">' +
                    '<div class="trader-cat-title">' +
                    '<i class="fas fa-layer-group"></i>' +
                    '<span>' + title + '</span>' +
                    '</div>' +
                    '<div class="trader-cat-body">' +
                    recipesHtml +
                    '</div>' +
                    '</div>'
                );
            }).join('') +
            '</div>'
        ) : '';

        const content = [
            headerKv ? (sectionBar('NPC Info') + headerKv) : '',
            def,
            catsHtml
        ].filter(Boolean).join('');

        return content || infoNotAvailable;
    }




    function renderExclusiveFeatures(items) {
        const arr = Array.isArray(items) ? items : [];
        if (!arr.length) return '';

        const li = arr.map(function (x) {
            const isObj = x && typeof x === 'object';
            const text = isObj ? (x.text != null ? String(x.text) : '') : String(x != null ? x : '');
            const hot = isObj ? !!x.hot : false;

            return `
            <li class="exf-li">
                <span class="exf-text">${escapeHtml(text)}</span>
                ${hot ? '<span class="exf-hot">HOT</span>' : ''}
            </li>
        `.trim();
        }).join('');

        return `<ul class="list exf-list">${li}</ul>`;
    }


    function section(title, icon, bodyHtml) {
        if (!bodyHtml) return '';
        const slug = slugify(title);
        return `
            <section id="sec-${escapeHtml(slug)}" class="section-card" data-slug="${escapeHtml(slug)}" data-label="${escapeHtml(title)}" data-collapsed="1">
                <button class="si-acc-head" type="button" aria-expanded="false">
                    <h2 class="section-title"><i class="fas fa-${escapeHtml(icon)}"></i> ${escapeHtml(title)}</h2>
                    <span class="si-acc-chevron" aria-hidden="true"><i class="fas fa-chevron-down"></i></span>
                </button>
                <div class="si-acc-body" hidden>
                    ${bodyHtml}
                </div>
            </section>
        `.trim();
    }

    function toggleSection(sectionEl, expand) {
        if (!sectionEl) return;
        const body = sectionEl.querySelector('.si-acc-body');
        const head = sectionEl.querySelector('.si-acc-head');
        if (!body || !head) return;

        const isCollapsed = sectionEl.getAttribute('data-collapsed') === '1';
        const shouldExpand = (typeof expand === 'boolean') ? expand : isCollapsed;

        sectionEl.setAttribute('data-collapsed', shouldExpand ? '0' : '1');
        body.hidden = !shouldExpand;
        head.setAttribute('aria-expanded', shouldExpand ? 'true' : 'false');
    }

    function setOnlyVisibleSection(root, targetSlug) {
        const slug = String(targetSlug || '').trim();
        if (!root || !slug) return;
        root.querySelectorAll('.section-card[data-slug]').forEach(s => {
            const sSlug = s.getAttribute('data-slug');
            s.style.display = (sSlug === slug) ? '' : 'none';
        });
    }

    function scrollToSection(slug) {
        const id = `sec-${String(slug || '').trim()}`;
        const el = document.getElementById(id);
        if (!el) return;
        const root = el.closest('#server-details-root');
        if (root) setOnlyVisibleSection(root, el.getAttribute('data-slug'));

        toggleSection(el, true);

        const headerEl = document.querySelector('header');
        const headerH = headerEl ? Math.ceil(headerEl.getBoundingClientRect().height) : 0;
        const extraOffset = 12;
        const y = window.pageYOffset + el.getBoundingClientRect().top;
        const top = Math.max(0, y - headerH - extraOffset);

        window.scrollTo({ top, behavior: 'smooth' });
    }

    function setActiveMenuSlug(slug) {
        const nav = document.getElementById('details-menu');
        if (nav) {
            nav.querySelectorAll('a[data-slug]').forEach(a => {
                a.classList.toggle('active', a.getAttribute('data-slug') === slug);
            });
        }
    }

    function buildMenuFromSections(root) {
        const nav = document.getElementById('details-menu');
        if (!nav) return;

        const sections = Array.from(root.querySelectorAll('.section-card[data-slug]'))
            .map(s => ({
                slug: s.getAttribute('data-slug') || '',
                label: s.getAttribute('data-label') || s.querySelector('.section-title')?.textContent || ''
            }))
            .filter(x => x.slug && x.label);

        if (nav) {
            nav.innerHTML = sections.map(x => `<a href="#sec-${escapeHtml(x.slug)}" data-slug="${escapeHtml(x.slug)}">${escapeHtml(x.label)}</a>`).join('');
            nav.querySelectorAll('a[data-slug]').forEach(a => {
                if (a.dataset.bound === '1') return;
                a.dataset.bound = '1';
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    scrollToSection(a.getAttribute('data-slug'));
                });
            });
        }

        if (sections.length) {
            setActiveMenuSlug(sections[0].slug);
            setOnlyVisibleSection(root, sections[0].slug);
            const first = root.querySelector(`.section-card[data-slug="${CSS.escape(sections[0].slug)}"]`);
            if (first) toggleSection(first, true);
        }
    }

    function bindScrollSpy(root) {
        const sections = Array.from(root.querySelectorAll('.section-card[data-slug]'));
        if (!sections.length) return;

        const obs = new IntersectionObserver((entries) => {
            const visible = entries
                .filter(e => e.isIntersecting)
                .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0));
            const top = visible[0];
            if (!top) return;
            const slug = top.target.getAttribute('data-slug');
            if (slug) setActiveMenuSlug(slug);
        }, { root: null, threshold: [0.12, 0.2, 0.3, 0.45, 0.6] });

        sections.forEach(s => obs.observe(s));
    }

    function bindAccordion(root) {
        root.querySelectorAll('.section-card .si-acc-head').forEach(btn => {
            if (btn.dataset.bound === '1') return;
            btn.dataset.bound = '1';
            btn.addEventListener('click', () => {
                const sectionEl = btn.closest('.section-card');
                if (!sectionEl) return;
                const isCollapsed = sectionEl.getAttribute('data-collapsed') === '1';
                const slug = sectionEl.getAttribute('data-slug');
                if (slug) {
                    setOnlyVisibleSection(root, slug);
                    toggleSection(sectionEl, true);
                    setActiveMenuSlug(slug);
                } else {
                    toggleSection(sectionEl, isCollapsed);
                }
            });
        });
    }

    async function init() {
        const root = document.getElementById('server-details-root');
        if (!root) return;

        try {
            const data = await fetchServerJson('server.json');
            const parts = [
                section('General Information', 'circle-info', renderGeneralInfo(data?.generalInformation)),
                section('Exclusive Features', 'star', renderExclusiveFeatures(data?.exclusiveFeatures)),
                section('Server Settings', 'sliders', stringList(data?.serverSettings)),
                section('Socket Info', 'plug', renderSocketInfo(data?.socketInfo)),
                section('VIP System', 'crown', renderVipSystem(data?.vipSystemBenefits)),
                section('Moss Gambler', 'dice', renderMossGambler(data?.mossSettings)),
                section('Donation Journey', 'hand-holding-heart', renderDonationJourney(data?.donationJourney)),
                section('Master Level', 'graduation-cap', renderMasterLevelGuide(data?.masterLevelGuide)),
                section('Commands', 'terminal', commandsTable(data?.commands)),
                section('How To Get Ruud', 'coins', stringList(data?.howToGetRuud)),
                section('How To Get WCoins', 'sack-dollar', stringList(data?.howToGetWCoins)),
                section('How To Get GP', 'hand-holding-dollar', stringList(data?.howToGetGP))
            ].filter(Boolean);

            root.innerHTML = parts.join('');
            buildMenuFromSections(root);
            bindAccordion(root);
            bindScrollSpy(root);
            bindJwlExplanations(root);
            bindAzuraTrader(root);
        } catch (e) {
            root.innerHTML = '<section class="section-card">Failed to load server details.</section>';
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();
