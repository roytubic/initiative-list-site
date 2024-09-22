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
        { name: 'MRK-2', health: 63, ac: 20 },
        { name: 'MRK-4', health: 45, ac: 18 },
    ];

    const npcs = [
        { name: 'Gerta', health: 55, ac: 16 },
    ];

    const monsters = [
        { name: 'Wolf', health: 11, ac: 10 },
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
