import React, { useState } from 'react';
import CreatureForm from './CreatureForm';
import CreatureList from './CreatureList';
import RunInitiative from './RunInitiative';

const InitiativeTracker = () => {
    const [creatures, setCreatures] = useState([]);

    const addCreature = (creature) => {
        setCreatures((prev) => {
            const existingCreatureIndex = prev.findIndex(c => c.name === creature.name);
            if (existingCreatureIndex !== -1) {
                const updatedCreatures = [...prev];
                updatedCreatures[existingCreatureIndex] = creature;
                return updatedCreatures.sort((a, b) => b.initiative - a.initiative);
            }
            const updatedCreatures = [...prev, creature];
            return updatedCreatures.sort((a, b) => b.initiative - a.initiative);
        });
    };

    const handleUpdate = (updatedCreature) => {
        setCreatures((prev) => {
            return prev.map(creature =>
                creature.name === updatedCreature.name ? updatedCreature : creature
            );
        });
    };

    const handleRemove = (name) => {
        setCreatures((prev) => prev.filter(creature => creature.name !== name));
    };

    return (
        <div>
            <CreatureForm addCreature={addCreature} />
            <CreatureList 
                creatures={creatures} 
                onUpdate={handleUpdate} 
                onRemove={handleRemove} // Pass down the remove function
            />
            <RunInitiative creatures={creatures} />
        </div>
    );
};

export default InitiativeTracker;
