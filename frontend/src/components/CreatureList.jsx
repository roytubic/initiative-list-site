import React from 'react';
import CreatureItem from './CreatureItem';

const CreatureList = ({ creatures, onUpdate, onRemove, dmControls, onPatch }) => {
  return (
    <div>
      {creatures.map((c) => (
        <CreatureItem
          key={c.id || c.name}
          creature={c}
          onUpdate={onUpdate}
          onRemove={onRemove}
          dmControls={dmControls}
          onPatch={onPatch}
        />
      ))}
    </div>
  );
};

export default CreatureList;
