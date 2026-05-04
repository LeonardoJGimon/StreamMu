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
    const serverTime = getServerTime();
    const localTime = new Date();

    if (serverDisplayEl) {
        serverDisplayEl.textContent = formatTimeDisplay(serverTime);
    } else if (serverSpanEl) {
        serverSpanEl.textContent = formatTimeDisplay(serverTime, true);
    }

    if (localEl) {
        localEl.textContent = formatTimeDisplay(localTime);
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

    const rawType = (event && event.type ? String(event.type) : '').toLowerCase();
    if (rawType === 'inv' || rawType === 'invasion') return 'Drops de invasi\u00f3n';

    return 'Loot del evento';
}

function getEventThemeClass(event) {
    const mode = getEventDisplayType(event);
    if (mode === 'PVP') return 'event-theme--pvp';

    const rawType = (event && event.type ? String(event.type) : '').toLowerCase();
    if (rawType === 'inv' || rawType === 'invasion') return 'event-theme--invasion';

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

    if (title.includes('castle siege')) return '/assets/images/home/Castle%20Siege.png';
    if (title.includes('arka')) return '/assets/images/home/arka%20war.png';
    if (title.includes('ice') || title.includes('wind')) return '/assets/images/home/ICEWINDCASTLE.png';

    if (title.includes('chaos castle')) return '/assets/images/home/home2.png';
    if (title.includes('blood castle')) return '/assets/images/home/home.png';
    if (title.includes('devil square')) return '/assets/images/home/Lorencia.png';

    if (title.includes('medusa')) return '/assets/images/home/home2.png';
    if (title.includes('red dragon') || title.includes('dragon')) return '/assets/images/home/Lorencia.png';
    if (title.includes('skeleton')) return '/assets/images/home/noria.png';
    if (title.includes('golden')) return '/assets/images/home/promo.png';

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
    return uniq.slice(0, 3).map(d => t(`days.${dayKeys[d]}`)).join(' \u2022 ');
}

function formatEventScheduleTimes(times) {
    if (!Array.isArray(times) || !times.length) return '--:--';
    const cleaned = times
        .map(v => (v == null ? '' : String(v).trim()))
        .filter(v => /^\d{1,2}:\d{2}$/.test(v));
    if (!cleaned.length) return '--:--';
    return cleaned.slice(0, 3).join(' \u2022 ');
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
                <div class="event-card__bg" style="background:${getEventCardBackground(event)}"></div>
                <div class="event-card__name">${escapeHtml(event.title)}</div>
                <div class="event-card__date">
                    <i class="fas fa-clock"></i>
                    <span>${escapeHtml(localTimeStr)} \u00b7 ${escapeHtml(dayLabel)}</span>
                </div>
                <div class="event-card__reward">
                    <span class="event-card__reward-label">Recompensa</span>
                    <span class="event-card__reward-value">${escapeHtml(rewardLabel)}</span>
                </div>
                <div class="event-card__countdown">
                    ${isActive
                        ? `<span class="event-card__countdown-live">\u2713 ${t('events.active')}</span>`
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
            const topDays = formatEventDays(topEvent.days) || '\u2014';
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
    
    // Inject skeleton loaders immediately if waiting
    const gridContainer = document.getElementById('upcoming-events-grid');
    const highlightHost = document.getElementById('upcoming-events-highlight');

    if (gridContainer && gridContainer.innerHTML.trim() === '') {
        gridContainer.innerHTML = `
            <div class="skeleton" style="min-width: 320px; height: 160px; border-radius: 12px; margin-right: 20px;"></div>
            <div class="skeleton" style="min-width: 320px; height: 160px; border-radius: 12px; margin-right: 20px;"></div>
            <div class="skeleton" style="min-width: 320px; height: 160px; border-radius: 12px; margin-right: 20px;"></div>
        `;
    }
    
    if (highlightHost && highlightHost.innerHTML.trim() === '') {
        highlightHost.innerHTML = `
            <div class="skeleton" style="width: 100%; height: 260px; border-radius: 16px;"></div>
        `;
    }

    // Wait for PUBLIC_INFO to be loaded
    if (!window.PUBLIC_INFO || !window.PUBLIC_INFO.upcomingEvents || !Array.isArray(window.PUBLIC_INFO.upcomingEvents)) {
        setTimeout(initUpcomingEvents, 500);
        return;
    }

    try {
        renderUpcomingEvents();
    } catch (err) {
        console.error('Error rendering upcoming events:', err);
    }
}

// Call on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initUpcomingEvents();
    });
} else {
    initUpcomingEvents();
}
