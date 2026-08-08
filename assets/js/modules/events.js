/**
 * Events & Timers Module
 * Handles event countdowns and active event timers
 */

const __eventsScheduleCache = new Map();

async function loadEventsSchedule(serverKey) {
    const key = String(serverKey || '').trim();
    const cacheKey = key || '__default__';
    if (__eventsScheduleCache.has(cacheKey)) return __eventsScheduleCache.get(cacheKey);

    const p = (async () => {
        if (key) {
            const perServer = await window.fetchJsonNoStore(`assets/json/${encodeURIComponent(key)}/events-schedule.json`);
            if (perServer && typeof perServer === 'object') return perServer.content && typeof perServer.content === 'object' ? perServer.content : perServer;
        }
        const globalCfg = await window.fetchJsonNoStore('assets/json/events-schedule.json');
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

async function initActiveEventsCountdown() {
    const timerEls = Array.from(document.querySelectorAll('.event-timer[data-event-key]'));
    if (!timerEls.length) return;

    const selectedServer = (localStorage.getItem('selectedServer') || '').toString().trim();
    const scheduleRaw = await loadEventsSchedule(selectedServer);
    const schedule = (scheduleRaw && typeof scheduleRaw === 'object' && scheduleRaw.content && typeof scheduleRaw.content === 'object')
        ? scheduleRaw.content
        : scheduleRaw;
    if (!schedule || typeof schedule !== 'object') return;

    const cfg = (schedule.events && typeof schedule.events === 'object')
        ? schedule
        : ((selectedServer && schedule[selectedServer]) ? schedule[selectedServer] : schedule.default);

    if (!cfg || typeof cfg !== 'object') return;
    const events = cfg.events || {};
    if (!events || typeof events !== 'object') return;

    const update = () => {
        const nowUtcMs = Date.now();
        timerEls.forEach(el => {
            const key = (el.getAttribute('data-event-key') || '').toString().trim();
            const info = events[key];
            const valueEl = el.querySelector('.event-timer__value');
            if (!valueEl) return;
            if (!info) {
                valueEl.textContent = '--:--:--';
                return;
            }

            const diff = nowUtcMs;
            valueEl.textContent = formatCountdown(diff);
        });
    };

    update();
    setInterval(update, 1000);
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
                timer.innerHTML = `<div style="color:#00ff41; font-weight:bold;">${window.t('server.live_now', 'SERVER LIVE NOW!')}</div>`;
                return;
            }
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            if(timer.querySelector('.days')) timer.querySelector('.days').innerText = String(days).padStart(2, '0');
            if(timer.querySelector('.hours')) timer.querySelector('.hours').innerText = String(hours).padStart(2, '0');
            if(timer.querySelector('.minutes')) timer.querySelector('.minutes').innerText = String(minutes).padStart(2, '0');
            if(timer.querySelector('.seconds')) timer.querySelector('.seconds').innerText = String(seconds).padStart(2, '0');
        };

        setInterval(updateTimer, 1000);
        updateTimer();
    });
}

// Export
window.EventsModule = {
    loadEventsSchedule,
    parseHHMM,
    dayOfWeekLabel,
    formatCountdown,
    getNextWeeklyOccurrence,
    initActiveEventsCountdown,
    initCountdownTimers
};
