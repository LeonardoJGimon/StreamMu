const fs = require('fs');

const itemMap = {};

function add(cat, idx, name) {
    itemMap[cat + '_' + idx] = name;
    const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    itemMap['name_' + clean] = { category: cat, index: idx, name: name };
}

// Group 0: Swords
add(0, 0, 'Kris'); add(0, 1, 'Short Sword'); add(0, 2, 'Rapier'); add(0, 3, 'Katana'); add(0, 4, 'Sword of Assassin');
add(0, 5, 'Blade'); add(0, 6, 'Gladius'); add(0, 7, 'Falchion'); add(0, 8, 'Serpent Sword'); add(0, 9, 'Sword of Salamander');
add(0, 10, 'Light Saber'); add(0, 11, 'Legendary Sword'); add(0, 12, 'Heliacal Sword'); add(0, 13, 'Double Blade');
add(0, 14, 'Lighting Sword'); add(0, 15, 'Giant Sword'); add(0, 16, 'Sword of Destruction'); add(0, 17, 'Dark Breaker');
add(0, 18, 'Thunder Blade'); add(0, 19, 'Divine Sword of Archangel'); add(0, 20, 'Knight Blade'); add(0, 21, 'Dark Reign Blade');
add(0, 22, 'Bone Blade'); add(0, 23, 'Explosion Blade'); add(0, 24, 'Daybreak'); add(0, 25, 'Sword Dancer');
add(0, 26, 'Flameberge'); add(0, 27, 'Sword Breaker'); add(0, 28, 'Rune Bastard Sword'); add(0, 31, 'Rune Blade');

// Group 1: Axes
add(1, 0, 'Small Axe'); add(1, 1, 'Hand Axe'); add(1, 2, 'Double Axe'); add(1, 3, 'Tomahawk'); add(1, 4, 'Elven Axe');
add(1, 5, 'Battle Axe'); add(1, 6, 'Nikea Axe'); add(1, 7, 'Larkan Axe'); add(1, 8, 'Crescent Axe');

// Group 2: Maces & Scepters
add(2, 0, 'Mace'); add(2, 1, 'Morning Star'); add(2, 2, 'Flail'); add(2, 3, 'Great Hammer'); add(2, 4, 'Crystal Morning Star');
add(2, 5, 'Crystal Sword'); add(2, 6, 'Chaos Dragon Axe'); add(2, 7, 'Elemental Mace'); add(2, 8, 'Battle Scepter');
add(2, 9, 'Master Scepter'); add(2, 10, 'Great Scepter'); add(2, 11, 'Lord Scepter'); add(2, 12, 'Great Lord Scepter');
add(2, 13, 'Divine Scepter of Archangel'); add(2, 14, 'Soleil Scepter'); add(2, 15, 'Shining Scepter'); add(2, 16, 'Frost Mace');

// Group 3: Spears
add(3, 0, 'Light Spear'); add(3, 1, 'Spear'); add(3, 2, 'Dragon Lance'); add(3, 3, 'Giant Trident'); add(3, 4, 'Serpent Spear');
add(3, 5, 'Double Poleaxe'); add(3, 6, 'Halberd'); add(3, 7, 'Berdysh'); add(3, 8, 'Great Scythe'); add(3, 9, 'Bill of Balrog');
add(3, 10, 'Dragon Spear'); add(3, 11, 'Brova');

// Group 4: Bows & Crossbows
add(4, 0, 'Short Bow'); add(4, 1, 'Bow'); add(4, 2, 'Elven Bow'); add(4, 3, 'Battle Bow'); add(4, 4, 'Tiger Bow');
add(4, 5, 'Silver Bow'); add(4, 6, 'Chaos Nature Bow'); add(4, 8, 'Crossbow'); add(4, 9, 'Golden Crossbow');
add(4, 10, 'Arquebus'); add(4, 11, 'Light Crossbow'); add(4, 12, 'Serpent Crossbow'); add(4, 13, 'Bluewing Crossbow');
add(4, 14, 'Aquagold Crossbow'); add(4, 16, 'Saint Crossbow'); add(4, 17, 'Celestial Bow'); add(4, 18, 'Divine Crossbow of Archangel');
add(4, 19, 'Great Reign Crossbow'); add(4, 20, 'Arrow Viper Bow'); add(4, 21, 'Sylph Wind Bow'); add(4, 22, 'Albatross Bow');
add(4, 23, 'Dark Stinger'); add(4, 24, 'Aileen Bow');

// Group 5: Staves & Sticks
add(5, 0, 'Skull Staff'); add(5, 1, 'Angelic Staff'); add(5, 2, 'Serpent Staff'); add(5, 3, 'Thunder Staff');
add(5, 4, 'Gorgon Staff'); add(5, 5, 'Legendary Staff'); add(5, 6, 'Staff of Resurrection'); add(5, 7, 'Chaos Lighting Staff');
add(5, 8, 'Staff of Destruction'); add(5, 9, 'Dragon Soul Staff'); add(5, 10, 'Divine Staff of Archangel');
add(5, 11, 'Staff of Kundun'); add(5, 12, 'Grand Viper Staff'); add(5, 13, 'Platina Staff'); add(5, 14, 'Mystery Stick');
add(5, 15, 'Violent Wind Stick'); add(5, 16, 'Red Wing Stick'); add(5, 17, 'Ancient Stick'); add(5, 18, 'Demonic Stick');
add(5, 19, 'Storm Blitz Stick'); add(5, 20, 'Eternal Wing Stick');

// Group 6: Shields
add(6, 0, 'Small Shield'); add(6, 1, 'Horn Shield'); add(6, 2, 'Kite Shield'); add(6, 3, 'Elven Shield');
add(6, 4, 'Buckler'); add(6, 5, 'Dragon Slayer Shield'); add(6, 6, 'Skull Shield'); add(6, 7, 'Spiked Shield');
add(6, 8, 'Tower Shield'); add(6, 9, 'Plate Shield'); add(6, 10, 'Large Round Shield'); add(6, 11, 'Serpent Shield');
add(6, 12, 'Bronze Shield'); add(6, 13, 'Dragon Shield'); add(6, 14, 'Legendary Shield'); add(6, 15, 'Grand Soul Shield');

// Group 12: Wings & Jewels
add(12, 0, 'Wings of Elf'); add(12, 1, 'Wings of Heaven'); add(12, 2, 'Wings of Satan'); add(12, 3, 'Wings of Spirit');
add(12, 4, 'Wings of Soul'); add(12, 5, 'Wings of Dragon'); add(12, 6, 'Wings of Darkness'); add(12, 15, 'Jewel of Chaos');
add(12, 30, 'Bundle of Jewel of Bless'); add(12, 31, 'Bundle of Jewel of Soul'); add(12, 36, 'Wings of Storm');
add(12, 37, 'Wings of Eternal'); add(12, 38, 'Wings of Illusion'); add(12, 39, 'Wings of Ruin'); add(12, 40, 'Cape of Emperor');
add(12, 41, 'Wings of Curse'); add(12, 42, 'Wings of Despair'); add(12, 43, 'Wings of Dimension');

// Group 13: Rings & Pets & Amulets
add(13, 0, 'Guardian Angel'); add(13, 1, 'Imp'); add(13, 2, 'Horn of Uniria'); add(13, 3, 'Horn of Dinorant');
add(13, 8, 'Ring of Ice'); add(13, 9, 'Ring of Poison'); add(13, 10, 'Transformation Ring'); add(13, 12, 'Pendant of Lighting');
add(13, 13, 'Pendant of Fire'); add(13, 21, 'Ring of Fire'); add(13, 22, 'Ring of Earth'); add(13, 23, 'Ring of Wind');
add(13, 25, 'Pendant of Ice'); add(13, 26, 'Pendant of Wind'); add(13, 27, 'Pendant of Water'); add(13, 37, 'Horn of Fenrir');
add(13, 76, 'Panda Ring'); add(13, 80, 'Pet Panda'); add(13, 122, 'Skeleton Transformation Ring'); add(13, 123, 'Pet Skeleton');

// Group 14: Consumables & Jewels
add(14, 13, 'Jewel of Bless'); add(14, 14, 'Jewel of Soul'); add(14, 16, 'Jewel of Life'); add(14, 22, 'Jewel of Creation');
add(14, 31, 'Jewel of Guardian'); add(14, 41, 'Gemstone'); add(14, 42, 'Jewel of Harmony');

fs.writeFileSync('C:/Users/LeonardoGimon/Downloads/AnyServer/Any-Web-Public/public/item_db.json', JSON.stringify(itemMap, null, 2), 'utf8');
console.log('Successfully created item_db.json!');
