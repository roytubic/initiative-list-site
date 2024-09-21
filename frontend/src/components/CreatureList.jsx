import React from 'react';
import CreatureItem from './CreatureItem';

const CreatureList = ({ creatures, onUpdate }) => {
    return (
        <div>
            {creatures.map((creature, index) => (
                <CreatureItem
                    key={`${creature.name}-${creature.initiative}`} // Ensure uniqueness
                    creature={creature}
                    onUpdate={onUpdate}
                />
            ))}
        </div>
    );
};

export default CreatureList;
