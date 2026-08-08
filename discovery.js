
async function discovery() {
    const endpoints = [
        '/top-ranking-characters',
        '/top-ranking-guilds',
        '/top-ranking-killers',
        '/top-ranking-pvp',
        '/top-ranking-votes',
        '/latest-registrations',
        '/latest-characters',
        '/latest-users'
    ];
    const serverType = 'server1';
    for (const ep of endpoints) {
        try {
            const res = await fetch(`http://localhost${ep}?serverType=${serverType}`);
            console.log(`Endpoint ${ep}: ${res.status} ${res.ok}`);
            if (res.ok) {
                const text = await res.text();
                if (text.startsWith('{') || text.startsWith('[')) {
                    console.log(text.slice(0, 100));
                } else {
                    console.log('Returned HTML/Text (not JSON)');
                }
            }
        } catch (e) {
            console.log(`Endpoint ${ep}: Error ${e.message}`);
        }
    }
}
discovery();
