const path = require('path');
const fs = require('fs');

// Ensure node_modules from the local Node directory are found
module.paths.push(path.join('c:', 'Users', 'LeonardoGimon', 'Downloads', 'AnyServer', 'Node', 'node_modules'));

const mssql = require('mssql');

async function updateStats() {
    let dbConfig;
    try {
        const configPath = path.join(__dirname, '..', '..', 'database.json');
        dbConfig = JSON.parse(fs.readFileSync(configPath, 'utf8')).dbConfig.server1;
    } catch (e) {
        console.error('Error loading database.json:', e.message);
        return;
    }

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
        
        // Latest 10 Users
        const resUsers = await mssql.query`SELECT TOP 10 memb___id, appl_days FROM MEMB_INFO ORDER BY memb_guid DESC`;
        const latestUsers = resUsers.recordset.map(u => ({
            name: u.memb___id,
            date: u.appl_days
        }));

        // Query 1: Latest 10 Creations (By Date)
        const resRecent = await mssql.query`SELECT TOP 10 Name, Class, MDate, cLevel, ResetCount FROM Character WHERE CtlCode = 0 ORDER BY MDate DESC`;
        const offsetMs = new Date().getTimezoneOffset() * 60000;
        
        const recentCharacters = resRecent.recordset.map(c => ({
            name: c.Name,
            classId: c.Class,
            level: c.cLevel,
            resets: c.ResetCount,
            date: new Date(c.MDate.getTime() + offsetMs).toISOString()
        }));
 
        // Query 2: Top 10 Strength (By Resets and Level) - FOR HALL OF FAME
        const resTop = await mssql.query`SELECT TOP 10 Name, Class, MDate, cLevel, ResetCount FROM Character WHERE CtlCode = 0 ORDER BY ResetCount DESC, cLevel DESC`;
        const topStrengthCharacters = resTop.recordset.map(c => ({
            name: c.Name,
            classId: c.Class,
            level: c.cLevel,
            resets: c.ResetCount,
            date: new Date(c.MDate.getTime() + offsetMs).toISOString()
        }));

        const stats = {
            latestUser: latestUsers[0]?.name || '-',
            latestCharacter: recentCharacters[0] || { name: '-', classId: 0, level: 0, resets: 0 },
            recentUsers: latestUsers,
            recentCharacters: recentCharacters,
            topStrengthCharacters: topStrengthCharacters,
            timestamp: new Date().toISOString()
        };

        fs.writeFileSync(path.join(__dirname, 'latest-stats.json'), JSON.stringify(stats, null, 2));
        console.log(`[${new Date().toLocaleTimeString()}] Stats updated (Creations & Ranking split)`);

    } catch (err) {
        console.error('Database Error:', err.message);
    } finally {
        await mssql.close();
    }
}

updateStats();
setInterval(updateStats, 60000);
