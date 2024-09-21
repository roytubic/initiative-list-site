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
                // If the creature exists, replace it with the new one
                const updatedCreatures = [...prev];
                updatedCreatures[existingCreatureIndex] = creature;
                return updatedCreatures.sort((a, b) => b.initiative - a.initiative);
            }
            // If it does not exist, add the new creature
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

    return (
        <div>
            <CreatureForm addCreature={addCreature} />
            <CreatureList creatures={creatures} onUpdate={handleUpdate} />
            <RunInitiative creatures={creatures} />
        </div>
    );
};

export default InitiativeTracker;
