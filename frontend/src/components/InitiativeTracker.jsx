// src/InitiativeTracker.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import CreatureForm from './CreatureForm';
import CreatureList from './CreatureList';
import RunInitiative from './RunInitiative';

// Safe helpers
const stripSuffix = (name) => (name || '').trim().replace(/\s*-\s*\d+$/, '');
const hasSuffix = (name) => /-\d+$/.test(name || '');

export default function InitiativeTracker() {
  const [creatures, setCreatures] = useState([]);

  const [encounterId, setEncounterId] = useState(null);
  const [dmToken, setDmToken] = useState(null);
  const [joinCode, setJoinCode] = useState(null);

  // DM socket – only connect when we have id + token
  const socket = useMemo(() => {
    if (!encounterId || !dmToken) return null;
    return io('http://localhost:3000', {
      autoConnect: false,
      auth: { role: 'dm', encounterId, token: dmToken }
    });
  }, [encounterId, dmToken]);

  // Receive ENCOUNTER_READY from the popup (with id + token + code)
  useEffect(() => {
    const onMsg = (e) => {
      if (e.data?.type === 'ENCOUNTER_READY') {
        setEncounterId(e.data.id);
        setDmToken(e.data.dmToken);
        setJoinCode(e.data.code || null);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // Connect DM socket & keep list synced from server
  useEffect(() => {
    if (!socket) return;
    socket.connect();

    socket.on('encounter:state', (s) => {
      const mapped = (s.creatures || [])
        .filter(Boolean)
        .map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          alignment: c.alignment,
          initiative: c.initiative,
          totalHealth: c.total_hp,
          health: c.current_hp,
          tempHP: c.temp_hp,
          conditions: c.conditions || []
        }));
      setCreatures(mapped);
    });

    socket.on('creature:update', ({ creatureId, patch }) => {
      setCreatures((prev) =>
        prev
          .filter(Boolean)
          .map((c) =>
            c.id === creatureId
              ? {
                  ...c,
                  health:
                    typeof patch.current_hp === 'number' ? patch.current_hp : c.health,
                  tempHP:
                    typeof patch.temp_hp === 'number' ? patch.temp_hp : c.tempHP,
                  conditions: Array.isArray(patch.conditions)
                    ? patch.conditions
                    : c.conditions
                }
              : c
          )
      );
    });

    return () => socket.disconnect();
  }, [socket]);

  // ---------- Add / Update / Remove with hardening ----------

  const addCreatures = (proto, qty) => {
    // Defensive guard to avoid "reading 'name' of undefined"
    if (!proto || typeof proto.name !== 'string' || proto.name.trim() === '') {
      console.warn('addCreatures ignored invalid proto:', proto);
      return;
    }

    setCreatures((prev) => {
      // Filter out any undefined / hole entries first
      const next = prev.filter(Boolean).slice();
      const base = stripSuffix(proto.name);
      const count = Math.max(1, Math.min(20, Number(qty) || 1));

      for (let k = 0; k < count; k++) {
        // Only consider defined items, and guard c?.name
        const sameBaseIdxs = next
          .map((c, i) => ({ c, i }))
          .filter(({ c }) => c && stripSuffix(c.name) === base);

        if (sameBaseIdxs.length === 0) {
          // First of its name
          next.push({ ...proto, name: base });
        } else {
          // Ensure the original unsuffixed (if any) becomes -1
          const idxUnsuffixed = sameBaseIdxs.find(({ c }) => c && !hasSuffix(c.name));
          if (idxUnsuffixed) {
            const { i } = idxUnsuffixed;
            next[i] = { ...next[i], name: `${base}-1` };
          }

          // Find max existing suffix among this base (guard c?.name)
          let maxN = 0;
          for (const c of next) {
            if (!c) continue;
            if (stripSuffix(c.name) !== base) continue;
            const m = (c.name || '').match(/-(\d+)$/);
            if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
          }

          // New creature gets next suffix
          next.push({ ...proto, name: `${base}-${maxN + 1}` });
        }
      }

      // Sort & sanitize again
      const cleaned = next.filter(Boolean).sort(
        (a, b) => (b.initiative ?? 0) - (a.initiative ?? 0)
      );

      // Sync to server (if encounter exists)
      scheduleServerSync(cleaned);
      return cleaned;
    });
  };

  const handleRemove = (name) => {
    setCreatures((prev) => {
      const next = prev.filter(Boolean).filter((c) => c.name !== name);
      scheduleServerSync(next);
      return next;
    });
  };

  const handleUpdate = (updatedCreature) => {
    if (!updatedCreature) return;
    setCreatures((prev) => {
      const next = prev
        .filter(Boolean)
        .map((c) => (c.name === updatedCreature.name ? updatedCreature : c));
      scheduleServerSync(next);
      return next;
    });
  };

  // Send the whole list to the server so popup/players get it
  const scheduleServerSync = (list) => {
    if (!encounterId || !dmToken) return;
    const payload = (list || []).filter(Boolean).map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type || 'PC',
      alignment: c.alignment || 'Good',
      initiative: c.initiative ?? 0,
      total_hp: c.totalHealth ?? Math.max(1, Number(c.health ?? 1)),
      current_hp: c.health ?? 0,
      temp_hp: c.tempHP ?? 0,
      conditions: Array.isArray(c.conditions) ? c.conditions : []
    }));

    fetch(`http://localhost:3000/api/encounter/${encounterId}/creatures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dmToken, creatures: payload })
    }).catch(() => {});
  };

  // DM emits a patch to the server (called from CreatureItem via onPatch)
  const emitPatch = (creatureId, patch) => {
    if (!socket) return;
    socket.emit('creature:update', { creatureId, patch });
  };

  // Turn controls -> server
  const prevTurn = () => socket && socket.emit('turn:prev');
  const nextTurn = () => socket && socket.emit('turn:next');

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        {joinCode && (
          <div>
            <strong>Join Code:</strong> {joinCode}
          </div>
        )}
      </div>

      {/* IMPORTANT: CreatureForm must call addCreatures(proto, qty) */}
      <CreatureForm addCreatures={addCreatures} />

      <CreatureList
        creatures={creatures}
        onUpdate={handleUpdate}
        onRemove={handleRemove}
        dmControls
        onPatch={emitPatch}
      />

      <RunInitiative creatures={creatures} />

      <div style={{ marginTop: 12 }}>
        <button onClick={prevTurn} disabled={!socket}>
          Prev turn
        </button>{' '}
        <button onClick={nextTurn} disabled={!socket}>
          Next turn
        </button>
      </div>
    </div>
  );
}
