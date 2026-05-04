
async function testSort() {
    const ep = '/top-ranking-characters';
    const params = [
        'serverType=server1&sort=latest',
        'serverType=server1&orderBy=RegDate',
        'serverType=server1&orderBy=id&order=desc',
        'serverType=server1&limit=1'
    ];
    for (const p of params) {
        try {
            const res = await fetch(`http://localhost${ep}?${p}`);
            console.log(`Param ${p}: ${res.status}`);
            if (res.ok) {
                const data = await res.json();
                console.log(JSON.stringify(data).slice(0, 100));
            }
        } catch (e) {
            console.log(`Param ${p}: Error ${e.message}`);
        }
    }
}
testSort();
