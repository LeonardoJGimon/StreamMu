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
        
        // Time Sync
        const resTime = await mssql.query`SELECT GETDATE() as dbTime`;
        const dbTime = resTime.recordset[0].dbTime;

        // Online Count
        const resOnline = await mssql.query`SELECT COUNT(*) as onlineCount FROM MEMB_STAT WHERE ConnectStat = 1`;
        const onlineCount = resOnline.recordset[0].onlineCount || 0;
        const resUsers = await mssql.query`SELECT TOP 10 memb___id, appl_days FROM MEMB_INFO ORDER BY memb_guid DESC`;
        const latestUsers = resUsers.recordset.map(u => ({
            name: u.memb___id,
            date: u.appl_days
        }));

        // Latest 10 Creations
        const resRecent = await mssql.query`SELECT TOP 10 Name, Class, MDate, cLevel, ResetCount FROM Character WHERE CtlCode = 0 ORDER BY MDate DESC`;
        const recentCharacters = resRecent.recordset.map(c => ({
            name: c.Name,
            classId: c.Class,
            level: c.cLevel,
            resets: c.ResetCount,
            date: c.MDate // Enviamos la fecha original para que el cliente la procese
        }));

        // Top 10 Strength
        const resTop = await mssql.query`SELECT TOP 3 Name, Class, MDate, cLevel, ResetCount FROM Character WHERE CtlCode = 0 ORDER BY ResetCount DESC, cLevel DESC`;
        const topStrengthCharacters = resTop.recordset.map(c => ({
            name: c.Name,
            classId: c.Class,
            level: c.cLevel,
            resets: c.ResetCount,
            date: c.MDate
        }));

        // Top 1 Guild (Basado en Resets de sus miembros)
        const resGuild = await mssql.query`
            SELECT TOP 1 g.G_Name, g.G_Master, g.G_Mark, SUM(c.ResetCount) as G_Score
            FROM Guild g
            JOIN GuildMember gm ON g.G_Name = gm.G_Name
            JOIN Character c ON gm.Name = c.Name
            GROUP BY g.G_Name, g.G_Master, g.G_Mark
            ORDER BY G_Score DESC
        `;
        const rawGuild = resGuild.recordset[0] || { G_Name: 'Ninguno', G_Master: '-', G_Score: 0, G_Mark: null };
        
        // Convertir G_Mark (Binary) a Hex string para el frontend
        const topGuild = {
            G_Name: rawGuild.G_Name,
            G_Master: rawGuild.G_Master,
            G_Score: rawGuild.G_Score,
            G_Mark: rawGuild.G_Mark ? rawGuild.G_Mark.toString('hex') : null
        };

        // Top 1 PvP
        const resPvP = await mssql.query`SELECT TOP 1 Name, Class, PkCount FROM Character WHERE CtlCode = 0 ORDER BY PkCount DESC`;
        const topPvP = resPvP.recordset[0] || { Name: 'Ninguno', Class: 0, PkCount: 0 };

        const stats = {
            onlineCount: onlineCount,
            latestUser: latestUsers[0]?.name || '-',
            latestCharacter: recentCharacters[0] || { name: '-', classId: 0, level: 0, resets: 0 },
            recentUsers: latestUsers.slice(0, 3),
            recentCharacters: recentCharacters.slice(0, 3),
            topStrengthCharacters: topStrengthCharacters,
            topGuild: topGuild,
            topPvP: topPvP,
            timestamp: dbTime.toISOString()
        };

        res.status(200).json(stats);

    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        await mssql.close();
    }
};
