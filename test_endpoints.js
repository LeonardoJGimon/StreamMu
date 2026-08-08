
async function testEndpoints() {
    const endpoints = [
        '/latest-registrations',
        '/latest-characters',
        '/stats/latest-characters',
        '/ranking/latest-characters',
        '/auth/latest-users',
        '/stats/total-accounts',
        '/stats/total-characters',
        '/ranking/latest-registrations',
        '/latest-users',
        '/latest-account'
    ];

    const results = {};
    for (const endpoint of endpoints) {
        try {
            const response = await fetch(`http://localhost${endpoint}?serverType=server1`);
            results[endpoint] = {
                status: response.status,
                ok: response.ok,
                data: response.ok ? await response.json() : null
            };
        } catch (e) {
            results[endpoint] = { error: e.message };
        }
    }
    console.log(JSON.stringify(results, null, 2));
}

testEndpoints();
