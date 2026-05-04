document.addEventListener('DOMContentLoaded', () => {
  let currentMinWithdrawal = 25;
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const encodedProfile = params.get('profile');
  let profileJustSetFromUrl = false;
  let liveStreamTimerInterval = null;
  const voteCooldownIntervals = {};

  const applyTranslationsSafe = () => {
    try {
      if (typeof window.applyTranslations === 'function') window.applyTranslations(document);
    } catch (e) { }
  };

  // TikTok is handled via the same Start Tracking / Stop Tracking flow as other platforms.

  const setText = (selector, text) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = String(text ?? '');
  };

  const renderSelectedServerNameWithRetry = async () => {
    for (let i = 0; i < 8; i++) {
      try { await renderSelectedServerName(); } catch (e) { }
      const el = document.getElementById('db-server-name');
      const txt = (el && el.textContent) ? el.textContent.trim() : '';
      if (txt && txt !== '-') return;
      await new Promise(r => setTimeout(r, 250));
    }
  };

  const renderSelectedServerName = async () => {
    const el = document.getElementById('db-server-name');
    if (!el) return;
    try {
      const cfg = (typeof window.getServersConfigCached === 'function') ? await window.getServersConfigCached() : null;
      const servers = (cfg && typeof cfg === 'object') ? cfg : null;
      const keys = servers ? Object.keys(servers) : [];
      const stored = (localStorage.getItem('selectedServer') || '').toString().trim();
      const selected = (stored && servers && servers[stored]) ? stored : (keys[0] || '');
      if (selected && selected !== stored) localStorage.setItem('selectedServer', selected);

      if (!selected) {
        el.textContent = '-';
        return;
      }

      const s = servers && servers[selected] ? servers[selected] : null;
      const label = s ? (s.displayName || s.name || s.title || selected) : selected;
      el.textContent = String(label || selected);
    } catch (e) {
      const fallback = (localStorage.getItem('selectedServer') || '').toString().trim();
      el.textContent = fallback || '-';
    }
  };

  const ensureAuth = () => {
    const authToken = (localStorage.getItem('authToken') || '').toString().trim();
    if (!authToken) {
      window.location.href = '/';
      return false;
    }
    return true;
  };

  if (!ensureAuth()) return;
  try { document.body.style.visibility = 'visible'; } catch (e) { }

  document.addEventListener('layout:loaded', () => {
    applyTranslationsSafe();
  });

  const showToast = (type, message) => {
    if (typeof showNotification === 'function') {
      showNotification(type, message);
    }
  };

  const apiFetch = async (endpoint, options = {}) => {
    if (typeof window.apiFetch !== 'function') throw new Error('API not ready');
    return window.apiFetch(endpoint, options);
  };

  const decodeProfileFromUrl = () => {
    if (!token || !encodedProfile) return null;
    try {
      const base64Url = encodedProfile.replace(/-/g, '+').replace(/_/g, '/');
      const padding = '='.repeat((4 - base64Url.length % 4) % 4);
      const paddedBase64 = base64Url + padding;
      const profileJson = decodeURIComponent(atob(paddedBase64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      return JSON.parse(profileJson);
    } catch (e) {
      return null;
    }
  };

  const applyProfile = (profile) => {
    if (!profile || typeof profile !== 'object') return;

    const ti = (key, fallback) => {
      if (typeof window.t === 'function') return window.t(key, fallback);
      return fallback;
    };

    setText('#db-username', profile.username || profile.Username || '');
    setText('#db-email', profile.email || profile.Email || '');
    setText('#db-country', profile.Country || profile.country || '');
    const currencies = (profile.currencies && typeof profile.currencies === 'object') ? profile.currencies : null;
    setText('#db-wcoin', profile.WCoin ?? profile.wcoin ?? currencies?.wcoin ?? currencies?.WCoin ?? 0);
    setText('#db-goblinpoint', profile.GoblinPoint ?? profile.goblinpoint ?? currencies?.goblinPoint ?? currencies?.GoblinPoint ?? 0);
    setText('#db-cash', profile.Cash ?? profile.cash ?? currencies?.cash ?? currencies?.Cash ?? 0);
    setText(
      '#db-keypoints',
      profile.KeyPoints ??
      profile.Keypoints ??
      profile.keyPoints ??
      profile.keypoints ??
      profile.key ??
      profile.Key ??
      currencies?.key ??
      currencies?.Key ??
      0,
    );

    setText('#db-discord-userid', profile.discordUserId ?? profile.discord_user_id ?? '-');
    setText('#db-discord-username', profile.discordUsername ?? profile.discord_username ?? '-');

    const vipLevel = profile.vipLevel ?? profile.VipLevel ?? profile.vip ?? '-';
    setText('#db-vip-level', vipLevel ?? '-');

    const expRaw = profile.vipExpiration ?? profile.VipExpiration ?? null;
    let expLabel = '-';
    if (expRaw) {
      const d = new Date(expRaw);
      if (!Number.isNaN(d.getTime())) {
        expLabel = d.toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      }
    }
    setText('#db-vip-expiration', expLabel);

    const disc = Number(profile.titleDiscountPercent ?? profile.TitleDiscountPercent ?? 0);
    setText('#db-title-discount', `${Number.isFinite(disc) ? disc : 0}%`);

    const cashUpdatedRaw = profile.CashUpdatedAt ?? profile.cashUpdatedAt ?? null;
    let cashUpdatedLabel = '-';
    if (cashUpdatedRaw) {
      const d2 = new Date(cashUpdatedRaw);
      if (!Number.isNaN(d2.getTime())) {
        cashUpdatedLabel = d2.toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      }
    }
    setText('#db-cash-updated', cashUpdatedLabel);

    const twoFa = document.getElementById('db-2fa-status');
    if (twoFa) {
      const enabled = !!profile.twoFactorEnabled;
      twoFa.textContent = enabled ? 'Active' : 'Inactive';
      twoFa.style.color = enabled ? '#10B981' : '#ef4444';
    }

    if (typeof window.renderHeaderAuthControls === 'function') {
      try { window.renderHeaderAuthControls(); } catch (e) { }
    }
  };

  const startClock = () => {
    const el = document.getElementById('server-time');
    if (!el) return;
    const tick = () => {
      el.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false });
    };
    tick();
    setInterval(tick, 1000);
  };

  const formatVoteRemaining = (seconds) => {
    const sec = Math.max(0, Number(seconds) || 0);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
    if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
    return `${s}s`;
  };

  const formatVoteCountdown = (seconds) => {
    const sec = Math.max(0, Number(seconds) || 0);
    const h = Math.floor(sec / 3600).toString().padStart(2, '0');
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const getVoteCooldownStorageKey = (username, serverType) => `voteCooldowns:${serverType}:${username}`;

  const getLocalCooldowns = (username, serverType) => {
    try {
      const raw = localStorage.getItem(getVoteCooldownStorageKey(username, serverType));
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const setLocalCooldown = (username, serverType, siteId, seconds) => {
    const cd = getLocalCooldowns(username, serverType);
    cd[String(siteId)] = Date.now() + (Number(seconds) || 0) * 1000;
    localStorage.setItem(getVoteCooldownStorageKey(username, serverType), JSON.stringify(cd));
  };

  const applyLocalCooldownsToSites = (sites, username, serverType) => {
    const cd = getLocalCooldowns(username, serverType);
    const now = Date.now();
    return (sites || []).map(site => {
      const exp = cd[String(site.site_id)];
      if (exp && exp > now) {
        const remainingSeconds = Math.ceil((exp - now) / 1000);
        return { ...site, canVote: false, remainingTimeSeconds: remainingSeconds };
      }
      return { ...site, canVote: true, remainingTimeSeconds: 0 };
    });
  };

  const buildVoteUrl = (site, username) => {
    if (!site?.link) return '';
    let url = String(site.link);
    if (site.title === 'XTREMETOP100' || url.includes('xtremetop100.com')) {
      if (!url.includes('postback=')) {
        const sep = url.includes('?') ? '&' : '?';
        url = `${url}${sep}postback=${encodeURIComponent(username)}`;
      }
      if (!url.includes('custom=')) {
        url = `${url}&custom=${encodeURIComponent(username)}`;
      }
    }
    return url;
  };

  const startVoteCountdown = (username, serverType, siteId, seconds) => {
    const el = document.getElementById(`vote-countdown-${siteId}`);
    if (!el) return;

    if (voteCooldownIntervals[siteId]) clearInterval(voteCooldownIntervals[siteId]);
    let remaining = Math.max(0, Number(seconds) || 0);
    el.textContent = formatVoteCountdown(remaining);

    voteCooldownIntervals[siteId] = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(voteCooldownIntervals[siteId]);
        delete voteCooldownIntervals[siteId];
        loadVoteOptions();
        return;
      }
      el.textContent = formatVoteCountdown(remaining);
    }, 1000);
  };

  async function loadVoteOptions() {
    const container = document.getElementById('vote-sites-container');
    if (!container) return;

    const user = JSON.parse(localStorage.getItem('userProfile') || 'null');
    const serverType = localStorage.getItem('selectedServer') || user?.serverType;
    const username = user?.username;

    if (!username || !serverType) {
      container.innerHTML = `<div class="loader">Missing profile/server.</div>`;
      return;
    }

    container.innerHTML = `<div class="loader">Loading vote sites...</div>`;
    try {
      const res = await apiFetch('/vote/options', {
        method: 'POST',
        body: JSON.stringify({ username, serverType })
      });

      if (!res?.success) {
        container.innerHTML = `<div class="loader">${res?.message || 'Vote unavailable.'}</div>`;
        return;
      }

      const rawSites = (res.voteOptions || []).filter(s => s && (s.active === true || typeof s.active === 'undefined'));
      const sites = applyLocalCooldownsToSites(rawSites, username, serverType);

      if (!sites.length) {
        container.innerHTML = `<div class="loader">No vote sites configured.</div>`;
        return;
      }

      container.innerHTML = sites.map(site => {
        const reward = Array.isArray(site.rewards) && site.rewards.length ? site.rewards[0] : null;
        const rewardTxt = reward ? `${reward.amount} ${reward.sub_type || reward.type}` : '—';
        const statusTxt = site.canVote ? 'Ready' : `Cooldown: ${formatVoteRemaining(site.remainingTimeSeconds)}`;
        const statusClass = site.canVote ? 'vote-status--ready' : 'vote-status--cooldown';
        const imgHtml = site.img ? `<img class="vote-site__img" src="${site.img}" alt="${site.title || 'Vote'}" loading="lazy"/>` : '';
        const openDisabled = !site.canVote;
        const openText = site.canVote ? 'Vote Now' : 'Cooldown';
        const countdownHtml = site.canVote
          ? ''
          : `<div class="vote-cooldown"><span class="vote-cooldown__label">Cooldown</span><span class="vote-cooldown__time" id="vote-countdown-${site.site_id}">${formatVoteCountdown(site.remainingTimeSeconds)}</span></div>`;
        return `
          <div class="dh-card vote-site">
            <div class="vote-site__head">
              <h3 class="vote-site__title">${site.title || 'Vote Site'}</h3>
              <span class="vote-status ${statusClass}">${statusTxt}</span>
            </div>
            ${imgHtml ? `<div class="vote-site__img-wrap">${imgHtml}</div>` : ''}
            <div class="vote-site__meta">
              <span class="vote-site__meta-label">Reward</span>
              <strong class="vote-site__meta-value">${rewardTxt}</strong>
            </div>
            <div class="vote-site__actions">
              <button class="action-btn vote-btn vote-btn--open vote-open-btn" data-link="${site.link || ''}" data-site-id="${site.site_id}" data-vote-hours="${site.vote_time || 12}" data-postback-enabled="${site.postback_enabled ? '1' : '0'}" ${openDisabled ? 'disabled' : ''}>${openText}</button>
            </div>
            ${countdownHtml}
          </div>
        `.trim();
      }).join('');

      container.querySelectorAll('.vote-open-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (btn.disabled) return;
          const siteId = Number(btn.dataset.siteId);
          const voteHours = Number(btn.dataset.voteHours) || 12;
          const postbackEnabled = btn.dataset.postbackEnabled === '1';

          const url = buildVoteUrl({ title: btn.closest('.vote-site')?.querySelector('.vote-site__title')?.textContent, link: btn.dataset.link }, username) || btn.dataset.link;
          if (url) window.open(url, '_blank', 'noopener,noreferrer');

          const seconds = voteHours * 3600;
          setLocalCooldown(username, serverType, siteId, seconds);

          if (!postbackEnabled) {
            try {
              const r = await apiFetch('/vote/submit', {
                method: 'POST',
                body: JSON.stringify({ username, serverType, voteSiteId: siteId })
              });
              if (r?.success) {
                showToast('success', r.message || 'Vote processed.');
                await loadAccountInfo();
              } else {
                showToast('error', r?.message || 'Vote failed.');
              }
            } catch (e) {
              showToast('error', e?.message || 'Vote failed.');
            }
          }

          loadVoteOptions();
        });
      });

      sites.forEach(site => {
        if (!site.canVote && Number(site.remainingTimeSeconds) > 0) {
          startVoteCountdown(username, serverType, site.site_id, site.remainingTimeSeconds);
        }
      });

    } catch (e) {
      container.innerHTML = `<div class="loader">Error loading vote sites</div>`;
    }
  }

  const formatDuration = (s) => {
    const sec = Math.max(0, Number(s) || 0);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), ss = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };

  const startLiveTimer = (startTimeISO) => {
    if (liveStreamTimerInterval) clearInterval(liveStreamTimerInterval);
    const start = new Date(startTimeISO);
    liveStreamTimerInterval = setInterval(() => {
      const diff = Math.floor((new Date() - start) / 1000);
      const el = document.getElementById('liveStreamDuration');
      if (el) el.textContent = formatDuration(diff > 0 ? diff : 0);
    }, 1000);
  };

  const stopLiveTimer = () => {
    if (liveStreamTimerInterval) clearInterval(liveStreamTimerInterval);
    liveStreamTimerInterval = null;
    const el = document.getElementById('liveStreamDuration');
    if (el) el.textContent = '00:00:00';
  };

  const setChannelUi = (rootId, value) => {
    const root = document.getElementById(rootId);
    const txt = document.getElementById(`${rootId}ID`);
    if (!root || !txt) return;
    const v = (value || '').toString().trim();
    if (v) {
      root.style.display = '';
      txt.textContent = v;
      root.classList.remove('not-set');
      root.style.borderLeftColor = '#10B981';
      root.style.color = '#fff';
    } else {
      root.style.display = 'none';
      txt.textContent = 'Not set';
      root.classList.add('not-set');
    }
  };

  async function loadStreamerPromoCodes(accountId, serverType) {
    const container = document.getElementById('streamer-promo-codes-list');
    const generateBtn = document.getElementById('generateDailyCodesBtn');
    if (!container || !generateBtn) return;

    const ti = (key, fallback) => {
      if (typeof window.t === 'function') return window.t(key, fallback);
      return fallback;
    };

    container.innerHTML = `<div class="loader">Loading codes...</div>`;

    try {
      const codes = await apiFetch(`/promocode/streamer-codes?serverType=${encodeURIComponent(serverType)}&accountId=${encodeURIComponent(accountId)}`);
      const today = new Date().toISOString().split('T')[0];
      const generatedToday = Array.isArray(codes) && codes.some(c => (c?.code || '').startsWith('STRM-') && (c?.createdAt && String(c.createdAt).startsWith(today)));

      if (generatedToday) {
        generateBtn.disabled = true;
        generateBtn.textContent = 'Codes Generated Today';
      } else {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate Codes';
      }

      if (!Array.isArray(codes) || !codes.length) {
        container.innerHTML = '<p style="text-align:center; color:#aaa; padding:10px;">No codes generated yet.</p>';
        return;
      }

      const pageSize = 5;
      const total = codes.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      let page = Math.min(Math.max(1, Number(container.dataset.page || 1) || 1), totalPages);

      const renderPage = () => {
        container.dataset.page = String(page);
        const start = (page - 1) * pageSize;
        const slice = codes.slice(start, start + pageSize);

        const listHtml = slice.map(c => {
          const code = (c?.code || '').toString();
          const used = Number(c?.currentUses || 0) >= Number(c?.maxUses || 0);
          return `
            <div class="promo-code-item ${used ? 'used' : ''}">
              <span class="promo-code-code">${code}</span>
              <div style="display:flex; align-items:center;">
                <span class="code-status" style="color: ${used ? '#ef4444' : '#10B981'}; margin-right:10px; font-size:0.8rem;">${used ? 'Used' : 'Active'}</span>
                <button class="code-copy-btn" data-code="${code}" ${used ? 'disabled' : ''}><i class='bx bxs-copy'></i></button>
              </div>
            </div>
          `;
        }).join('');

        const pagerHtml = totalPages <= 1 ? '' : `
          <div class="ranking-pagination" style="margin-top: 12px;">
            <button type="button" class="rank-page-btn" data-pg="prev" ${page <= 1 ? 'disabled' : ''}>${ti('pagination.prev', 'Prev')}</button>
            ${Array.from({ length: totalPages }).map((_, i) => {
          const p = i + 1;
          return `<button type="button" class="rank-page-btn ${p === page ? 'active' : ''}" data-pg="${p}">${p}</button>`;
        }).join('')}
            <button type="button" class="rank-page-btn" data-pg="next" ${page >= totalPages ? 'disabled' : ''}>${ti('pagination.next', 'Next')}</button>
          </div>
        `.trim();

        container.innerHTML = `${listHtml}${pagerHtml}`;

        container.querySelectorAll('.code-copy-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const code = btn.dataset.code || '';
            if (!code) return;
            navigator.clipboard.writeText(code);
            showToast('success', 'Code copied');
          });
        });

        container.querySelectorAll('[data-pg]').forEach(btn => {
          btn.addEventListener('click', () => {
            const v = (btn.getAttribute('data-pg') || '').toString();
            if (v === 'prev') page = Math.max(1, page - 1);
            else if (v === 'next') page = Math.min(totalPages, page + 1);
            else {
              const n = Number(v);
              if (Number.isFinite(n) && n >= 1 && n <= totalPages) page = n;
            }
            renderPage();
          });
        });
      };

      renderPage();
    } catch (e) {
      container.innerHTML = '<div class="loader">Error loading codes</div>';
    }
  }

  async function loadAffiliateData() {
    const codeDisplay = document.getElementById('affiliate-code-display');
    if (!codeDisplay) return;

    const copyBtn = document.getElementById('copy-affiliate-btn');
    const availEl = document.getElementById('wallet-available');
    const pendEl = document.getElementById('wallet-pending');
    const totalEl = document.getElementById('wallet-total');
    const historyBody = document.getElementById('payout-history-table')?.querySelector('tbody');
    const commDisplay = document.getElementById('affiliate-comm-rate');
    const discDisplay = document.getElementById('affiliate-disc-rate');

    try {
      const response = await apiFetch('/affiliate/data');
      if (response?.success && response?.data) {
        const data = response.data;

        codeDisplay.textContent = data.affiliateCode || 'UNAVAILABLE';
        if (copyBtn) {
          copyBtn.onclick = () => {
            const code = (data.affiliateCode || '').toString();
            if (!code) return;
            navigator.clipboard.writeText(code);
            showToast('success', 'Copied!');
          };
        }

        const available = Number(data.availableForWithdrawal || 0) || 0;
        if (availEl) availEl.textContent = `$${available}`;
        if (pendEl) pendEl.textContent = `$${data.totalPending || 0}`;
        if (totalEl) totalEl.textContent = `$${data.totalEarned || 0}`;

        const modalAvail = document.getElementById('modal-available-amount');
        if (modalAvail) modalAvail.textContent = String(available);

        const minW = Number(data.minWithdrawal || 25) || 25;
        currentMinWithdrawal = minW;
        const withdrawInput = document.getElementById('withdraw-amount');
        if (withdrawInput) {
          withdrawInput.min = String(minW);
          withdrawInput.placeholder = `Min $${minW}`;
        }

        if (commDisplay) {
          let rate = data.commissionRate || 0.15;
          if (rate <= 1) rate = rate * 100;
          commDisplay.textContent = `${parseInt(rate, 10)}% Cash`;
        }

        if (discDisplay) {
          let disc = data.affiliateDiscountPercent || 5;
          if (disc <= 1) disc = disc * 100;
          discDisplay.textContent = `${parseInt(disc, 10)}% OFF`;
        }

        if (historyBody && Array.isArray(data.withdrawalHistory)) {
          if (data.withdrawalHistory.length === 0) {
            historyBody.innerHTML = `<tr><td colspan="3">No history.</td></tr>`;
          } else {
            historyBody.innerHTML = data.withdrawalHistory.slice(0, 3).map(w => {
              const status = (w?.Status || '').toString();
              let statusClass = 'color: #ef4444;';
              if (status === 'Pending') statusClass = 'color: #f9d765;';
              else if (status.includes('Approve')) statusClass = 'color: #10B981;';
              return `
                <tr>
                  <td>${new Date(w.RequestedAt).toLocaleDateString()}</td>
                  <td>$${w.AmountUSD}</td>
                  <td style="${statusClass} font-weight:bold;">${status}</td>
                </tr>
              `;
            }).join('');
          }
        }
      } else {
        codeDisplay.textContent = 'UNAVAILABLE';
        const reason = (response && typeof response === 'object' && 'message' in response) ? String(response.message || '') : '';
        if (reason) {
          showToast('error', reason);
        }
      }
    } catch (e) {
      codeDisplay.textContent = 'ERROR';
    }
  }

  const bindWithdrawalModal = () => {
    const modal = document.getElementById('withdrawal-modal');
    const openBtn = document.getElementById('request-payout-btn');
    const closeBtn = document.getElementById('close-withdrawal-modal');
    const methodSelect = document.getElementById('withdraw-method');
    const form = document.getElementById('withdrawal-form');

    if (!modal || !openBtn || !closeBtn || !methodSelect || !form) return;

    const open = () => {
      modal.classList.add('show');
    };
    const close = () => {
      modal.classList.remove('show');
    };

    openBtn.addEventListener('click', () => open());
    closeBtn.addEventListener('click', () => close());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });

    const syncMethodFields = () => {
      const val = methodSelect.value;
      const revFields = document.getElementById('revolut-fields');
      const bankFields = document.getElementById('bank-fields');
      if (val === 'Revolut') {
        if (revFields) revFields.style.display = 'block';
        if (bankFields) bankFields.style.display = 'none';
      } else {
        if (revFields) revFields.style.display = 'none';
        if (bankFields) bankFields.style.display = 'block';
      }
    };
    methodSelect.addEventListener('change', syncMethodFields);
    syncMethodFields();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const method = methodSelect.value;
      const amount = Number(document.getElementById('withdraw-amount')?.value || 0);
      if (!Number.isFinite(amount) || amount <= 0) {
        showToast('error', 'Enter a valid amount.');
        return;
      }

      if (amount < currentMinWithdrawal) {
        showToast('error', `Minimum withdrawal amount is $${currentMinWithdrawal} USD.`);
        return;
      }

      let details = {};
      if (method === 'Revolut') {
        details = {
          revolutTag: (document.getElementById('withdraw-revtag')?.value || '').toString().trim()
        };
      } else {
        details = {
          bankName: (document.getElementById('withdraw-bank-details')?.value || '').toString().trim(),
          accountHolderName: (document.getElementById('withdraw-bank-name')?.value || '').toString().trim(),
          iban: (document.getElementById('withdraw-iban')?.value || '').toString().trim(),
          swiftBic: (document.getElementById('withdraw-swift')?.value || '').toString().trim(),
          bankCountry: (document.getElementById('withdraw-bank-country')?.value || '').toString().trim(),
          currency: (document.getElementById('withdraw-currency')?.value || '').toString().trim() || 'USD'
        };
      }

      try {
        const r = await apiFetch('/affiliate/withdrawal', {
          method: 'POST',
          body: JSON.stringify({ amount, method, details })
        });

        if (r?.success) {
          showToast('success', r.message || 'Withdrawal requested!');
          close();
          await loadAffiliateData();
          await loadStreamerStatus();
        } else {
          showToast('error', r?.message || 'Withdrawal failed');
        }
      } catch (err) {
        showToast('error', err?.message || 'Withdrawal failed');
      }
    });
  };

  const showStreamerView = (view) => {
    const views = {
      loading: document.getElementById('streamer-loading-view'),
      register: document.getElementById('streamer-register-view'),
      pending: document.getElementById('streamer-pending-view'),
      dashboard: document.getElementById('streamer-dashboard-view')
    };
    Object.values(views).forEach(v => { if (v) v.style.display = 'none'; });
    if (views[view]) views[view].style.display = 'block';
  };

  const updateStreamerDashboard = (status) => {
    setText('#streamTotalMinutes', status?.totalStreamMinutes || 0);
    setText('#streamClaimableAmount', `${status?.rewardableAmount || 0} WCoin`);

    const claimBtn = document.getElementById('claimRewardsBtn');
    if (claimBtn) claimBtn.disabled = !!status?.isTracking || (Number(status?.rewardableAmount || 0) <= 0);

    const startCtrl = document.getElementById('stream-start-controls');
    const stopCtrl = document.getElementById('stream-stop-controls');
    if (status?.isTracking) {
      if (startCtrl) startCtrl.style.display = 'none';
      if (stopCtrl) stopCtrl.style.display = 'block';
      setText('#currentTrackingPlatform', status?.currentTrackingPlatform || '-');
      if (status?.lastStreamStartTime) startLiveTimer(status.lastStreamStartTime);
    } else {
      if (startCtrl) startCtrl.style.display = 'block';
      if (stopCtrl) stopCtrl.style.display = 'none';
      stopLiveTimer();
    }

    const liveWrapper = document.getElementById('liveStreamDuration')?.closest('.live-timer');
    if (liveWrapper) {
      liveWrapper.style.display = status?.isTracking ? 'flex' : 'none';
    }

    const channels = status?.channels || {};
    setChannelUi('streamChannelYouTube', channels.youtube);
    setChannelUi('streamChannelTwitch', channels.twitch);
    setChannelUi('streamChannelKick', channels.kick);
    setChannelUi('streamChannelTikTok', channels.tiktok);

    window.__streamerChannels = {
      youtube: (channels.youtube || '').toString().trim(),
      twitch: (channels.twitch || '').toString().trim(),
      kick: (channels.kick || '').toString().trim(),
      tiktok: (channels.tiktok || '').toString().trim(),
    };

    const platformBtns = document.querySelectorAll('.platform-btn');
    const avail = {
      YouTube: !!window.__streamerChannels.youtube,
      Twitch: !!window.__streamerChannels.twitch,
      Kick: !!window.__streamerChannels.kick,
      TikTok: !!window.__streamerChannels.tiktok,
    };

    platformBtns.forEach(btn => {
      const p = (btn.dataset.platform || '').toString();
      btn.style.display = avail[p] ? '' : 'none';
      if (!avail[p]) btn.classList.remove('selected');
    });

    const startBtn = document.getElementById('startTrackingBtn');
    const selectedBtn = document.querySelector('.platform-btn.selected');
    const hasAny = Object.values(avail).some(Boolean);
    if (startBtn) {
      const selected = selectedBtn ? (selectedBtn.dataset.platform || '') : '';
      startBtn.disabled = !hasAny || !selected;
    }

    const user = JSON.parse(localStorage.getItem('userProfile') || 'null');
    const serverType = localStorage.getItem('selectedServer') || user?.serverType;
    if (user?.username && serverType) {
      loadStreamerPromoCodes(user.username, serverType);
    }
  };

  async function loadStreamerStatus() {
    const container = document.getElementById('tab-streamers');
    if (!container) return;

    showStreamerView('loading');
    try {
      const res = await apiFetch('/streaming/status');
      if (!res?.isRegistered) {
        showStreamerView('register');
      } else if (!res?.isApproved) {
        showStreamerView('pending');
      } else {
        showStreamerView('dashboard');
        updateStreamerDashboard(res);
        loadAffiliateData();
      }
    } catch (e) {
      showStreamerView('register');
    }
  }

  const bindStreamerActions = () => {
    const regForm = document.getElementById('streamerRegisterForm');
    if (regForm) {
      regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = {
          youtubeChannelId: document.getElementById('youtubeChannelId')?.value || '',
          twitchChannelId: document.getElementById('twitchChannelId')?.value || '',
          kickChannelId: document.getElementById('kickChannelId')?.value || '',
          tiktokChannelId: document.getElementById('tiktokChannelId')?.value || ''
        };
        try {
          await apiFetch('/streaming/request-approval', { method: 'POST', body: JSON.stringify(body) });
          showToast('success', 'Request sent');
          loadStreamerStatus();
        } catch (err) {
          showToast('error', err?.message || 'Request failed');
        }
      });
    }

    let selectedPlatform = null;
    document.querySelectorAll('.platform-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.style.display === 'none') return;
        document.querySelectorAll('.platform-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedPlatform = btn.dataset.platform;
        const startBtn = document.getElementById('startTrackingBtn');
        const channels = window.__streamerChannels || {};
        const avail = {
          YouTube: !!(channels.youtube || '').toString().trim(),
          Twitch: !!(channels.twitch || '').toString().trim(),
          Kick: !!(channels.kick || '').toString().trim(),
          TikTok: !!(channels.tiktok || '').toString().trim(),
        };
        const hasAny = Object.values(avail).some(Boolean);
        if (startBtn) startBtn.disabled = !hasAny || !selectedPlatform;
      });
    });

    const startBtn = document.getElementById('startTrackingBtn');
    if (startBtn) {
      startBtn.addEventListener('click', async () => {
        const channels = window.__streamerChannels || {};
        const avail = {
          YouTube: !!(channels.youtube || '').toString().trim(),
          Twitch: !!(channels.twitch || '').toString().trim(),
          Kick: !!(channels.kick || '').toString().trim(),
          TikTok: !!(channels.tiktok || '').toString().trim(),
        };
        const hasAny = Object.values(avail).some(Boolean);
        if (!hasAny) {
          showToast('error', 'Set at least one channel before starting tracking');
          return;
        }
        if (!selectedPlatform || !avail[selectedPlatform]) {
          showToast('error', 'Select a configured platform');
          return;
        }
        try {
          await apiFetch('/streaming/start-tracking', { method: 'POST', body: JSON.stringify({ platform: selectedPlatform }) });
          showToast('success', 'Tracking started');
          loadStreamerStatus();
        } catch (e) {
          showToast('error', e?.message || 'Start failed');
        }
      });
    }

    const stopBtn = document.getElementById('stopTrackingBtn');
    if (stopBtn) {
      stopBtn.addEventListener('click', async () => {
        try {
          await apiFetch('/streaming/stop-tracking', { method: 'POST' });
          showToast('success', 'Tracking stopped');
          loadStreamerStatus();
        } catch (e) {
          showToast('error', e?.message || 'Stop failed');
        }
      });
    }

    const claimBtn = document.getElementById('claimRewardsBtn');
    if (claimBtn) {
      claimBtn.addEventListener('click', async () => {
        try {
          const r = await apiFetch('/streaming/claim-rewards', { method: 'POST' });
          showToast('success', r?.message || 'Rewards claimed');
          loadStreamerStatus();
          loadAccountInfo();
        } catch (e) {
          showToast('error', e?.message || 'Claim failed');
        }
      });
    }

    const genBtn = document.getElementById('generateDailyCodesBtn');
    if (genBtn) {
      genBtn.addEventListener('click', async () => {
        if (genBtn.disabled) return;
        genBtn.disabled = true;
        try {
          await apiFetch('/streaming/generate-daily-promos', { method: 'POST' });
          showToast('success', 'Codes generated');
          const user = JSON.parse(localStorage.getItem('userProfile') || 'null');
          const serverType = localStorage.getItem('selectedServer') || user?.serverType;
          if (user?.username && serverType) {
            await loadStreamerPromoCodes(user.username, serverType);
          }
        } catch (e) {
          showToast('error', e?.message || 'Generate failed');
          genBtn.disabled = false;
        }
      });
    }

    // TikTok connect/disconnect controls removed. Start/Stop tracking handles TikTok.
  };

  const bindTabSwitching = () => {
    const links = document.querySelectorAll('.sidebar-nav a[data-tab]');
    const tabs = document.querySelectorAll('.dash-tab');
    if (!links.length || !tabs.length) return;

    const setActive = (tabId) => {
      links.forEach(l => l.classList.toggle('active', l.dataset.tab === tabId));
      tabs.forEach(t => t.classList.toggle('active', t.id === `tab-${tabId}`));
    };

    const ensureValidActive = () => {
      const activeLink = document.querySelector('.sidebar-nav a.active[data-tab]');
      const activeId = activeLink?.dataset?.tab;
      if (!activeId) {
        setActive('overview');
        return;
      }
      const section = document.getElementById(`tab-${activeId}`);
      if (!section) {
        setActive('overview');
      }
    };

    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tabId = link.dataset.tab;
        if (!tabId) return;

        const section = document.getElementById(`tab-${tabId}`);
        if (!section) {
          ensureValidActive();
          return;
        }
        setActive(tabId);

        if (tabId === 'vote') loadVoteOptions();
        if (tabId === 'streamers') loadStreamerStatus();
      });
    });

    ensureValidActive();
  };

  const logout = () => {
    try { localStorage.removeItem('authToken'); } catch (e) { }
    try { localStorage.removeItem('userProfile'); } catch (e) { }
    window.location.href = '/';
  };

  const shouldLogoutForError = (err) => {
    const msg = String(err?.message || '').toLowerCase();
    if (err?.name === 'AbortError') return false;
    if (msg.includes('failed to fetch')) return false;
    if (msg.includes('networkerror')) return false;
    if (msg.includes('load failed')) return false;
    if (msg.includes('unauthorized')) return true;
    if (msg.includes('forbidden')) return true;
    if (msg.includes('401')) return true;
    if (msg.includes('403')) return true;
    if (msg.includes('invalid token')) return true;
    if (msg.includes('token expired')) return true;
    return false;
  };

  const bindLogout = () => {
    const btn = document.getElementById('btn-logout');
    if (!btn) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  };

  const waitForLayout = async () => {
    if (window.__layoutPromise && typeof window.__layoutPromise.then === 'function') {
      try { await window.__layoutPromise; } catch (e) { }
      return;
    }
    await new Promise(resolve => {
      let done = false;
      const finish = () => { if (done) return; done = true; resolve(); };
      document.addEventListener('layout:loaded', finish, { once: true });
      setTimeout(finish, 1500);
    });
  };

  (async () => {
    await waitForLayout();
    if (typeof window.renderHeaderAuthControls === 'function') {
      try { window.renderHeaderAuthControls(); } catch (e) { }
    }
    bindLogout();
    try { await renderSelectedServerNameWithRetry(); } catch (e) { }
  })();

  const loadAccountInfo = async () => {
    try {
      let profile;
      if (profileJustSetFromUrl) {
        profile = JSON.parse(localStorage.getItem('userProfile') || 'null');
        profileJustSetFromUrl = false;
      } else {
        profile = await apiFetch('/auth/profile');
      }

      localStorage.setItem('userProfile', JSON.stringify(profile));
      applyProfile(profile);
    } catch (e) {
      if (shouldLogoutForError(e)) {
        showToast('error', 'Session expired. Please login again.');
        logout();
        return;
      }
      showToast('error', 'Failed to refresh profile.');
    }
  };

  const urlProfile = decodeProfileFromUrl();
  if (token && urlProfile) {
    localStorage.setItem('authToken', token);
    localStorage.setItem('userProfile', JSON.stringify(urlProfile));
    if (urlProfile.serverType) localStorage.setItem('selectedServer', urlProfile.serverType);
    history.replaceState(null, document.title, window.location.pathname);
    profileJustSetFromUrl = true;
  }

  startClock();
  applyTranslationsSafe();
  renderSelectedServerNameWithRetry();
  bindLogout();
  bindTabSwitching();
  bindStreamerActions();
  bindWithdrawalModal();

  const authToken = localStorage.getItem('authToken');
  if (!authToken) {
    logout();
    return;
  }

  loadAccountInfo();
});