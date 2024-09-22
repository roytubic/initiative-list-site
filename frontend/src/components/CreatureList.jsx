import React from 'react';
import CreatureItem from './CreatureItem';

const CreatureList = ({ creatures, onUpdate, onRemove }) => {
    return (
        <div>
            {creatures.map((creature, index) => (
                <CreatureItem
                    key={`${creature.name}-${creature.initiative}`} // Ensure uniqueness
                    creature={creature}
                    onUpdate={onUpdate}
                    onRemove={onRemove} // Pass the remove function
                />
            ))}
        </div>
    );
};

export default CreatureList;
