// src/PlayerPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";

/* ------------------- Constants ------------------- */
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

/* ------------------- Helpers ------------------- */
const clamp = (v, min, max) => Math.max(min, Math.min(v, max));
const stripSuffix = (name) => (name || "").trim().replace(/\s*-\s*\d+$/, "");
const toSlug = (s) =>
  (s || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s/g, "_");

/* ------------------- Portrait ------------------- */
function Portrait({ name, size = 160 }) {
  const exts = ["webp", "png", "jpg", "jpeg"];
  const [idx, setIdx] = useState(0);
  const base = toSlug(stripSuffix(name)) || "unknown";
  const src = `/creatureimages/${base}.${exts[idx]}`;

  return (
    <img
      src={src}
      alt={name || "Creature portrait"}
      onError={() => setIdx((i) => (i + 1 < exts.length ? i + 1 : i))}
      style={{
        width: size,
        height: size,
        objectFit: "cover",
        borderRadius: 16,
        boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
        border: "2px solid rgba(255,255,255,0.15)",
        background:
          "linear-gradient(145deg, rgba(40,40,50,0.6), rgba(20,20,25,0.6))",
      }}
    />
  );
}

/* ------------------- Health Bar ------------------- */
/**
 * - Green current HP
 * - Teal temp overlay that starts at the end of current HP and can extend beyond the bar
 * - Both widths animate with `transition: width 2s linear`
 */
function HealthBar({ current = 0, total = 1, temp = 0 }) {
  const safeTotal = Math.max(1, Number(total) || 1);
  const safeCurrent = Math.max(0, Math.min(Number(current) || 0, safeTotal));
  const safeTemp = Math.max(0, Number(temp) || 0);

  const pctCurrent = (safeCurrent / safeTotal) * 100;
  const pctWithTemp = (Math.min(safeCurrent + safeTemp, safeTotal + safeTemp) / safeTotal) * 100; 
  // Note: pctWithTemp can exceed 100 to “hang” off the right side (overflow: visible)

  const barCommon = {
    height: "100%",
    transition: "width 2s linear",
    willChange: "width",
  };

  return (
    <div style={{ marginTop: 10 }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 24,
          borderRadius: 12,
          background: "linear-gradient(180deg, #222 0%, #111 100%)",
          overflow: "visible",
          boxShadow: "inset 0 2px 6px rgba(0,0,0,0.6)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        {/* TEMP underlay (teal) — stretches from 0 to current+temp so no seam */}
        <div
          style={{
            ...barCommon,
            position: "absolute",
            left: 0,
            top: 0,
            width: `${pctWithTemp}%`,
            borderTopLeftRadius: 12,
            borderBottomLeftRadius: 12,
            borderTopRightRadius: 12,   // looks nice when it extends
            borderBottomRightRadius: 12,
            background:
              "linear-gradient(180deg, rgba(80,220,220,0.80), rgba(30,160,160,0.80))",
            boxShadow: "0 0 12px rgba(80,200,200,0.35)",
            zIndex: 1,
          }}
        />

        {/* CURRENT overlay (green) — sits on top from 0 to current */}
        <div
          style={{
            ...barCommon,
            position: "absolute",
            left: 0,
            top: 0,
            width: `${pctCurrent}%`,
            borderTopLeftRadius: 12,
            borderBottomLeftRadius: 12,
            // square off the right edge if temp exists beyond current, so it
            // visually “merges” into the teal underlay without any curvature gap
            borderTopRightRadius: safeTemp > 0 && safeCurrent < safeTotal ? 0 : 12,
            borderBottomRightRadius: safeTemp > 0 && safeCurrent < safeTotal ? 0 : 12,
            background:
              "linear-gradient(180deg, rgba(80,220,140,0.95), rgba(30,140,90,0.95))",
            boxShadow: "0 0 10px rgba(60,200,130,0.35)",
            zIndex: 2,
          }}
        />

        {/* Gloss */}
        <div
          style={{
            pointerEvents: "none",
            position: "absolute",
            left: 0,
            top: 0,
            height: "45%",
            width: "100%",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0))",
            zIndex: 3,
          }}
        />
      </div>

      <div
        style={{
          marginTop: 6,
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "system-ui, sans-serif",
          fontSize: 14,
          color: "#eaeaea",
          opacity: 0.9,
        }}
      >
        <span>
          <strong>HP:</strong> {safeCurrent} / {safeTotal}
        </span>
        <span>
          <strong>Temp:</strong> {safeTemp}
        </span>
      </div>
    </div>
  );
}

/* ------------------- Condition Picker ------------------- */
function ConditionPicker({ allConditions, selected = [], onToggle }) {
  const [open, setOpen] = useState(false);

  const chipsStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  };
  const chipStyle = {
    padding: "2px 8px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#eaeaea",
    fontSize: 12,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };
  const removeBtnStyle = {
    cursor: "pointer",
    border: "none",
    background: "transparent",
    color: "#aaa",
    fontSize: 14,
    lineHeight: 1,
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          padding: "8px 12px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.15)",
          background: "rgba(255,255,255,0.05)",
          color: "#eaeaea",
          cursor: "pointer",
          minWidth: 160,
          textAlign: "left",
        }}
      >
        Statuses {selected.length ? `(${selected.length})` : ""}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            marginTop: 6,
            zIndex: 10,
            minWidth: 280,
            maxHeight: 300,
            overflowY: "auto",
            background: "rgba(22,24,32,0.98)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
            padding: 8,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {allConditions.map((cond) => {
            const checked = !!selected.includes(cond);
            return (
              <label
                key={cond}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: 8,
                  color: "#ddd",
                  cursor: "pointer",
                  background: checked ? "rgba(80,140,220,0.15)" : "transparent",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(cond)}
                />
                <span>{cond}</span>
              </label>
            );
          })}
        </div>
      )}

      {/* Selected chips */}
      <div style={chipsStyle}>
        {selected.map((cond) => (
          <span key={cond} style={chipStyle}>
            {cond}
            <button
              title="Remove"
              style={removeBtnStyle}
              onClick={() => onToggle(cond)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------- Main Component ------------------- */
export default function PlayerPage() {
  const [step, setStep] = useState("join");           // "join" -> "pick" -> "play"
  const [code, setCode] = useState("");
  const [encounter, setEncounter] = useState(null);   // snapshot from backend
  const [playerToken, setPlayerToken] = useState(null);
  const [myCreatureId, setMyCreatureId] = useState(null);
  const [me, setMe] = useState(null);                 // live creature state

  const [amount, setAmount] = useState(1);            // heal/damage (+/-)
  const [tempAmount, setTempAmount] = useState(1);    // temp +N

  // Sounds
  const healSound = useRef(null);
  const dmgSound  = useRef(null);

  useEffect(() => {
    healSound.current = () => new Audio("/Sound/heal.mp3");
    dmgSound.current  = () => new Audio("/Sound/damage.mp3");
  }, []);

  // Socket
  const socket = useMemo(() => {
    if (!encounter?.id || !playerToken) return null;
    return io(window.location.origin, {
      path: "/socket.io",
      autoConnect: false,
      auth: {
        role: "player",
        encounterId: encounter.id,
        token: playerToken,
      },
    });
  }, [encounter?.id, playerToken]);

  // Join by code -> load encounter snapshot
  const joinEncounter = async () => {
    const joinCode = code.trim().toUpperCase();
    const resp = await fetch(`/api/encounter/code/${encodeURIComponent(joinCode)}`);
    if (!resp.ok) {
      const text = await resp.text();
      alert(`Join failed (${resp.status}): ${text}`);
      return;
    }
    const data = await resp.json();
    setEncounter(data);
    setStep("pick");
  };

  // Claim a PC (only once)
  const claimCreature = async (creatureId) => {
    const resp = await fetch(`/api/encounter/${encounter.id}/join`, {
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

  // Connect socket & keep my creature in sync (also picks up DM-side edits)
  useEffect(() => {
    if (!socket) return;
    socket.connect();

    socket.on("encounter:state", (s) => {
      setEncounter(s);
      const mine = (s.creatures || []).find((c) => c?.id === myCreatureId);
      if (mine) {
        setMe({
          id: mine.id,
          name: mine.name,
          total_hp: mine.total_hp,
          current_hp: mine.current_hp,
          temp_hp: mine.temp_hp,
          conditions: Array.isArray(mine.conditions) ? mine.conditions : []
        });
      }
    });

    socket.on("creature:update", ({ creatureId, patch }) => {
      if (creatureId === myCreatureId) {
        setMe((prev) =>
          prev
            ? {
                ...prev,
                current_hp:
                  typeof patch.current_hp === "number"
                    ? patch.current_hp
                    : prev.current_hp,
                temp_hp:
                  typeof patch.temp_hp === "number"
                    ? patch.temp_hp
                    : prev.temp_hp,
                conditions: Array.isArray(patch.conditions)
                  ? patch.conditions
                  : prev.conditions,
              }
            : prev
        );
      }
    });

    socket.on("turn:state", () => {});

    return () => socket.disconnect();
  }, [socket, myCreatureId]);

  /* ------------------- Emit updates + SFX ------------------- */
  const playSfx = (type /* 'heal' | 'damage' */) => {
    try {
      const create = type === "heal" ? healSound.current : dmgSound.current;
      const a = create ? create() : null;
      if (a) {
        a.currentTime = 0;
        a.play().catch(() => {});
      }
    } catch {}
  };

  // Damage consumes temp first; heal goes to current (capped by total)
  const sendHPDelta = (delta) => {
    if (!socket || !me) return;

    const total = Math.max(1, Number(me.total_hp) || 1);
    const curr = clamp(Number(me.current_hp) || 0, 0, total);
    const temp = Math.max(0, Number(me.temp_hp) || 0);

    if (delta < 0) {
      let dmg = Math.abs(delta);
      let nextTemp = temp;
      let nextCurr = curr;

      if (nextTemp >= dmg) {
        nextTemp = nextTemp - dmg;     // all soaked by temp
      } else {
        const remaining = dmg - nextTemp;
        nextTemp = 0;
        nextCurr = clamp(nextCurr - remaining, 0, total);
      }

      socket.emit("creature:update", {
        creatureId: myCreatureId,
        patch: { current_hp: nextCurr, temp_hp: nextTemp },
      });

      playSfx("damage"); // syncs with 2s CSS animation
      return;
    }

    // Heal (delta >= 0): only affects current HP, capped by total
    const nextCurr = clamp(curr + delta, 0, total);
    socket.emit("creature:update", {
      creatureId: myCreatureId,
      patch: { current_hp: nextCurr },
    });

    playSfx("heal"); // syncs with 2s CSS animation
  };

    const addTemp = (n) => {
    if (!socket || !me) return;
    const next = Math.max(0, (Number(me.temp_hp) || 0) + n);
    socket.emit("creature:update", {
        creatureId: myCreatureId,
        patch: { temp_hp: next },
    });
    // Play heal SFX to match the bar's 2s animation
    playSfx("heal");
    };


  const clearTemp = () => {
    if (!socket || !me) return;
    socket.emit("creature:update", {
      creatureId: myCreatureId,
      patch: { temp_hp: 0 },
    });
  };

  const toggleCondition = (cond) => {
    if (!socket || !me) return;
    const next = new Set(me.conditions || []);
    if (next.has(cond)) next.delete(cond);
    else next.add(cond);
    socket.emit("creature:update", {
      creatureId: myCreatureId,
      patch: { conditions: Array.from(next) },
    });
  };

  /* ------------------- Render ------------------- */
  if (step === "join") {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2 style={styles.h2}>Join Encounter</h2>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter join code"
            style={styles.input}
          />
          <button onClick={joinEncounter} style={styles.primaryBtn}>
            Join
          </button>
        </div>
      </div>
    );
  }

  if (step === "pick") {
    if (!encounter) return null;

    const claimed = encounter.claims || {};
    const pcs = (encounter.creatures || []).filter(
      (c) => (c?.type || "PC") === "PC" && !claimed[c.id]
    );
    const already = (encounter.creatures || []).filter(
      (c) => (c?.type || "PC") === "PC" && claimed[c.id]
    );

    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2 style={styles.h2}>Select Your Character</h2>
          {pcs.length === 0 && <p>No available player characters to claim.</p>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {pcs.map((c) => (
              <button
                key={c.id}
                onClick={() => claimCreature(c.id)}
                style={styles.primaryBtn}
              >
                {c.name}
              </button>
            ))}
          </div>

          {already.length > 0 && (
            <>
              <div style={{ height: 8 }} />
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  opacity: 0.65,
                }}
              >
                {already.map((c) => (
                  <button key={c.id} disabled style={styles.secondaryBtn}>
                    {c.name} (claimed)
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (step === "play") {
    if (!me) return <div style={{ padding: 20 }}>Loading your character…</div>;

    return (
      <div style={styles.page}>
        <div style={{ ...styles.card, maxWidth: 920, width: "100%" }}>
          {/* Header with portrait + HP */}
          <div
            style={{
              display: "flex",
              gap: 16,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <Portrait name={me.name} size={160} />
            <div style={{ flex: 1 }}>
              <h2 style={{ ...styles.h2, marginBottom: 6 }}>{me.name}</h2>
              <HealthBar
                current={me.current_hp ?? 0}
                total={me.total_hp ?? 1}
                temp={me.temp_hp ?? 0}
              />
            </div>
          </div>

          <div style={{ height: 12 }} />

          {/* Heal/Damage */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <label style={styles.label}>
              Amount:&nbsp;
              <select
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value, 10))}
                style={styles.select}
              >
                {AMOUNTS.map((v) => (
                  <option key={v} value={v}>
                    {v > 0 ? `+${v}` : v}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => sendHPDelta(amount)}
              style={amount >= 0 ? styles.healBtn : styles.damageBtn}
            >
              {amount >= 0 ? "Heal" : "Damage"}
            </button>
          </div>

          <div style={{ height: 10 }} />

          {/* Temp HP */}
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ color: "#eaeaea" }}>
              <strong>Temp HP:</strong> {me.temp_hp ?? 0}
            </div>
            <label style={styles.label}>
              Add:&nbsp;
              <select
                value={tempAmount}
                onChange={(e) => setTempAmount(parseInt(e.target.value, 10))}
                style={styles.select}
              >
                {TEMP_RANGE.map((v) => (
                  <option key={v} value={v}>
                    +{v}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={() => addTemp(tempAmount)} style={styles.secondaryBtn}>
              Add Temp
            </button>
            <button onClick={clearTemp} style={styles.secondaryBtn}>
              Clear Temp
            </button>
          </div>

          {/* Conditions */}
          <div style={{ marginTop: 16 }}>
            <div
              style={{ color: "#eaeaea", fontWeight: 700, marginBottom: 6 }}
            >
              Conditions
            </div>
            <ConditionPicker
              allConditions={CONDITIONS}
              selected={me?.conditions || []}
              onToggle={(cond) => toggleCondition(cond)}
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/* ------------------- Styles ------------------- */
const styles = {
  page: {
    minHeight: "100vh",
    padding: 20,
    background:
      "radial-gradient(1200px 600px at 20% 0%, rgba(76,56,120,0.25), transparent), radial-gradient(800px 600px at 100% 0%, rgba(30,40,80,0.25), transparent), #0f1115",
  },
  card: {
    margin: "0 auto",
    padding: 16,
    borderRadius: 16,
    background: "rgba(22,24,32,0.9)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
  },
  h2: {
    margin: 0,
    fontSize: 24,
    color: "#f3f3f3",
    letterSpacing: 0.3,
  },
  input: {
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.05)",
    color: "#f1f1f1",
    outline: "none",
    width: 220,
    marginRight: 8,
  },
  label: { color: "#dcdcdc" },
  select: {
    padding: "6px 8px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.05)",
    color: "#eaeaea",
    outline: "none",
  },
  primaryBtn: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background:
      "linear-gradient(180deg, rgba(90,140,250,0.9), rgba(60,90,210,0.9))",
    color: "white",
    cursor: "pointer",
  },
  secondaryBtn: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.05)",
    color: "#eaeaea",
    cursor: "pointer",
  },
  healBtn: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background:
      "linear-gradient(180deg, rgba(50,180,120,0.95), rgba(30,130,90,0.95))",
    color: "white",
    cursor: "pointer",
  },
  damageBtn: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background:
      "linear-gradient(180deg, rgba(210,70,70,0.95), rgba(160,40,40,0.95))",
    color: "white",
    cursor: "pointer",
  },
};
