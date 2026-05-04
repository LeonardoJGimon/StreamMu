const mssql = require('mssql');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const config = {
        user: process.env.DB_USER || 'sa',
        password: process.env.DB_PASSWORD,
        server: process.env.DB_SERVER || 'vps-6eed550e.vps.ovh.ca',
        database: process.env.DB_NAME || 'MuOnline',
        port: parseInt(process.env.DB_PORT) || 1433,
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

        // Latest 10 Creations
        const resRecent = await mssql.query`SELECT TOP 10 Name, Class, MDate, cLevel, ResetCount FROM Character ORDER BY MDate DESC`;
        const offsetMs = new Date().getTimezoneOffset() * 60000;
        
        const recentCharacters = resRecent.recordset.map(c => ({
            name: c.Name,
            classId: c.Class,
            level: c.cLevel,
            resets: c.ResetCount,
            date: new Date(c.MDate.getTime() + offsetMs).toISOString()
        }));

        // Top 10 Strength
        const resTop = await mssql.query`SELECT TOP 10 Name, Class, MDate, cLevel, ResetCount FROM Character ORDER BY ResetCount DESC, cLevel DESC`;
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

        res.status(200).json(stats);

    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        await mssql.close();
    }
};
