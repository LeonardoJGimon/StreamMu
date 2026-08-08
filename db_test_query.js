
const mssql = require('mssql');
const fs = require('fs');
const path = require('path');

async function testQuery() {
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
        
        const resUser = await mssql.query`SELECT TOP 1 memb___id, appl_days FROM MEMB_INFO ORDER BY memb_guid DESC`;
        console.log('Latest User:', resUser.recordset[0]);

        const resChar = await mssql.query`SELECT TOP 1 Name, Class, MDate FROM Character ORDER BY MDate DESC`;
        console.log('Latest Char (MDate):', resChar.recordset[0]);

    } catch (err) {
        console.error(err);
    } finally {
        await mssql.close();
    }
}
testQuery();
