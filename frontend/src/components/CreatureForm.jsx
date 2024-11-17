import React, { useState } from 'react';

const CreatureForm = ({ addCreature }) => {
    const [selectedCharacter, setSelectedCharacter] = useState('');
    const [selectedNPC, setSelectedNPC] = useState('');
    const [selectedMonster, setSelectedMonster] = useState('');
    const [initiative, setInitiative] = useState('');
    const [name, setName] = useState('');
    const [health, setHealth] = useState('');
    const [ac, setAc] = useState('');
    const [alignment, setAlignment] = useState('Good');

    const characters = [
        { name: 'MRK-2', health: 75, ac: 18 },
        { name: 'Daleth', health: 53, ac: 16 },
        { name: 'Urdos', health: 42, ac: 13 },
        { name: 'Velaren', health: 54, ac: 17 },
        { name: 'Venstina', health: 60, ac: 16 },
        { name: 'Wulrash', health: 42, ac: 17 },
        { name: 'Therrin', health:29,  ac:18},
        { name: 'PC1', health:29,  ac:18},
        { name: 'PC2', health:29,  ac:18},
        { name: 'PC3', health:29,  ac:18}
    ];

    const npcs = [
        { name: 'Gerta', health: 63, ac: 16 },
        { name: 'Britchella', health: 82, ac: 17 },
        { name: 'Dwarf (m)', health: null, ac: null },
        { name: 'Fire Genasi (M)', health: null, ac: null },
        { name: 'Gav', health: null, ac: null },
        { name: 'Gwenyth (wrapped)', health: 14, ac: 52 },
        { name: 'Gwenyth', health: 14, ac: 52 },
        { name: 'Halamar', health: null, ac: null },
        { name: 'Half-elf (F)', health: null, ac: null },
        { name: 'Karen', health: 75, ac: 17 },
        { name: 'Lady Seraphine', health: null, ac: null },
        { name: 'Lionin (M)', health: null, ac: null },
        { name: 'Patricia', health: 91, ac: 17 },
        { name: 'Plyne', health: null, ac: null },
        { name: 'Samael the Unseen', health: null, ac: null },
        { name: 'Susan', health: null, ac: null },
        { name: 'Yuan-ti (f)', health: 66, ac: 15 },
        { name: 'Zombie', health: 11, ac: 10 }

    ];

    const monsters = [
        { name: 'Wolf', health: 11, ac: 10 },
        { name: 'Bandit Captain', health: 65, ac: 15 },
        { name: 'Banshee', health: 58, ac: 12 },
        { name: 'Bearded devil', health: 52, ac: 13 },
        { name: 'Beholder', health: 180, ac: 18 },
        { name: 'Black Pudding', health: 85, ac: 7 },
        { name: 'Blue Slaad', health: 123, ac: 15 },
        { name: 'Bugbear', health: 27, ac: 16 },
        { name: 'Bulette', health: 94, ac: 17 },
        { name: 'Chuul', health: 93, ac: 16 },
        { name: 'Dire Wolverine', health: null, ac: null },
        { name: 'Ettin', health: 85, ac: 12 },
        { name: 'Flame Skull', health: 40, ac: 13 },
        { name: 'Frost Elemental', health: 114, ac: 15 },
        { name: 'Frost Giant', health: 138, ac: 15 },
        { name: 'Ghast', health: 36, ac: 13 },
        { name: 'Giant Moth', health: null, ac: null },
        { name: 'Green Slaad', health: 127, ac: 16 },
        { name: 'Harpy', health: 38, ac: 11 },
        { name: 'Hobgoblin', health: 11, ac: 18 },
        { name: 'Ice Armour', health: 65, ac: 16 },
        { name: 'Ice Golem', health: 50, ac: 14 },
        { name: 'Ice Mephit', health: 21, ac: 11 },
        { name: 'Jetad the White', health: null, ac: null },
        { name: 'Lurse', health: null, ac: null },
        { name: 'Mind Witness', health: 75, ac: 15 },
        { name: 'Phase Spider', health: 32, ac: 13 },
        { name: 'Poltergiest', health: null, ac: null },
        { name: 'Red Slaad', health: 93, ac: 14 },
        { name: 'Ripterror', health: null, ac: null },
        { name: 'Rock Worm', health: null, ac: null },
        { name: 'Skeleton', health: 13, ac: 13 },
        { name: 'Thief', health: null, ac: null },
        { name: "Ula'ree soldier", health: null, ac: null },
        { name: 'VS Arcanist', health: null, ac: null },
        { name: 'VS Spy', health: null, ac: null },
        { name: 'VS Swordsman', health: null, ac: null },
        { name: 'White Wrymling', health: 32, ac: 14 },
        { name: 'Wight', health: 45, ac: 14 },
        { name: 'Yeti', health: 51, ac: 12 },
        { name: 'Zombie Ogre', health: 85, ac: 8 },
        { name: 'Zombie', health: 22, ac: 8 },
        { name: 'Lord Jenthril', health: 55, ac: 15 },
        { name: 'Sprite', health: 7, ac: 13 },
        { name: 'Shadowling', health: 22, ac: 8 }
    ];

    const handlePCChange = (e) => {
        const character = characters.find(char => char.name === e.target.value);
        if (character) {
            setSelectedCharacter(character.name);
            setName(character.name);
            setHealth(character.health);
            setAc(character.ac);
            setAlignment('Good'); // Default alignment for PCs
        }
    };

    const handleNPCChange = (e) => {
        const npc = npcs.find(npc => npc.name === e.target.value);
        if (npc) {
            setSelectedNPC(npc.name);
            setName(npc.name);
            setHealth(npc.health);
            setAc(npc.ac);
            setAlignment('Good'); // Default alignment for NPCs
        }
    };

    const handleMonsterChange = (e) => {
        const monster = monsters.find(monster => monster.name === e.target.value);
        if (monster) {
            setSelectedMonster(monster.name);
            setName(monster.name);
            setHealth(monster.health);
            setAc(monster.ac);
            setAlignment('Bad'); // Default alignment for monsters
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const newCreature = { 
            initiative: parseInt(initiative), 
            name, 
            health: parseInt(health), 
            totalHealth: parseInt(health), 
            ac: parseInt(ac), 
            type: selectedCharacter ? 'PC' : 'NPC', // Set the type based on selection
            alignment: alignment // Make sure to set alignment here too
        };
        
        addCreature(newCreature);
        
        // Reset fields
        setSelectedCharacter('');
        setSelectedNPC('');
        setSelectedMonster('');
        setInitiative('');
        setName('');
        setHealth('');
        setAc('');
        setAlignment('Good'); // Reset alignment to default
    };

    return (
        <form onSubmit={handleSubmit}>
            <select value={selectedCharacter} onChange={handlePCChange}>
                <option value="" disabled>Select a PC</option>
                {characters.map((character, index) => (
                    <option key={index} value={character.name}>{character.name}</option>
                ))}
            </select>
            <select value={selectedNPC} onChange={handleNPCChange}>
                <option value="" disabled>Select an NPC</option>
                {npcs.map((npc, index) => (
                    <option key={index} value={npc.name}>{npc.name}</option>
                ))}
            </select>
            <select value={selectedMonster} onChange={handleMonsterChange}>
                <option value="" disabled>Select a Monster</option>
                {monsters.map((monster, index) => (
                    <option key={index} value={monster.name}>{monster.name}</option>
                ))}
            </select>
            <input type="number" value={initiative} onChange={(e) => setInitiative(e.target.value)} placeholder="Initiative Number" required />
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Creature Name" required />
            <input type="number" value={health} onChange={(e) => setHealth(e.target.value)} placeholder="Health" required />
            <input type="number" value={ac} onChange={(e) => setAc(e.target.value)} placeholder="Armor Class (AC)" required />
            <select value={alignment} onChange={(e) => setAlignment(e.target.value)}>
                <option value="Good">Good</option>
                <option value="Bad">Bad</option>
            </select>
            <button type="submit">Add Creature</button>
        </form>
    );
};

export default CreatureForm;
