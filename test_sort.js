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
        const r = await mssql.query('SELECT TOP 5 Code, MaxUses, CurrentUses, RewardDetails, IsActive, CreatedAt FROM Dash_PromoCodes WHERE IsActive = 1 ORDER BY CreatedAt DESC');
        console.log('Active Promo Codes in DB:', r.recordset);
    } catch(e) { console.error('Error:', e.message); }
    finally { await mssql.close(); }
}
test();
