const path = require('path');
module.paths.push('C:/Users/LeonardoGimon/Downloads/AnyServer/Node/node_modules');
const mssql = require('mssql');
const fs = require('fs');

async function test() {
    const configPath = 'C:/Users/LeonardoGimon/Downloads/AnyServer/database.json';
    const dbConfig = JSON.parse(fs.readFileSync(configPath, 'utf8')).dbConfig.server1;
    const config = {
        user: dbConfig.user,
        password: dbConfig.password,
        server: dbConfig.server,
        database: 'DashDB',
        port: Number(dbConfig.port),
        options: { encrypt: false, trustServerCertificate: true }
    };
    try {
        await mssql.connect(config);
        console.log('--- TABLES IN DashDB ---');
        const r1 = await mssql.query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'");
        console.log(r1.recordset.map(t => t.TABLE_NAME));
        
        for (const t of r1.recordset) {
            const name = t.TABLE_NAME;
            if (name.toLowerCase().includes('promo') || name.toLowerCase().includes('code') || name.toLowerCase().includes('gift') || name.toLowerCase().includes('coupon') || name.toLowerCase().includes('redeem')) {
                console.log('=== TABLE:', name);
                const cols = await mssql.query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='" + name + "'");
                console.log(cols.recordset);
                const rows = await mssql.query("SELECT TOP 5 * FROM " + name);
                console.log('Sample rows:', rows.recordset);
            }
        }
    } catch(e) { console.error('DashDB Error:', e.message); }
    finally { await mssql.close(); }
}
test();
