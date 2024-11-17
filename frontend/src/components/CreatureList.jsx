import React from 'react';
import CreatureItem from './CreatureItem';

const CreatureList = ({ creatures, onUpdate, onRemove }) => {
    return (
        <div>
            {creatures.map((creature) => (
                <CreatureItem
                    key={creature.name}
                    creature={creature}
                    onUpdate={onUpdate}
                    onRemove={onRemove} // Pass the remove function
                />
            ))}
        </div>
    );
};

export default CreatureList;

