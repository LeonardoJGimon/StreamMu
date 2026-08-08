function formatRewardDisplay(details) {
    if (!details) return { text: 'REGALO: <b>RECOMPENSA ESPECIAL</b>', icon: 'fas fa-gift' };
    
    let obj = details;
    if (typeof details === 'string') {
        try { obj = JSON.parse(details); } catch(e) { obj = {}; }
    }

    let typeStr = (obj.reward_type || obj.currency || obj.type || obj.rewardType || '').toString().toLowerCase();
    let amount = obj.amount || obj.qty || obj.count || (obj.details ? obj.details.count : 1) || 1;

    if (typeStr.includes('wcoin') || typeStr.includes('w_coin')) {
        return { text: 'REGALO: <b>' + amount + ' WCOINS</b>', icon: 'fas fa-gem' };
    }
    if (typeStr.includes('goblin') || typeStr.includes('gp')) {
        return { text: 'REGALO: <b>' + amount + ' GOBLIN POINTS</b>', icon: 'fas fa-flask' };
    }
    if (typeStr.includes('zen')) {
        return { text: 'REGALO: <b>' + amount + ' ZEN</b>', icon: 'fas fa-coins' };
    }
    if (typeStr.includes('vip')) {
        return { text: 'REGALO: <b>VIP PREMIUM (' + amount + ' DÍAS)</b>', icon: 'fas fa-crown' };
    }

    let itemName = obj.itemName || obj.name || (obj.details ? (obj.details.itemName || obj.details.name) : null);
    if (itemName && (itemName.toLowerCase() === 'item_vault' || itemName.toLowerCase() === 'ítem baúl')) {
        itemName = null;
    }

    let unitStr = amount === 1 ? '1 UNIDAD' : amount + ' UNIDADES';

    if (itemName) {
        let nameUpper = itemName.toUpperCase();
        let iconClass = 'fas fa-box-open';
        if (nameUpper.includes('RING') || nameUpper.includes('ANILLO')) iconClass = 'fas fa-ring';
        else if (nameUpper.includes('WING') || nameUpper.includes('ALAS')) iconClass = 'fas fa-feather-pointed';
        else if (nameUpper.includes('JEWEL') || nameUpper.includes('JOYA')) iconClass = 'fas fa-gem';
        else if (nameUpper.includes('PET') || nameUpper.includes('PANDA')) iconClass = 'fas fa-paw';
        return { text: 'REGALO: <b>' + nameUpper + ' (' + unitStr + ')</b>', icon: iconClass };
    }

    return { text: 'REGALO: <b>ÍTEM ESPECIAL (' + unitStr + ')</b>', icon: 'fas fa-box-open' };
}

const tests = [
  { code: 'HAPPY', json: '{"reward_type":"wcoins","amount":100}' },
  { code: 'GAMING', json: '{"reward_type":"wcoins","amount":100}' },
  { code: 'STREAM-DAR-4OSH0', json: '{"currency":"wcoins","amount":5}' },
  { code: 'HOLA', json: '{"type":"item_vault","name":"Panda Ring","itemName":"Panda Ring"}' },
  { code: 'RELAJADO', json: '{"type":"item_vault","name":"","itemName":""}' }
];

tests.forEach(t => {
    console.log(t.code, '->', formatRewardDisplay(t.json));
});
