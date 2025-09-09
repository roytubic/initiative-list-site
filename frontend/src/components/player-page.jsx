import React, { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

const CONDITIONS = [
  "Blinded","Charmed","Deafened","Frightened","Grappled","Incapacitated",
  "Invisible","Paralyzed","Petrified","Poisoned","Prone","Restrained",
  "Stunned","Unconscious","Exhaustion lvl 1","Exhaustion lvl 2","Exhaustion lvl 3",
  "Exhaustion lvl 4","Exhaustion lvl 5"
];

const NEG = Array.from({ length: 100 }, (_, i) => -100 + i); // -100..-1
const POS = Array.from({ length: 100 }, (_, i) => i + 1);     // 1..100
const AMOUNTS = [...NEG, ...POS];
const TEMP_RANGE = Array.from({ length: 100 }, (_, i) => i + 1);

export default function PlayerPage() {
  const [step, setStep] = useState("join");           // "join" -> "pick" -> "play"
  const [code, setCode] = useState("");
  const [encounter, setEncounter] = useState(null);   // snapshot from backend
  const [playerToken, setPlayerToken] = useState(null);
  const [myCreatureId, setMyCreatureId] = useState(null);
  const [me, setMe] = useState(null);                 // my live creature state

  const [amount, setAmount] = useState(1);            // heal/damage dropdown (+1 default)
  const [tempAmount, setTempAmount] = useState(1);    // temp +N

  // socket (connect only when we have token + encounter)
  const socket = useMemo(() => {
    if (!encounter?.id || !playerToken) return null;
    return io("http://localhost:3000", {
      autoConnect: false,
      auth: { role: "player", encounterId: encounter.id, token: playerToken }
    });
  }, [encounter?.id, playerToken]);

  // join by code -> load encounter snapshot
  const joinEncounter = async () => {
    const joinCode = code.trim().toUpperCase();
    const resp = await fetch(`http://localhost:3000/api/encounter/code/${encodeURIComponent(joinCode)}`);
    if (!resp.ok) {
      const text = await resp.text();
      alert(`Join failed (${resp.status}): ${text}`);
      return;
    }
    const data = await resp.json();
    setEncounter(data);
    setStep("pick");
  };

  // claim a PC (only once)
  const claimCreature = async (creatureId) => {
    const resp = await fetch(`http://localhost:3000/api/encounter/${encounter.id}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: encounter.code,
        creatureId,
        playerName: "Player"
      })
    });

    if (!resp.ok) {
      const text = await resp.text();
      alert(`Claim failed (${resp.status}): ${text}`);
      return;
    }

    const { playerToken } = await resp.json();
    setPlayerToken(playerToken);
    setMyCreatureId(creatureId);
    setStep("play");
  };

  // connect socket & keep my creature in sync (also picks up DM-side edits)
  useEffect(() => {
    if (!socket) return;
    socket.connect();

    socket.on("encounter:state", (s) => {
      setEncounter(s);
      const mine = (s.creatures || []).find(c => c.id === myCreatureId);
      if (mine) {
        setMe({
          id: mine.id,
          name: mine.name,
          total_hp: mine.total_hp,
          current_hp: mine.current_hp,
          temp_hp: mine.temp_hp,
          conditions: mine.conditions || []
        });
      }
    });

    socket.on("creature:update", ({ creatureId, patch }) => {
      if (creatureId === myCreatureId) {
        setMe(prev => prev ? {
          ...prev,
          current_hp: (typeof patch.current_hp === 'number') ? patch.current_hp : prev.current_hp,
          temp_hp: (typeof patch.temp_hp === 'number') ? patch.temp_hp : prev.temp_hp,
          conditions: Array.isArray(patch.conditions) ? patch.conditions : prev.conditions
        } : prev);
      }
    });

    socket.on("turn:state", () => { /* optional per-turn UI */ });

    return () => socket.disconnect();
  }, [socket, myCreatureId]);

  // send updates
  const sendHPDelta = (delta) => {
    if (!socket || !me) return;
    const next = Math.max(0, Math.min((me.current_hp ?? 0) + delta, me.total_hp));
    socket.emit("creature:update", { creatureId: myCreatureId, patch: { current_hp: next } });
  };
  const addTemp = (n) => {
    if (!socket || !me) return;
    const next = Math.max(0, (me.temp_hp ?? 0) + n);
    socket.emit("creature:update", { creatureId: myCreatureId, patch: { temp_hp: next } });
  };
  const clearTemp = () => {
    if (!socket || !me) return;
    socket.emit("creature:update", { creatureId: myCreatureId, patch: { temp_hp: 0 } });
  };
  const toggleCondition = (cond) => {
    if (!socket || !me) return;
    const next = new Set(me.conditions || []);
    if (next.has(cond)) next.delete(cond); else next.add(cond);
    socket.emit("creature:update", { creatureId: myCreatureId, patch: { conditions: Array.from(next) } });
  };

  // ---------- RENDER ----------

  if (step === "join") {
    return (
      <div>
        <h2>Join Encounter</h2>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter join code"
        />
        <button onClick={joinEncounter}>Join</button>
      </div>
    );
  }

  if (step === "pick") {
    if (!encounter) return null;

    // PCs only, and only those not already claimed
    const claimed = encounter.claims || {};
    const pcs = (encounter.creatures || []).filter(
      (c) => (c.type || "PC") === "PC" && !claimed[c.id]
    );

    return (
      <div>
        <h2>Select Your Character</h2>
        {pcs.length === 0 && <p>No available player characters to claim.</p>}
        {pcs.map((c) => (
          <button key={c.id} onClick={() => claimCreature(c.id)} style={{marginRight:8, marginBottom:8}}>
            {c.name}
          </button>
        ))}
        <div style={{ marginTop: 12 }}>
          {(encounter.creatures || [])
            .filter((c) => (c.type || "PC") === "PC" && claimed[c.id])
            .map((c) => (
              <button key={c.id} disabled title="Already claimed" style={{opacity:0.6, marginRight:8, marginBottom:8}}>
                {c.name} (claimed)
              </button>
            ))}
        </div>
      </div>
    );
  }

  if (step === "play") {
    if (!me) return <div>Loading your character…</div>;

    return (
      <div>
        <h2>{me.name}</h2>

        <div style={{ marginBottom: 12 }}>
          <strong>HP:</strong> {me.current_hp ?? 0} / {me.total_hp ?? 0}
        </div>

        {/* Heal/Damage control */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <label>
            Amount:&nbsp;
            <select value={amount} onChange={(e)=>setAmount(parseInt(e.target.value,10))}>
              {AMOUNTS.map(v => (
                <option key={v} value={v}>{v>0?`+${v}`:v}</option>
              ))}
            </select>
          </label>
          <button onClick={() => sendHPDelta(amount)}>
            {amount >= 0 ? 'Heal' : 'Damage'}
          </button>
        </div>

        {/* Temp HP control */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <strong>Temp HP:</strong> {me.temp_hp ?? 0}
          <label>
            Add:&nbsp;
            <select value={tempAmount} onChange={(e)=>setTempAmount(parseInt(e.target.value,10))}>
              {TEMP_RANGE.map(v => <option key={v} value={v}>+{v}</option>)}
            </select>
          </label>
          <button onClick={() => addTemp(tempAmount)}>Add Temp</button>
          <button onClick={clearTemp}>Clear Temp</button>
        </div>

        {/* Conditions */}
        <div style={{ marginTop: 10 }}>
          <strong>Conditions</strong>
          <div style={{display:'grid', gridTemplateColumns:'repeat(2, minmax(180px, 1fr))', gap:'6px', marginTop:'6px'}}>
            {CONDITIONS.map((cond) => (
              <label key={cond} style={{ userSelect:'none' }}>
                <input
                  type="checkbox"
                  checked={!!(me.conditions || []).includes(cond)}
                  onChange={() => toggleCondition(cond)}
                />{" "}
                {cond}
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
