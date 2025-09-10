// src/InitiativeTracker.jsx
import React, { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import CreatureForm from "./CreatureForm";
import CreatureList from "./CreatureList";
import RunInitiative from "./RunInitiative";

// Safe helpers
const stripSuffix = (name) => (name || "").trim().replace(/\s*-\s*\d+$/, "");
const hasSuffix = (name) => /-\d+$/.test(name || "");

export default function InitiativeTracker() {
  const [creatures, setCreatures] = useState([]);

  const [encounterId, setEncounterId] = useState(null);
  const [dmToken, setDmToken] = useState(null);
  const [joinCode, setJoinCode] = useState(null);

  // DM socket – only connect when we have id + token
  const socket = useMemo(() => {
    if (!encounterId || !dmToken) return null;
    return io({
      autoConnect: false,
      auth: { role: "dm", encounterId, token: dmToken },
    });
  }, [encounterId, dmToken]);

  // Receive ENCOUNTER_READY from the popup (with id + token + code)
  useEffect(() => {
    const onMsg = (e) => {
      if (e.data?.type === "ENCOUNTER_READY") {
        setEncounterId(e.data.id);
        setDmToken(e.data.dmToken);
        setJoinCode(e.data.code || null);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Connect DM socket & keep list synced from server
  useEffect(() => {
    if (!socket) return;
    socket.connect();

    socket.on("encounter:state", (s) => {
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
          conditions: c.conditions || [],
        }));
      setCreatures(mapped);
    });

    socket.on("creature:update", ({ creatureId, patch }) => {
      setCreatures((prev) =>
        prev
          .filter(Boolean)
          .map((c) =>
            c.id === creatureId
              ? {
                  ...c,
                  health:
                    typeof patch.current_hp === "number"
                      ? patch.current_hp
                      : c.health,
                  tempHP:
                    typeof patch.temp_hp === "number" ? patch.temp_hp : c.tempHP,
                  conditions: Array.isArray(patch.conditions)
                    ? patch.conditions
                    : c.conditions,
                }
              : c
          )
      );
    });

    return () => socket.disconnect();
  }, [socket]);

  // ---------- Add / Update / Remove with hardening ----------
  const addCreatures = (proto, qty) => {
    if (!proto || typeof proto.name !== "string" || proto.name.trim() === "") {
      console.warn("addCreatures ignored invalid proto:", proto);
      return;
    }

    setCreatures((prev) => {
      const next = prev.filter(Boolean).slice();
      const base = stripSuffix(proto.name);
      const count = Math.max(1, Math.min(20, Number(qty) || 1));

      for (let k = 0; k < count; k++) {
        const sameBaseIdxs = next
          .map((c, i) => ({ c, i }))
          .filter(({ c }) => c && stripSuffix(c.name) === base);

        if (sameBaseIdxs.length === 0) {
          next.push({ ...proto, name: base });
        } else {
          const idxUnsuffixed = sameBaseIdxs.find(
            ({ c }) => c && !hasSuffix(c.name)
          );
          if (idxUnsuffixed) {
            const { i } = idxUnsuffixed;
            next[i] = { ...next[i], name: `${base}-1` };
          }

          let maxN = 0;
          for (const c of next) {
            if (!c) continue;
            if (stripSuffix(c.name) !== base) continue;
            const m = (c.name || "").match(/-(\d+)$/);
            if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
          }

          next.push({ ...proto, name: `${base}-${maxN + 1}` });
        }
      }

      const cleaned = next
        .filter(Boolean)
        .sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0));

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
      type: c.type || "PC",
      alignment: c.alignment || "Good",
      initiative: c.initiative ?? 0,
      total_hp: c.totalHealth ?? Math.max(1, Number(c.health ?? 1)),
      current_hp: c.health ?? 0,
      temp_hp: c.tempHP ?? 0,
      conditions: Array.isArray(c.conditions) ? c.conditions : [],
    }));

    fetch(`/api/encounter/${encounterId}/creatures`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dmToken, creatures: payload }),
    }).catch(() => {});
  };

  // DM emits a patch to the server (called from CreatureItem via onPatch)
  const emitPatch = (creatureId, patch) => {
    if (!socket) return;
    socket.emit("creature:update", { creatureId, patch });
  };

  // Turn controls -> server
  const prevTurn = () => socket && socket.emit("turn:prev");
  const nextTurn = () => socket && socket.emit("turn:next");

  // ---------- Render ----------
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {joinCode && (
          <div style={styles.joinCodeBox}>
            <span style={styles.joinLabel}>Join Code:</span>{" "}
            <span style={styles.joinCode}>{joinCode}</span>
          </div>
        )}

        <div style={styles.section}>
          {/* Make embedded components readable on dark background */}
          <div style={styles.formChrome}>
            <CreatureForm addCreatures={addCreatures} />
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.listChrome}>
            <CreatureList
              creatures={creatures}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
              dmControls
              onPatch={emitPatch}
            />
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.formChrome}>
            <RunInitiative creatures={creatures} />
          </div>
        </div>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <button onClick={prevTurn} disabled={!socket} style={styles.prevBtn}>
            ⬅ Prev Turn
          </button>{" "}
          <button onClick={nextTurn} disabled={!socket} style={styles.nextBtn}>
            Next Turn ➡
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */
const baseInput = {
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.06)",
  color: "#eaeaea",
  outline: "none",
};

const styles = {
  page: {
    minHeight: "100vh",
    padding: 24,
    background:
      "radial-gradient(1200px 600px at 20% 0%, rgba(76,56,120,0.25), transparent), radial-gradient(800px 600px at 100% 0%, rgba(30,40,80,0.25), transparent), #0f1115",
  },
  card: {
    margin: "0 auto",
    padding: 20,
    borderRadius: 16,
    background: "rgba(22,24,32,0.92)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
    maxWidth: 1080,
    color: "#eaeaea", // <— ensures text inside is visible
  },
  joinCodeBox: {
    marginBottom: 20,
    padding: "10px 14px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.05)",
    fontFamily: "monospace",
    fontSize: 18,
    letterSpacing: 1,
    display: "inline-block",
  },
  joinLabel: { color: "#bdbdbd", marginRight: 6 },
  joinCode: { color: "#f3f3f3", fontWeight: "bold" },
  section: {
    marginBottom: 24,
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,255,255,0.02)",
  },

  // Visual chrome for embedded components (inputs & buttons become visible)
  formChrome: {
    display: "grid",
    gap: 8,
  },
  listChrome: {
    display: "grid",
    gap: 12,
  },

  // Button themes
  prevBtn: {
    padding: "10px 16px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background:
      "linear-gradient(180deg, rgba(210,70,70,0.95), rgba(160,40,40,0.95))",
    color: "white",
    fontSize: 16,
    cursor: "pointer",
  },
  nextBtn: {
    padding: "10px 16px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background:
      "linear-gradient(180deg, rgba(50,180,120,0.95), rgba(30,130,90,0.95))",
    color: "white",
    fontSize: 16,
    cursor: "pointer",
  },
};

// Optional: if CreatureForm / CreatureList render native <input>/<select>/<button>
// and look too dark, add inline props there OR add a tiny CSS file.
// If you’d like, I can also give you a tiny CSS snippet to apply these:
// input, select { ...baseInput }  button { ...gradient like above }

