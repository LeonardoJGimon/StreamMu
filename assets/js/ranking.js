document.addEventListener('DOMContentLoaded', () => {
  const tbody = document.getElementById('ranking-body');
  if (!tbody) return;

  const table = tbody.closest('table');
  const headerRow = table?.querySelector('thead tr');
  const tabs = document.querySelectorAll('.ranking-tabs .tab-btn');
  const rankingSection = document.getElementById('ranking');
  const rankingTabsEl = rankingSection?.querySelector('.ranking-tabs');
  const rankingTableWrapperEl = rankingSection?.querySelector('.ranking-table-wrapper');

  const characterRows = [];
  const guildRows = [];

  let apiPlayers = null;
  let apiGuilds = null;
  let apiGens = null;
  let apiPvp = null;
  let apiHunt = null;
  let apiLoaded = false;

  const ITEMS_PER_PAGE = 20;
  const currentPageByTab = {
    character: 1,
    guilds: 1,
    gens: 1,
    pvp: 1,
    hunt: 1
  };

  const getPaginationHost = () => {
    const existing = document.getElementById('ranking-pagination');
    if (existing) return existing;
    const wrap = table?.closest('.ranking-table-wrapper');
    if (!wrap) return null;
    const host = document.createElement('div');
    host.id = 'ranking-pagination';
    host.className = 'ranking-pagination ranking-pagination--inside';
    wrap.appendChild(host);
    return host;
  };

  const renderPagination = (tab, totalItems, onPageChange) => {
    const host = getPaginationHost();
    if (!host) return;

    const totalPages = Math.max(1, Math.ceil((Number(totalItems) || 0) / ITEMS_PER_PAGE));
    let page = Number(currentPageByTab[tab] || 1);
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    currentPageByTab[tab] = page;

    if (totalPages <= 1) {
      host.innerHTML = '';
      return;
    }

    const makeBtn = (label, targetPage, disabled = false, active = false, extraClass = '') => {
      const b = document.createElement('button');
      b.className = `rank-page-btn${active ? ' active' : ''}${extraClass ? ` ${extraClass}` : ''}`;
      b.type = 'button';
      if (extraClass.includes('rank-page-btn--prev')) {
        b.setAttribute('aria-label', String(label));
        b.innerHTML = '<i class="fas fa-chevron-left" aria-hidden="true"></i>';
      } else if (extraClass.includes('rank-page-btn--next')) {
        b.setAttribute('aria-label', String(label));
        b.innerHTML = '<i class="fas fa-chevron-right" aria-hidden="true"></i>';
      } else {
        b.textContent = String(label);
      }
      b.disabled = !!disabled;
      b.addEventListener('click', () => {
        if (b.disabled) return;
        currentPageByTab[tab] = targetPage;
        onPageChange();
      });
      return b;
    };

    const prevLabel = (typeof window.t === 'function') ? window.t('pagination.prev', 'Prev') : 'Prev';
    const nextLabel = (typeof window.t === 'function') ? window.t('pagination.next', 'Next') : 'Next';

    host.innerHTML = '';
    host.appendChild(makeBtn(prevLabel, Math.max(1, page - 1), page === 1, false, 'rank-page-btn--prev'));

    const maxButtons = 7;
    const half = Math.floor(maxButtons / 2);
    let start = Math.max(1, page - half);
    let end = Math.min(totalPages, start + maxButtons - 1);
    start = Math.max(1, end - maxButtons + 1);

    if (start > 1) {
      host.appendChild(makeBtn(1, 1, false, page === 1));
      if (start > 2) {
        const dots = document.createElement('span');
        dots.className = 'rank-page-dots';
        dots.textContent = '...';
        host.appendChild(dots);
      }
    }

    for (let i = start; i <= end; i++) {
      host.appendChild(makeBtn(i, i, false, i === page));
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        const dots = document.createElement('span');
        dots.className = 'rank-page-dots';
        dots.textContent = '...';
        host.appendChild(dots);
      }
      host.appendChild(makeBtn(totalPages, totalPages, false, page === totalPages));
    }

    host.appendChild(makeBtn(nextLabel, Math.min(totalPages, page + 1), page === totalPages, false, 'rank-page-btn--next'));
  };

  const getPagedSlice = (tab, fullData) => {
    const page = Number(currentPageByTab[tab] || 1);
    const start = (Math.max(1, page) - 1) * ITEMS_PER_PAGE;
    return (fullData || []).slice(start, start + ITEMS_PER_PAGE);
  };

  const safeText = (v) => String(v ?? '');

  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const guildMarkHexToDataUrl = (hex, size = 34) => {
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
        const [r, g, b, a] = palette[idx] || palette[0];
        const off = i * 4;
        img.data[off] = r;
        img.data[off + 1] = g;
        img.data[off + 2] = b;
        img.data[off + 3] = a;
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
  };

  const getServersConfig = async () => {
    if (typeof window.getServersConfigCached === 'function') {
      try {
        const s = await window.getServersConfigCached();
        if (s && typeof s === 'object') return s;
      } catch (e) {
      }
    }
    return await fetchJson('/auth/servers');
  };

  const getSelectedServerKey = () => {
    return (localStorage.getItem('selectedServer') || '').toString().trim();
  };

  const computeRankingsLock = async () => {
    const servers = await getServersConfig();
    if (!servers || typeof servers !== 'object') return { locked: false };
    const keys = Object.keys(servers);
    if (!keys.length) return { locked: false };

    const stored = getSelectedServerKey();
    const selected = (stored && servers[stored]) ? stored : keys[0];
    const cfg = servers[selected] || {};

    const openingDate = (cfg.grandOpeningDate || cfg.openingDate || '').toString();
    if (!openingDate) return { locked: false };
    const ts = new Date(openingDate).getTime();
    if (!Number.isFinite(ts)) return { locked: false };

    const locked = ts > Date.now();
    return { locked, openingTs: ts, openingDate };
  };

  const showRankingsLocked = (openingTs) => {
    if (!rankingSection) return;

    rankingSection.classList.add('ranking-locked');
    const existing = document.getElementById('ranking-locked-overlay');
    if (!existing) {
      const lockedText = (typeof window.t === 'function')
        ? window.t('ranking.locked', 'RANKINGS WILL BECOME AVAILABLE WITH THE <span class="ranking-locked-accent">OFFICIAL LAUNCH</span> OF THE GAME.')
        : 'RANKINGS WILL BECOME AVAILABLE WITH THE <span class="ranking-locked-accent">OFFICIAL LAUNCH</span> OF THE GAME.';

      const host = document.createElement('div');
      host.id = 'ranking-locked-overlay';
      host.className = 'ranking-locked-overlay';
      host.innerHTML = `
        <div class="ranking-locked-inner">
          <div class="ranking-locked-icon">🔒</div>
          <div class="ranking-locked-box">
            ${lockedText}
          </div>
        </div>
      `.trim();
      rankingSection.appendChild(host);
    }

    if (Number.isFinite(openingTs)) {
      const delay = Math.max(0, openingTs - Date.now());
      const maxDelay = 2147483000;
      if (delay > 0 && delay <= maxDelay) {
        setTimeout(() => window.location.reload(), delay + 1500);
      }
    }
  };

  const getServerType = () => {
    const stored = (localStorage.getItem('selectedServer') || '').toString().trim();
    return stored;
  };

  const ensureSelectedServer = async () => {
    const existing = getServerType();
    if (existing) return existing;

    let servers = null;
    if (typeof window.getServersConfigCached === 'function') {
      try {
        servers = await window.getServersConfigCached();
      } catch (e) {
        servers = null;
      }
    }
    if (!servers) {
      servers = await fetchJson('/auth/servers');
    }
    if (!servers || typeof servers !== 'object') return '';
    const keys = Object.keys(servers);
    if (!keys.length) return '';

    const selected = keys[0];
    localStorage.setItem('selectedServer', selected);
    window.SELECTED_SERVER_FILES = (servers[selected]?.server_files || 'IGCN').toString();
    return selected;
  };

  const getBase = () => {
    return window.location.origin;
  };

  const fetchJson = async (path) => {
    const base = getBase();

    try {
      const res = await fetch(base + path);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  };

  const normalizePlayers = (players) => {
    if (!Array.isArray(players)) return null;
    return players.map((p, idx) => {
      const gensSide = (toNum(p.Gens) === 1 || String(p.Gens).toString().toLowerCase().includes('dup')) ? 'd' : 'v';
      const gensRank = toNum(p.Rank ?? 0);
      const online = toNum(p.OnlineStatus ?? p.Online ?? 0) === 1;
      const resets = toNum(p.RESETS ?? p.ResetCount ?? p.Resets ?? 0);
      const grandResets = toNum(p.GrandResets ?? p.GR ?? 0);
      return {
        rank: idx + 1,
        name: p.Name ?? p.CharacterName ?? '',
        classId: Number(p.Class ?? p.ClassId ?? 0) || 0,
        level: Number(p.cLevel ?? p.Level ?? 0) || 0,
        masterLevel: Number(p.mLevel ?? p.MasterLevel ?? 0) || 0,
        resets,
        grandResets,
        online,
        avatar: p.Avatar ?? p.avatar ?? '',
        title: p.Title ?? p.title ?? '',
        guild: p.GuildName ?? p.Guild ?? '-',
        guildMark: p.GuildMark ?? p.G_Mark ?? '',
        gens: `${gensSide}${gensRank}`,
        country: (p.Country ?? p.country ?? '').toString().toLowerCase() || 'ro'
      };
    });
  };

  const normalizeGuilds = (guilds) => {
    if (!Array.isArray(guilds)) return null;
    return guilds.map((g, idx) => {
      const name = g.G_Name ?? g.Name ?? g.guildName ?? '';
      const master = g.G_Master ?? g.Master ?? g.master ?? '';
      const members = Number(g.TotalMembers ?? g.G_Count ?? g.Members ?? g.members ?? 0) || 0;
      const score = Number(g.G_Score ?? g.CalculatedScore ?? g.Score ?? g.score ?? 0) || 0;
      const logoText = (name || '').toString().trim().slice(0, 1);
      const guildMark = g.G_Mark ?? g.GuildMark ?? g.Mark ?? g.mark ?? '';
      return { rank: idx + 1, logoText, guildName: name, master, members, score, guildMark };
    });
  };

  const normalizeGens = (rows) => {
    if (!Array.isArray(rows)) return null;
    // Backend returns: Name, Influence, Rank, Points, CClass, Title, Avatar
    return rows
      .filter(r => r && typeof r === 'object')
      .map((r, idx) => ({
        rank: idx + 1,
        name: r.Name ?? '',
        influence: toNum(r.Influence ?? r.Gens ?? 0),
        gensRank: toNum(r.Rank ?? 0),
        points: toNum(r.Points ?? 0),
        classId: toNum(r.CClass ?? r.Class ?? 0),
        title: r.Title ?? null,
        avatar: r.Avatar ?? null,
        hideStatus: !!r.HideStatus
      }));
  };

  const normalizePvp = (rows) => {
    if (!Array.isArray(rows)) return null;
    // Backend returns: Name, Class, Kills, Deaths, KD, Title, Avatar, HideStatus
    return rows
      .filter(r => r && typeof r === 'object')
      .map((r, idx) => ({
        rank: idx + 1,
        name: r.Name ?? r.name ?? '',
        classId: toNum(r.Class ?? r.CClass ?? r.classId ?? 0),
        kills: toNum(r.Kills ?? 0),
        deaths: toNum(r.Deaths ?? 0),
        kd: Number(r.KD ?? 0) || 0,
        title: r.Title ?? null,
        avatar: r.Avatar ?? null,
        hideStatus: !!r.HideStatus
      }));
  };

  const normalizeHunt = (rows) => {
    if (!Array.isArray(rows)) return null;
    // Backend returns: Name, Class, Kills, Title, Avatar, HideStatus
    return rows
      .filter(r => r && typeof r === 'object')
      .map((r, idx) => ({
        rank: idx + 1,
        name: r.Name ?? r.name ?? '',
        classId: toNum(r.Class ?? r.CClass ?? r.classId ?? 0),
        kills: toNum(r.Kills ?? r.totalKills ?? r.TotalKills ?? 0),
        title: r.Title ?? null,
        avatar: r.Avatar ?? null,
        hideStatus: !!r.HideStatus
      }));
  };

  const loadApiRankings = async () => {
    if (apiLoaded) return;
    apiLoaded = true;
    const serverType = await ensureSelectedServer();
    if (!serverType) {
      apiPlayers = [];
      apiGuilds = [];
      return;
    }
    const [players, guilds, gens, pvp, hunt] = await Promise.all([
      fetchJson(`/top-ranking-characters?serverType=${encodeURIComponent(serverType)}`),
      fetchJson(`/top-ranking-guilds?serverType=${encodeURIComponent(serverType)}`),
      fetchJson(`/top-ranking-gens?serverType=${encodeURIComponent(serverType)}`),
      fetchJson(`/top-ranking-pvp?serverType=${encodeURIComponent(serverType)}`),
      fetchJson(`/top-ranking-monster-hunt?serverType=${encodeURIComponent(serverType)}`)
    ]);
    apiPlayers = normalizePlayers(players);
    apiGuilds = normalizeGuilds(guilds);
    apiGens = normalizeGens(gens);
    apiPvp = normalizePvp(pvp);
    apiHunt = normalizeHunt(hunt);
  };

  const getClass = (classId) => {
    if (typeof getCharacterClassData === 'function') {
      const serverFiles = (window.SELECTED_SERVER_FILES || window.SERVER_FILES || 'IGCN').toString();
      const data = getCharacterClassData(serverFiles, classId);
      if (data && data.length >= 2) {
        return { name: data[0], abbr: data[1] };
      }
    }
    return { name: 'Unknown', abbr: 'UNK' };
  };

  const getClassIconSources = (classId) => {
    try {
      if (typeof getCharacterClassData === 'function') {
        const serverFiles = (window.SELECTED_SERVER_FILES || window.SERVER_FILES || 'IGCN').toString();
        const data = getCharacterClassData(serverFiles, classId);
        if (Array.isArray(data)) {
          const file = (data[4] || data[2] || '').toString().trim();
          if (file) {
            return [
              `assets/images/characters/${encodeURIComponent(file)}`,
              null
            ].filter(Boolean);
          }
        }
      }
    } catch (e) {
    }

    const cls = getClass(classId);
    const fallback = `${safeText(cls.abbr).toUpperCase()}.png`;
    return [`assets/images/characters/${encodeURIComponent(fallback)}`];
  };

  const classImagePath = (classId) => {
    return getClassIconSources(classId)[0] || 'assets/images/characters/DW.png';
  };

  const classImageFallbackPath = (classId) => {
    const sources = getClassIconSources(classId);
    if (sources.length > 1 && sources[1]) return sources[1];
    const cls = getClass(classId);
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
    const normalized = alias[raw] || raw;
    return `assets/images/characters/${encodeURIComponent(normalized)}.png`;
  };

  const flagPath = (countryCode) => {
    const code = safeText(countryCode).toLowerCase();
    return `assets/images/flags/4x3/${encodeURIComponent(code)}.svg`;
  };

  const gensPath = (gens) => {
    return `assets/images/gens/${encodeURIComponent(safeText(gens))}.png`;
  };

  const titlePath = (title) => {
    const n = Math.min(Math.max(parseInt(title, 10) || 0, 0), 99);
    if (!n) return '';
    return `assets/images/title/${n}.svg`;
  };

  const avatarSrc = (avatar) => {
    const a = (avatar || '').toString().trim();
    if (!a) return '';
    if (a === 'null' || a === 'undefined') return '';
    if (/^https?:\/\//i.test(a) || /^data:image\//i.test(a)) return a;
    // If backend returns a relative file path
    if (a.startsWith('assets/')) return a;
    return a;
  };

  const countryName = (code) => {
    try {
      if (typeof countries === 'object' && countries) {
        return countries[String(code).toLowerCase()] || String(code).toUpperCase();
      }
    } catch (e) {
      // ignore
    }
    return String(code).toUpperCase();
  };

  const getShowGR = () => {
    const list = (apiPlayers && apiPlayers.length ? apiPlayers : []);
    return list.some(x => toNum(x.grandResets) > 0);
  };

  const createCharacterRow = (r, options) => {
    const cls = getClass(r.classId);
    const level = Number(r.level) || 0;
    // Ignorando el MasterLevel para la visualización del Nivel
    const totalLv = level;
    const showGR = !!options?.showGR;
    const showStatus = !r.hideStatus;
    const onlineLabel = (typeof window.t === 'function') ? window.t('server.status.online', 'Online') : 'Online';
    const offlineLabel = (typeof window.t === 'function') ? window.t('server.status.offline', 'Offline') : 'Offline';
    const av = avatarSrc(r.avatar);
    const hasAvatar = !!av;
    const hasTitle = !!(r.title && String(r.title).trim());
    const mainImg = hasAvatar ? av : classImagePath(r.classId);
    const frameSrc = hasTitle ? titlePath(r.title) : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-rank">
        <div class="rank-avatar-cell ${r.online ? 'is-online' : 'is-offline'}">
          ${frameSrc ? `<img class="rank-frame" src="${frameSrc}" alt="Title" loading="lazy" onerror="this.style.display='none'">` : ''}
          <img class="rank-avatar-img" src="${mainImg}" alt="Avatar" loading="lazy" onerror="this.onerror=null;this.src='${classImageFallbackPath(r.classId)}'">
          <span class="rank-number">${safeText(r.rank)}</span>
          <span class="status-badge-mini" title="${r.online ? 'Online' : 'Offline'}"></span>
        </div>
      </td>
      <td class="col-name">
        <div class="name-cell">
          <span class="player-name-v2">${safeText(r.name)}</span>
        </div>
      </td>
      <td class="col-class">
        <span class="class-name">${safeText(cls.name)}</span>
      </td>
      <td class="col-lv">${safeText(totalLv)}</td>
      <td class="col-resets">${safeText(r.resets)}</td>
      ${showGR ? `<td class="col-gr">${safeText(r.grandResets)}</td>` : ''}
      <td class="col-guild">${safeText(r.guild)}</td>
      <td class="col-gens">
        <img class="gens-icon" src="${gensPath(r.gens)}" alt="Gens" loading="lazy" onerror="this.style.display='none'">
      </td>
      <td class="col-country">
        <img class="flag" src="${flagPath(r.country)}" alt="${countryName(r.country)}" title="${countryName(r.country)}" loading="lazy" onerror="this.style.display='none'">
      </td>
    `.trim();
    return tr;
  };

  const createHuntRow = (row) => {
    const cls = getClass(row.classId);
    const av = avatarSrc(row.avatar);
    const hasAvatar = !!av;
    const hasTitle = !!(row.title && String(row.title).trim());
    const mainImg = hasAvatar ? av : classImagePath(row.classId);
    const frameSrc = hasTitle ? titlePath(row.title) : '';
    const tr = document.createElement('tr');
    tr.innerHTML = [
      '<td class="col-rank">',
      '  <div class="rank-avatar-cell">',
      frameSrc ? `    <img class="rank-frame" src="${frameSrc}" alt="Title" loading="lazy" onerror="this.style.display='none'">` : '',
      `    <img class="rank-avatar-img" src="${mainImg}" alt="Avatar" loading="lazy" onerror="this.onerror=null;this.src='${classImageFallbackPath(row.classId)}'">`,
      `    <span class="rank-number">${safeText(row.rank)}</span>`,
      '  </div>',
      '</td>',
      '<td class="col-name">',
      '  <div class="name-cell">',
      `    <span class="player-name-v2">${safeText(row.name)}</span>`,
      '  </div>',
      '</td>',
      `<td class="col-class"><span class="class-name">${safeText(cls.name)}</span></td>`,
      `<td class="col-lv">${safeText(row.kills)}</td>`
    ].filter(Boolean).join('');
    return tr;
  };

  const createPvpRow = (row) => {
    const cls = getClass(row.classId);
    const av = avatarSrc(row.avatar);
    const hasAvatar = !!av;
    const hasTitle = !!(row.title && String(row.title).trim());
    const mainImg = hasAvatar ? av : classImagePath(row.classId);
    const frameSrc = hasTitle ? titlePath(row.title) : '';
    const kdVal = Number(row.kd);
    const kdSafe = Number.isFinite(kdVal) ? kdVal : 0;
    const kdText = kdSafe.toFixed(2);
    const kdTier = kdSafe < 1 ? 'kd-bad' : (kdSafe < 1.5 ? 'kd-mid' : 'kd-good');
    const tr = document.createElement('tr');
    tr.innerHTML = [
      '<td class="col-rank">',
      '  <div class="rank-avatar-cell">',
      frameSrc ? `    <img class="rank-frame" src="${frameSrc}" alt="Title" loading="lazy" onerror="this.style.display='none'">` : '',
      `    <img class="rank-avatar-img" src="${mainImg}" alt="Avatar" loading="lazy" onerror="this.onerror=null;this.src='${classImageFallbackPath(row.classId)}'">`,
      `    <span class="rank-number">${safeText(row.rank)}</span>`,
      '  </div>',
      '</td>',
      '<td class="col-name">',
      '  <div class="name-cell">',
      `    <span class="player-name-v2">${safeText(row.name)}</span>`,
      '  </div>',
      '</td>',
      `<td class="col-class"><span class="class-name">${safeText(cls.name)}</span></td>`,
      `<td class="col-lv">${safeText(row.kills)}</td>`,
      `<td class="col-resets">${safeText(row.deaths)}</td>`,
      `<td class="col-guild pvp-kd ${kdTier}">${safeText(kdText)}</td>`
    ].filter(Boolean).join('');
    return tr;
  };

  const influenceToGensKey = (influence, rank) => {
    const inf = toNum(influence);
    const r = Math.max(0, toNum(rank));
    if (inf === 1) return `d${r || 1}`;
    if (inf === 2) return `v${r || 1}`;
    return '';
  };

  const createGensRow = (row) => {
    const cls = getClass(row.classId);
    const gKey = influenceToGensKey(row.influence, row.gensRank);
    const gIcon = gKey ? gensPath(gKey) : '';
    const av = avatarSrc(row.avatar);
    const hasAvatar = !!av;
    const hasTitle = !!(row.title && String(row.title).trim());
    const mainImg = hasAvatar ? av : classImagePath(row.classId);
    const frameSrc = hasTitle ? titlePath(row.title) : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-rank">
        <div class="rank-avatar-cell">
          ${frameSrc ? `<img class="rank-frame" src="${frameSrc}" alt="Title" loading="lazy" onerror="this.style.display='none'">` : ''}
          <img class="rank-avatar-img" src="${mainImg}" alt="Avatar" loading="lazy" onerror="this.onerror=null;this.src='${classImageFallbackPath(row.classId)}'">
          <span class="rank-number">${safeText(row.rank)}</span>
        </div>
      </td>
      <td class="col-name">
        <div class="name-cell">
          <span class="player-name-v2">${safeText(row.name)}</span>
        </div>
      </td>
      <td class="col-class">
        <span class="class-name">${safeText(cls.name)}</span>
      </td>
      <td class="col-gens">
        ${gIcon ? `<img class="gens-icon" src="${gIcon}" alt="Gens" loading="lazy" onerror="this.style.display='none'">` : '-'}
      </td>
      <td class="col-lv">${safeText(row.gensRank || 0)}</td>
      <td class="col-resets">${safeText(row.points || 0)}</td>
    `.trim();
    return tr;
  };

  const createGuildRow = (g) => {
    const tr = document.createElement('tr');
    const mark = guildMarkHexToDataUrl(g.guildMark, 34);
    const hasImg = !!mark;
    tr.innerHTML = `
      <td class="col-rank">
        <div class="rank-cell">
          <span class="rank-number">${safeText(g.rank)}</span>
        </div>
      </td>
      <td class="col-logo">
        ${hasImg ? `<img class="guild-mark" src="${mark}" alt="Guild Logo" loading="lazy" onerror="this.style.display='none'">` : `<div class="guild-logo">${safeText(g.logoText || '').slice(0, 2)}</div>`}
      </td>
      <td class="col-guild-name">${safeText(g.guildName)}</td>
      <td class="col-master">${safeText(g.master)}</td>
      <td class="col-members">${safeText(g.members)}</td>
      <td class="col-score">${safeText(g.score)}</td>
    `.trim();
    return tr;
  };

  const setHeaders = (tab) => {
    if (!headerRow) return;
    if (tab === 'guilds') {
      headerRow.innerHTML = `
        <th class="th-rank">#</th>
        <th class="th-logo">LOGO</th>
        <th class="th-guild-name">GUILD NAME</th>
        <th class="th-master">MASTER</th>
        <th class="th-members">MEMBERS</th>
        <th class="th-score">SCORE</th>
      `.trim();
      return;
    }

    if (tab === 'gens') {
      headerRow.innerHTML = [
        '<th class="th-rank">RANK</th>',
        '<th class="th-name">NAME</th>',
        '<th class="th-class">CLASS</th>',
        '<th class="th-gens">GENS</th>',
        '<th class="th-lv">GENS RANK</th>',
        '<th class="th-resets">POINTS</th>'
      ].join('');
      return;
    }

    if (tab === 'pvp') {
      headerRow.innerHTML = [
        '<th class="th-rank">RANK</th>',
        '<th class="th-name">NAME</th>',
        '<th class="th-class">CLASS</th>',
        '<th class="th-lv">KILLS</th>',
        '<th class="th-resets">DEATHS</th>',
        '<th class="th-guild">KD</th>'
      ].join('');
      return;
    }

    if (tab === 'hunt') {
      headerRow.innerHTML = [
        '<th class="th-rank">RANK</th>',
        '<th class="th-name">NAME</th>',
        '<th class="th-class">CLASS</th>',
        '<th class="th-lv">KILLS</th>'
      ].join('');
      return;
    }

    const showGR = getShowGR();

    headerRow.innerHTML = [
      '<th class="th-rank">RANK</th>',
      '<th class="th-name">NAME</th>',
      '<th class="th-class">CLASS</th>',
      '<th class="th-lv">LV</th>',
      '<th class="th-resets">RR</th>',
      showGR ? '<th class="th-gr">GR</th>' : '',
      '<th class="th-guild">GUILD</th>',
      '<th class="th-gens">GENS</th>',
      '<th class="th-country">COUNTRY</th>'
    ].filter(Boolean).join('');
  };

  const render = (tab) => {
    setHeaders(tab);
    tbody.innerHTML = '';

    const noDataText = (typeof window.t === 'function') ? window.t('common.no_data', 'No data') : 'No data';

    if (tab === 'guilds') {
      const data = apiGuilds && apiGuilds.length ? apiGuilds : [];
      if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="6">${noDataText}</td></tr>`;
        renderPagination(tab, 0, () => render(tab));
        return;
      }
      const pageData = getPagedSlice(tab, data);
      pageData.forEach(g => tbody.appendChild(createGuildRow(g)));
      renderPagination(tab, data.length, () => render(tab));
      return;
    }

    if (tab === 'gens') {
      const data = apiGens && apiGens.length ? apiGens : [];
      if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="6">${noDataText}</td></tr>`;
        renderPagination(tab, 0, () => render(tab));
        return;
      }
      const pageData = getPagedSlice(tab, data);
      pageData.forEach(r => tbody.appendChild(createGensRow(r)));
      renderPagination(tab, data.length, () => render(tab));
      return;
    }

    if (tab === 'pvp') {
      const data = apiPvp && apiPvp.length ? apiPvp : [];
      if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="6">${noDataText}</td></tr>`;
        renderPagination(tab, 0, () => render(tab));
        return;
      }
      const pageData = getPagedSlice(tab, data);
      pageData.forEach(r => tbody.appendChild(createPvpRow(r)));
      renderPagination(tab, data.length, () => render(tab));
      return;
    }

    if (tab === 'hunt') {
      const data = apiHunt && apiHunt.length ? apiHunt : [];
      if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="4">${noDataText}</td></tr>`;
        renderPagination(tab, 0, () => render(tab));
        return;
      }
      const pageData = getPagedSlice(tab, data);
      pageData.forEach(r => tbody.appendChild(createHuntRow(r)));
      renderPagination(tab, data.length, () => render(tab));
      return;
    }

    if (tab !== 'character') {
      tbody.innerHTML = `<tr><td colspan="8">${noDataText}</td></tr>`;
      renderPagination(tab, 0, () => render(tab));
      return;
    }

    const data = apiPlayers && apiPlayers.length ? apiPlayers : [];
    if (!data.length) {
      const baseCols = 8 + (getShowGR() ? 1 : 0);
      tbody.innerHTML = `<tr><td colspan="${baseCols}">${noDataText}</td></tr>`;
      renderPagination(tab, 0, () => render(tab));
      return;
    }
    const options = { showGR: getShowGR() };

    const pageData = getPagedSlice(tab, data);
    pageData.forEach(r => tbody.appendChild(createCharacterRow(r, options)));
    renderPagination(tab, data.length, () => render(tab));
  };

  const setActiveTab = (tabBtn) => {
    tabs.forEach(t => t.classList.remove('active'));
    tabBtn.classList.add('active');
  };

  tabs.forEach(btn => {
    btn.addEventListener('click', async () => {
      const tab = btn.getAttribute('data-tab') || 'character';
      setActiveTab(btn);

      currentPageByTab[tab] = 1;
      if (!apiPlayers && !apiGuilds) {
        await loadApiRankings();
      }
      render(tab);
    });
  });

  (async () => {
    const lock = await computeRankingsLock();
    if (lock?.locked) {
      showRankingsLocked(lock.openingTs);
      return;
    }

    await loadApiRankings();
    const initial = document.querySelector('.ranking-tabs .tab-btn.active')?.getAttribute('data-tab') || 'character';
    render(initial);
  })();
});