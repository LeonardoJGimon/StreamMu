
const fs = require('fs');
const path = require('path');

const statsPath = path.join(__dirname, 'latest-stats.json');
let stats;
try {
    stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
} catch (e) {
    stats = { latestUser: "None", latestCharacter: { name: "None", classId: 0 } };
}

const type = process.argv[2] || 'user'; // 'user' or 'character'

if (type === 'character') {
    stats.latestCharacter.name = "HeroeTest_" + Math.floor(Math.random() * 1000);
    console.log("Simulando NUEVO PERSONAJE: " + stats.latestCharacter.name);
} else {
    stats.latestUser = "UserTest_" + Math.floor(Math.random() * 1000);
    console.log("Simulando NUEVO USUARIO: " + stats.latestUser);
}

stats.timestamp = new Date().toISOString();
fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
