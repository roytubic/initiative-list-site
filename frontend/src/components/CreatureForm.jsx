import React, { useState } from 'react';

const CreatureForm = ({ addCreature }) => {
    const [selectedCharacter, setSelectedCharacter] = useState('');
    const [initiative, setInitiative] = useState('');
    const [name, setName] = useState('');
    const [health, setHealth] = useState('');
    const [ac, setAc] = useState('');
    const [passes, setPasses] = useState(0);
    const [fails, setFails] = useState(0);

    const characters = [
        { name: 'MRK-2', health: 63, ac: 20 },
        { name: 'MRK-4', health: 45, ac: 18 },
        // Add more characters here
    ];

    const handleCharacterChange = (e) => {
        const character = characters.find(char => char.name === e.target.value);
        if (character) {
            setSelectedCharacter(character.name);
            setName(character.name);
            setHealth(character.health);
            setAc(character.ac);
            setPasses(0);
            setFails(0);
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
            passes, 
            fails, 
            conditions: [] 
        };
        
        // Check if the creature already exists
        addCreature(newCreature);
        
        // Reset fields
        setSelectedCharacter('');
        setInitiative('');
        setName('');
        setHealth('');
        setAc('');
        setPasses(0);
        setFails(0);
    };

    return (
        <form onSubmit={handleSubmit}>
            <select value={selectedCharacter} onChange={handleCharacterChange} required>
                <option value="" disabled>Select a PC</option>
                {characters.map((character, index) => (
                    <option key={index} value={character.name}>{character.name}</option>
                ))}
            </select>
            <input type="number" value={initiative} onChange={(e) => setInitiative(e.target.value)} placeholder="Initiative Number" required />
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Creature Name" required />
            <input type="number" value={health} onChange={(e) => setHealth(e.target.value)} placeholder="Health" required />
            <input type="number" value={ac} onChange={(e) => setAc(e.target.value)} placeholder="Armor Class (AC)" required />
            <button type="submit">Add Creature</button>
        </form>
    );
};

export default CreatureForm;
