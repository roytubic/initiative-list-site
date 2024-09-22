import React, { useState } from 'react';

const CreatureItem = ({ creature, onUpdate, onRemove }) => {
    const defaultCreature = {
        health: 0,
        tempHP: 0,
        otherInfo: '',
        conditions: [],
        ac: 0,
        alignment: 'Neutral',
    };

    const currentCreature = creature || defaultCreature;

    const [currentHP, setCurrentHP] = useState(currentCreature.health);
    const [tempHP, setTempHP] = useState(currentCreature.tempHP);
    const [tempHPInput, setTempHPInput] = useState(currentCreature.tempHP);
    const [deathSaves, setDeathSaves] = useState({ passes: 0, fails: 0 });
    const [otherInfo, setOtherInfo] = useState(currentCreature.otherInfo);
    const [conditions, setConditions] = useState(currentCreature.conditions || []);
    const [armorClass, setArmorClass] = useState(currentCreature.ac);
    const [alignment, setAlignment] = useState(currentCreature.alignment);

    const handleHPChange = (e) => {
        const newHP = Math.max(0, Number(e.target.value)); // Ensure HP is not negative
        setCurrentHP(newHP);
        onUpdate({ ...currentCreature, health: newHP }); // Update the creature's health
    };

    const handleTempHPChange = (e) => {
        const newTempHP = Number(e.target.value);
        setTempHPInput(newTempHP); // Update input state
    };

    const handleTempHPBlur = () => {
        setTempHP(tempHPInput); // Update state when input loses focus
        let newTotalHP = currentCreature.totalHealth;

        if (tempHPInput < 0) {
            newTotalHP += tempHPInput; // Subtract from total HP if temp HP is negative
        } else if (tempHPInput >= 0 && tempHP < 0) {
            newTotalHP -= tempHP; // Restore total HP if temp HP is reverted from negative
        }

        // Update the state and notify the parent component
        onUpdate({ ...currentCreature, tempHP: tempHPInput, totalHealth: newTotalHP });
    };

    const handleACChange = (e) => {
        const newAC = Math.max(0, Number(e.target.value)); // Ensure AC is not negative
        setArmorClass(newAC);
        onUpdate({ ...currentCreature, ac: newAC }); // Update the creature's AC
    };

    const handleDeathSaveChange = (type) => {
        setDeathSaves((prev) => {
            const newCount = prev[type] < 2 ? prev[type] + 1 : 0; // Reset to 0 if already 2
            return {
                ...prev,
                [type]: newCount,
            };
        });
        onUpdate({ ...currentCreature, deathSaves }); // Update death saves
    };

    const handleConditionChange = (condition) => {
        setConditions((prev) =>
            prev.includes(condition)
                ? prev.filter((c) => c !== condition)
                : [...prev, condition]
        );
        onUpdate({ ...currentCreature, conditions }); // Update conditions
    };

    const handleOtherInfoChange = (e) => {
        const newInfo = e.target.value;
        setOtherInfo(newInfo);
        onUpdate({ ...currentCreature, otherInfo: newInfo }); // Update other info
    };

    const handleRemove = () => {
        onRemove(currentCreature.name); // Call the remove function passed from parent
    };

    return (
        <div className="creature-item" style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <span>Initiative: {currentCreature.initiative} | {currentCreature.name} | </span>
            <div style={{ marginLeft: '10px' }}>
                <strong>AC:</strong>
                <input
                    type="number"
                    value={armorClass}
                    onChange={handleACChange}
                    style={{ width: '60px', marginLeft: '5px' }}
                />
            </div>
            <div style={{ marginLeft: '10px' }}>
                <strong>HP:</strong>
                <input
                    type="number"
                    value={currentHP}
                    onChange={handleHPChange}
                    style={{ width: '60px', marginLeft: '5px' }}
                />
                /{currentCreature.totalHealth}
            </div>
            <div style={{ marginLeft: '10px' }}>
                <strong>Temp HP:</strong>
                <input
                    type="number"
                    value={tempHPInput}
                    onChange={handleTempHPChange}
                    onBlur={handleTempHPBlur}
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
            <button onClick={handleRemove} style={{ marginLeft: '10px', background: 'red', color: 'white' }}>X</button>
        </div>
    );
};

export default CreatureItem;
