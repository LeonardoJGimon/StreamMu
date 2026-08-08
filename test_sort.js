function formatRewardInfo(details) {
    if (!details) return { text: 'REGALO: <b>RECOMPENSA ESPECIAL</b>' };
    let obj = typeof details === 'string' ? JSON.parse(details) : details;
    
    let rawItemName = obj.itemName || obj.name || (obj.details ? (obj.details.itemName || obj.details.name) : null);
    if (rawItemName && (rawItemName.toLowerCase() === 'item_vault' || rawItemName.toLowerCase() === 'ítem baúl')) {
        rawItemName = null;
    }
    
    let count = obj.count || obj.qty || obj.amount || (obj.details ? obj.details.count : 1) || 1;
    let unitStr = count === 1 ? '1 UNIDAD' : count + ' UNIDADES';
    
    if (rawItemName) {
        let nameUpper = rawItemName.toUpperCase();
        return { text: 'REGALO: <b>' + nameUpper + ' (' + unitStr + ')</b>' };
    }
    if (obj.currency || obj.type) {
        let curr = (obj.currency || obj.type).toUpperCase();
        let amt = obj.amount || obj.qty || count || 1;
        let amtStr = (curr.includes('WCOIN') || curr.includes('GP') || curr.includes('ZEN')) ? (amt + ' ' + curr) : (amt === 1 ? '1 UNIDAD' : amt + ' UNIDADES');
        return { text: 'REGALO: <b>' + curr + ' (' + amtStr + ')</b>' };
    }
    return { text: 'REGALO: <b>RECOMPENSA ESPECIAL (' + unitStr + ')</b>' };
}

const sample1 = '{"type":"item_vault","name":"Panda Ring","itemName":"Panda Ring","details":{"ItemType":13,"ItemIndex":76,"count":1}}';
const sample2 = '{"type":"item_vault","name":"Jewel of Bless","itemName":"Jewel of Bless","details":{"count":10}}';
const sample3 = '{"currency":"wcoins","amount":500}';

console.log('Sample 1 (Panda Ring):', formatRewardInfo(sample1));
console.log('Sample 2 (10 Jewels):', formatRewardInfo(sample2));
console.log('Sample 3 (WCoins):', formatRewardInfo(sample3));
