let mssql;
try {
    mssql = require('mssql');
} catch (e) {
    mssql = require('C:/Users/LeonardoGimon/Downloads/AnyServer/Node/node_modules/mssql');
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const config = {
        user: process.env.DB_USER || 'sa',
        password: process.env.DB_PASSWORD || 'X120513678@',
        server: process.env.DB_SERVER || 'vps-6eed550e.vps.ovh.ca',
        database: 'DashDB',
        port: parseInt(process.env.DB_PORT) || 1433,
        options: {
            encrypt: false,
            trustServerCertificate: true
        }
    };

    try {
        await mssql.connect(config);
        const query = `
            SELECT TOP 5 Code, MaxUses, CurrentUses, RewardDetails, ExpiresAt, CreatedAt 
            FROM Dash_PromoCodes 
            WHERE IsActive = 1 
              AND (MaxUses = 0 OR CurrentUses < MaxUses)
              AND (ExpiresAt IS NULL OR ExpiresAt > GETDATE())
            ORDER BY CreatedAt DESC
        `;
        const result = await mssql.query(query);
        res.status(200).json({
            success: true,
            promos: result.recordset || [],
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error("SQL Error promos:", err);
        res.status(500).json({ success: false, error: err.message, promos: [] });
    } finally {
        await mssql.close();
    }
};
