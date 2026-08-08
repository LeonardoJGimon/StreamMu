/**
 * Discord Widget Module
 * Handles Discord integration and member display
 */

async function updateDiscordWidget() {
    const guildId = (window.PUBLIC_INFO?.discordGuildId || '').toString().trim();
    const countElement = document.getElementById('discord-online-count');
    const avatarContainer = document.querySelector('.DiscordBlock_avatars__xCgl_');
    if (!countElement) return;

    if (!guildId) {
        countElement.innerText = 'N/A';
        return;
    }

    try {
        const response = await fetch(`https://discord.com/api/guilds/${guildId}/widget.json`);
        if (!response.ok) throw new Error('Discord widget not available');

        const data = await response.json();
        if (data.presence_count) {
            countElement.innerText = `${data.presence_count} MEMBERS`;
            countElement.style.color = '#43b581';
        } else {
            countElement.innerText = 'ONLINE';
        }

        if (avatarContainer && data.members) {
            const membersToShow = data.members.slice(0, 15);
            avatarContainer.innerHTML = membersToShow.map(member => `
                <div class="DiscordBlock_avatar__l1wf_" style="background-image: url('${member.avatar_url}');" title="${String(member.username || '').replace(/"/g, '&quot;')}"></div>
            `).join('');
        }
    } catch (error) {
        if (window.AppLogger) {
            window.AppLogger.warn('Discord widget fetch failed', { error: error.message });
        }
        countElement.innerText = 'N/A';
    }
}

// Export
window.DiscordModule = {
    updateDiscordWidget
};
