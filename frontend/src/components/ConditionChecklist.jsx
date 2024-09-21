import React, { useState } from 'react';

const ConditionChecklist = ({ selectedConditions, setSelectedConditions }) => {
    const [dropdownVisible, setDropdownVisible] = useState(false); // Manage dropdown visibility
    const conditionOptions = [
        'Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled', 
        'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 
        'Poisoned', 'Prone', 'Restrained', 'Stunned', 
        'Unconscious', 'Exhaustion lvl 1', 'Exhaustion lvl 2', 
        'Exhaustion lvl 3', 'Exhaustion lvl 4', 'Exhaustion lvl 5'
    ];

    const handleConditionChange = (condition) => {
        if (selectedConditions.includes(condition)) {
            // Remove condition if already selected
            setSelectedConditions(selectedConditions.filter(cond => cond !== condition));
        } else {
            // Add condition
            setSelectedConditions([...selectedConditions, condition]);
        }
    };

    return (
        <div>
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    value={selectedConditions.join(', ')}
                    placeholder="Conditions"
                    readOnly
                    style={{ width: '200px', marginRight: '5px' }}
                />
                <button type="button" onClick={() => setDropdownVisible(!dropdownVisible)}>
                    Select Conditions
                </button>
            </div>
            {dropdownVisible && (
                <div style={{ border: '1px solid #ccc', background: '#fff', position: 'absolute', zIndex: 1 }}>
                    {conditionOptions.map((condition, index) => (
                        <label key={index}>
                            <input
                                type="checkbox"
                                checked={selectedConditions.includes(condition)}
                                onChange={() => handleConditionChange(condition)}
                            />
                            {condition}
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ConditionChecklist;
