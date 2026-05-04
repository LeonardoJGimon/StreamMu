
const mssql = require('mssql');
const fs = require('fs');
const path = require('path');

async function check() {
    // Correcting path to database.json which is in ../../database.json from public/
    const dbConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'database.json'), 'utf8')).dbConfig.server1;
    const config = {
        user: dbConfig.user,
        password: dbConfig.password,
        server: dbConfig.server,
        database: 'MuOnline',
        port: Number(dbConfig.port),
        options: {
            encrypt: false,
            trustServerCertificate: true
        }
    };

    try {
        await mssql.connect(config);
        console.log('Connected');
        
        const resCols = await mssql.query`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Character'`;
        console.log('Columns in Character:', resCols.recordset.map(c => c.COLUMN_NAME));

        const resColsUser = await mssql.query`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MEMB_INFO'`;
        console.log('Columns in MEMB_INFO:', resColsUser.recordset.map(c => c.COLUMN_NAME));

    } catch (err) {
        console.error(err);
    } finally {
        await mssql.close();
    }
}
check();
