import React from 'react';

const CreatureImage = ({ creatureName }) => {
    const imageUrl = `/frontend/public/creatureimages/${creatureName}.jpg`; // Assuming images are in the same directory

    return (
        <div style={{ width: '150px', marginRight: '20px' }}>
            <img 
                src={imageUrl} 
                alt={creatureName} 
                style={{ width: '100%', borderRadius: '8px' }} 
            />
        </div>
    );
};

export default CreatureImage;
