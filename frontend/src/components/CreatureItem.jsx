import React, { useState, useEffect } from 'react';

const CreatureItem = ({ creature, onUpdate, onRemove }) => {
    const [currentHP, setCurrentHP] = useState(creature.health);
    const [tempHP, setTempHP] = useState(creature.tempHP);
    const [deathSaves, setDeathSaves] = useState({ passes: 0, fails: 0 });
    const [otherInfo, setOtherInfo] = useState(creature.otherInfo);
    const [conditions, setConditions] = useState(creature.conditions || []); // Default to empty array

    // Update creature health and temp HP in parent component only when values change
    useEffect(() => {
        if (
            currentHP !== creature.health ||
            tempHP !== creature.tempHP ||
            JSON.stringify(conditions) !== JSON.stringify(creature.conditions)
        ) {
            onUpdate({ ...creature, health: currentHP, tempHP, conditions });
        }
    }, [currentHP, tempHP, conditions, creature, onUpdate]);

    const handleHPChange = (e) => {
        const newHP = Math.max(0, Number(e.target.value)); // Ensure HP is not negative
        setCurrentHP(newHP);
    };

    const handleTempHPChange = (e) => {
        const newTempHP = Number(e.target.value);
        setTempHP(newTempHP);
    };

    const handleDeathSaveChange = (type) => {
        setDeathSaves((prev) => {
            const newValue = prev[type] + 1 > 3 ? 0 : prev[type] + 1; // Reset to 0 if it exceeds 3
            return {
                ...prev,
                [type]: newValue,
            };
        });
    };

    const handleConditionChange = (condition) => {
        setConditions((prev) =>
            prev.includes(condition)
                ? prev.filter((c) => c !== condition)
                : [...prev, condition]
        );
    };

    const handleOtherInfoChange = (e) => {
        setOtherInfo(e.target.value);
    };

    const healthPercentage = ((currentHP / creature.totalHealth) * 100).toFixed(2);
    const tempHPPercentage = tempHP > 0 ? ((tempHP / creature.totalHealth) * 100).toFixed(2) : 0;

    return (
        <div className="creature-item" style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <h3>{creature.name}</h3>
            <div style={{ marginLeft: '10px' }}>
                <strong>HP:</strong>
                <input
                    type="number"
                    value={currentHP}
                    onChange={handleHPChange}
                    style={{ width: '60px', marginLeft: '5px' }}
                />
                /{creature.totalHealth}
            </div>
            <div style={{ marginLeft: '10px' }}>
                <strong>Temp HP:</strong>
                <input
                    type="number"
                    value={tempHP}
                    onChange={handleTempHPChange}
                    style={{ width: '60px', marginLeft: '5px' }}
                />
            </div>
            <div style={{ marginLeft: '10px' }}>
                <strong>Death Saves:</strong>
                <button onClick={() => handleDeathSaveChange('passes')}>Pass</button>
                <span>{deathSaves.passes}</span>
                <button onClick={() => handleDeathSaveChange('fails')}>Fail</button>
                <span>{deathSaves.fails}</span>
            </div>
            <div style={{ marginLeft: '10px' }}>
                <strong>Conditions:</strong>
                <select onChange={(e) => handleConditionChange(e.target.value)} value="">
                    <option value="">Select condition</option>
                    <option value="Blinded">Blinded</option>
                    <option value="Charmed">Charmed</option>
                    <option value="Deafened">Deafened</option>
                    <option value="Frightened">Frightened</option>
                    <option value="Grappled">Grappled</option>
                    <option value="Incapacitated">Incapacitated</option>
                    <option value="Invisible">Invisible</option>
                    <option value="Paralyzed">Paralyzed</option>
                    <option value="Petrified">Petrified</option>
                    <option value="Poisoned">Poisoned</option>
                    <option value="Prone">Prone</option>
                    <option value="Restrained">Restrained</option>
                    <option value="Stunned">Stunned</option>
                    <option value="Unconscious">Unconscious</option>
                </select>
                <span>{conditions.join(', ')}</span>
            </div>
            <div style={{ marginLeft: '10px' }}>
                <strong>Other Info:</strong>
                <input
                    type="text"
                    value={otherInfo}
                    onChange={handleOtherInfoChange}
                    style={{ width: '150px', marginLeft: '5px' }}
                />
            </div>
            <div style={{ marginLeft: '10px', width: '100%', maxWidth: '200px' }}>
                <div className="hp-bar" style={{ width: '100%', height: '10px', background: 'red', position: 'relative', borderRadius: '5px' }}>
                    <div className="current-hp" style={{ width: `${healthPercentage}%`, height: '100%', background: 'green', borderRadius: '5px' }} />
                    <div className="temp-hp" style={{ width: `${tempHPPercentage}%`, height: '100%', background: 'yellow', position: 'absolute', bottom: 0, left: 0 }} />
                </div>
            </div>
            <button
                style={{ marginLeft: '10px', color: 'red' }}
                onClick={() => onRemove(creature.name)} // Trigger remove function
            >
                Remove
            </button>
        </div>
    );
};

export default CreatureItem;
