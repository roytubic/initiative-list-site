import React, { useEffect, useState } from 'react';

const NEG = Array.from({ length: 100 }, (_, i) => -100 + i); // -100..-1
const POS = Array.from({ length: 100 }, (_, i) => i + 1);     // 1..100
const AMOUNTS = [...NEG, ...POS];
const TEMP_RANGE = Array.from({ length: 100 }, (_, i) => i + 1);

const CreatureItem = ({ creature, onUpdate, onRemove, dmControls, onPatch }) => {
  const total = creature.totalHealth || creature.total_hp || Math.max(1, Number(creature.health ?? 1));
  const [currentHP, setCurrentHP] = useState(creature.health ?? creature.current_hp ?? 0);
  const [tempHP, setTempHP] = useState(creature.tempHP ?? creature.temp_hp ?? 0);
  const [conditions, setConditions] = useState(creature.conditions || []);
  const [otherInfo, setOtherInfo] = useState(creature.otherInfo || '');

  const [hpAmount, setHpAmount] = useState(1);   // default +1
  const [tempAmount, setTempAmount] = useState(1);

  // Whenever server pushes new values (via parent props), mirror them
  useEffect(() => {
    setCurrentHP(creature.health ?? creature.current_hp ?? 0);
    setTempHP(creature.tempHP ?? creature.temp_hp ?? 0);
    setConditions(creature.conditions || []);
  }, [creature.health, creature.current_hp, creature.tempHP, creature.temp_hp, creature.conditions]);

  // Local-only update path (kept for compatibility; not used when dmControls=true)
  useEffect(() => {
    if (dmControls) return; // DM now emits patches to server instead
    onUpdate({
      ...creature,
      health: currentHP,
      totalHealth: total,
      tempHP,
      otherInfo,
      conditions
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentHP, tempHP, otherInfo, conditions]);

  const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

  // DM actions emit patches to the backend (authoritative)
  const applyHp = () => {
    if (!dmControls || !onPatch) return;
    const next = clamp((currentHP ?? 0) + hpAmount, 0, total);
    onPatch(creature.id, { current_hp: next });
  };

  const addTemp = () => {
    if (!dmControls || !onPatch) return;
    const next = clamp((tempHP ?? 0) + Math.abs(tempAmount), 0, total);
    onPatch(creature.id, { temp_hp: next });
  };

  const clearTemp = () => {
    if (!dmControls || !onPatch) return;
    onPatch(creature.id, { temp_hp: 0 });
  };

  const toggleCondition = (condition) => {
    const next = new Set(conditions || []);
    next.has(condition) ? next.delete(condition) : next.add(condition);

    if (dmControls && onPatch) {
      onPatch(creature.id, { conditions: Array.from(next) });
    } else {
      setConditions(Array.from(next));
    }
  };

  const healthPercentage = ((Number(creature.health ?? creature.current_hp ?? 0) / total) * 100).toFixed(2);
  const tempHPPercentage = (Number(creature.tempHP ?? creature.temp_hp ?? 0) > 0
    ? ((Number(creature.tempHP ?? creature.temp_hp ?? 0) / total) * 100).toFixed(2)
    : 0);

  return (
    <div className="creature-item" style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: 10 }}>
      <h3 style={{ minWidth: 160 }}>{creature.name}</h3>

      {/* Read-only HP display (source of truth is server/popup) */}
      <div><strong>HP:</strong> {Number(creature.health ?? creature.current_hp ?? 0)} / {total}</div>

      {dmControls && (
        <>
          {/* Heal/Damage */}
          <div>
            <label>Amount:&nbsp;
              <select value={hpAmount} onChange={(e) => setHpAmount(parseInt(e.target.value, 10))}>
                {AMOUNTS.map(v => (
                  <option key={v} value={v}>{v > 0 ? `+${v}` : v}</option>
                ))}
              </select>
            </label>
            <button onClick={applyHp}>{hpAmount >= 0 ? 'Heal' : 'Damage'}</button>
          </div>

          {/* Temp HP */}
          <div>
            <label>Temp:&nbsp;
              <select value={tempAmount} onChange={(e) => setTempAmount(parseInt(e.target.value, 10))}>
                {TEMP_RANGE.map(v => <option key={v} value={v}>+{v}</option>)}
              </select>
            </label>
            <button onClick={addTemp}>Add Temp</button>
            <button onClick={clearTemp}>Clear Temp</button>
          </div>
        </>
      )}

      {/* Visual bar */}
      <div style={{ width: 200 }}>
        <div className="hp-bar" style={{ width: '100%', height: '10px', background: 'red', position: 'relative', borderRadius: '5px' }}>
          <div className="current-hp" style={{ width: `${healthPercentage}%`, height: '100%', background: 'green', borderRadius: '5px' }} />
          <div className="temp-hp" style={{ width: `${tempHPPercentage}%`, height: '100%', background: 'yellow', position: 'absolute', bottom: 0, left: 0 }} />
        </div>
      </div>

      {/* Conditions (DM toggles emit to server) */}
      <div>
        <strong>Conditions:</strong>
        <select onChange={(e) => toggleCondition(e.target.value)} value="">
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
        <span> {(creature.conditions || []).join(', ')}</span>
      </div>

      <button style={{ color: 'red' }} onClick={() => onRemove(creature.id)}>Remove</button>

      <button
        onClick={() => onUpdate({ ...creature, alignment: creature.alignment === "Good" ? "Evil" : "Good" })}
        style={{
          padding: "4px 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.18)",
          background: creature.alignment === "Good"
            ? "linear-gradient(180deg, rgba(50,180,120,.9), rgba(30,130,90,.9))"
            : "linear-gradient(180deg, rgba(210,70,70,.9), rgba(160,40,40,.9))",
          color: "#fff",
          cursor: "pointer",
          fontSize: 12,
        }}
        title="Toggle Good/Evil"
      >
        {creature.alignment === "Good" ? "Good" : "Evil"}
      </button>

    </div>
  );
};

export default CreatureItem;
