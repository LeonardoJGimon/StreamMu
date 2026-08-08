const path = require('path');
module.paths.push('C:/Users/LeonardoGimon/Downloads/AnyServer/Node/node_modules');
const handler = require('./api/promos.js');

const req = { method: 'GET' };
const res = {
    setHeader: () => {},
    status: (code) => ({
        json: (data) => console.log('Status:', code, JSON.stringify(data, null, 2)),
        end: () => {}
    })
};

handler(req, res);
