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
        database: 'MuOnline',
        port: Number(dbConfig.port),
        options: { encrypt: false, trustServerCertificate: true }
    };
    try {
        await mssql.connect(config);
        const r1 = await mssql.query('SELECT ConnectStat, COUNT(*) as qty FROM MEMB_STAT GROUP BY ConnectStat');
        console.log('MEMB_STAT breakdown:', r1.recordset);
        
        const r2 = await mssql.query('SELECT TOP 5 memb___id, ConnectStat, ServerName, ConnectTM, DisConnectTM FROM MEMB_STAT ORDER BY ConnectTM DESC');
        console.log('Latest connected accounts:', r2.recordset);
    } catch(e) { console.error('Error:', e.message); }
    finally { await mssql.close(); }
}
test();
