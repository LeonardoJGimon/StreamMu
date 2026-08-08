const mssql = require('mssql');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { name } = req.query;
    if (!name) {
        res.status(400).json({ error: 'Name parameter is required' });
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
        
        const resPlayer = await mssql.query`
            SELECT TOP 1 c.Name, c.cLevel, c.ResetCount, c.Class, g.G_Name, g.G_Mark
            FROM Character c
            LEFT JOIN GuildMember gm ON c.Name = gm.Name
            LEFT JOIN Guild g ON gm.G_Name = g.G_Name
            WHERE c.Name = ${name}
        `;

        if (resPlayer.recordset.length === 0) {
            res.status(404).json({ error: 'Player not found' });
            return;
        }

        const p = resPlayer.recordset[0];
        const playerData = {
            name: p.Name.trim(),
            level: p.cLevel,
            resets: p.ResetCount,
            classId: p.Class,
            guildName: p.G_Name ? p.G_Name.trim() : 'Ninguno',
            guildMark: p.G_Mark ? p.G_Mark.toString('hex') : null
        };

        res.status(200).json(playerData);

    } catch (err) {
        res.status(500).json({ error: err.message });
    } finally {
        await mssql.close();
    }
};
