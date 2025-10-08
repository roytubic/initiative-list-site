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

  const [turnIndex, setTurnIndex] = useState(null);

  const [encounterId, setEncounterId] = useState(null);
  const [dmToken, setDmToken] = useState(null);
  const [joinCode, setJoinCode] = useState(null);

  const uid = () =>  (crypto?.randomUUID?.() || `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`);

  const [activeId, setActiveId] = useState(null);
  const toId = (v) => (v == null ? null : String(v));

  // DM socket – only connect when we have id + token
  const socket = useMemo(() => {
    if (!encounterId || !dmToken) return null;

    const s = io({
      autoConnect: false,
      path: "/socket.io", // explicitly set path
      transports: ["websocket", "polling"], // fallback to polling
      auth: { role: "dm", encounterId, token: dmToken },
      query: { role: "dm", encounterId, token: dmToken }, // fallback if server reads query params
    });

    return s;
  }, [encounterId, dmToken]);

  useEffect(() => {
    if (!socket) return;

    const onConnect = () => console.log("✅ DM socket connected");
    const onError = (err) => console.warn("⚠️ DM socket connect_error:", err?.message || err);

    socket.on("connect", onConnect);
    socket.on("connect_error", onError);

    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onError);
      socket.disconnect();
    };
  }, [socket]);

  // Receive ENCOUNTER_READY from the popup (with id + token + code)
  useEffect(() => {
    const onMsg = (e) => {
      if (e.data?.type === "ENCOUNTER_READY") {
        setEncounterId(e.data.id);
        setDmToken(e.data.dmToken);
        setJoinCode(e.data.code || null);
      } else if (["TURN_STATE", "TURN_UPDATE"].includes(e.data?.type)) {
        if (typeof e.data.turnIndex === "number") setTurnIndex(e.data.turnIndex);
        if (e.data.activeCreatureId != null) setActiveId(toId(e.data.activeCreatureId));
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  useEffect(() => {
    if (turnIndex == null) return;

    const order = [...creatures]
      .filter(Boolean)
      .sort(
        (a, b) =>
          (b.initiative ?? 0) - (a.initiative ?? 0) ||
          String(a.name ?? "").localeCompare(String(b.name ?? "")) ||
          String(a.id ?? "").localeCompare(String(b.id ?? ""))
      );

    const idAtIndex = order[turnIndex]?.id ?? null;
    setActiveId(toId(idAtIndex));
  }, [creatures, turnIndex]);


  // Connect DM socket & keep list synced from server
  useEffect(() => {
    if (!socket) return;
    socket.connect();

    socket.on("encounter:state", (s) => {
      const mapped = (s.creatures || []).filter(Boolean).map((c) => ({
        id: c.id || uid(),    // ensure unique id
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
      // Accept any of these from your server (use whichever you emit):
      const maybeActiveId =
        s.activeCreatureId ??
        s.active_id ??
        s.turn?.activeId ??
        s.turn?.active_id ??
        null;
      if (maybeActiveId != null) setActiveId(toId(maybeActiveId));

      if (typeof s.turn?.turnIndex === "number") {
        setTurnIndex(s.turn.turnIndex);
      }
    });

    socket.on("turn:state", (t) => {
      if (typeof t.turnIndex === "number") setTurnIndex(t.turnIndex);
      const maybeId = t.activeCreatureId ?? t.active_id ?? t.id ?? null;
      if (maybeId != null) setActiveId(toId(maybeId));
    });

    socket.on("turn:update", (t) => {
      if (typeof t.turnIndex === "number") setTurnIndex(t.turnIndex);
      const maybeId = t.activeCreatureId ?? t.active_id ?? t.id ?? null;
      if (maybeId != null) setActiveId(toId(maybeId));
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

  useEffect(() => {
    console.log("ActiveId:", activeId);
    console.log("TurnIndex:", turnIndex);
  }, [activeId, turnIndex]);

  // ---------- Add / Update / Remove with hardening ----------
  const addCreatures = (proto, qty) => {
    if (!proto || !proto.name?.trim()) return;
    setCreatures((prev) => {
      const next = prev.filter(Boolean).slice();
      const base = stripSuffix(proto.name);
      const count = Math.max(1, Math.min(20, Number(qty) || 1));

      for (let k = 0; k < count; k++) {
        const sameBase = next.filter((c) => stripSuffix(c.name) === base);
        if (sameBase.length === 0) {
          next.push({ ...proto, id: uid(), name: base });
        } else {
          if (sameBase.some((c) => !hasSuffix(c.name))) {
            next.forEach((c) => {
              if (c && stripSuffix(c.name) === base && !hasSuffix(c.name))
                c.name = `${base}-1`;
            });
          }
          const maxN = next.reduce((m, c) => {
            if (!c || stripSuffix(c.name) !== base) return m;
            const match = /-(\d+)$/.exec(c.name || "");
            return match ? Math.max(m, parseInt(match[1], 10)) : m;
          }, 0);
          next.push({ ...proto, id: uid(), name: `${base}-${maxN + 1}` });
        }
      }

      const cleaned = next
        .filter(Boolean)
        .sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0));
      scheduleServerSync(cleaned);
      return cleaned;
    });
  };

  const handleRemove = (id) => {
    setCreatures((prev) => {
      const next = prev.filter((c) => c.id !== id);
      scheduleServerSync(next);
      return next;
    });
  };

  const handleUpdate = (updated) => {
    if (!updated?.id) return;
    setCreatures((prev) => {
      const next = prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)).sort((a,b)=> (b.initiative??0) - (a.initiative??0));
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
              activeId={activeId} 
              onUpdate={handleUpdate}
              onRemove={handleRemove}
              dmControls={!!socket?.connected}
              onPatch={socket ? emitPatch : undefined}
            />
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.formChrome}>
            <RunInitiative creatures={creatures} />
          </div>
        </div>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <button onClick={prevTurn} disabled={!socket?.connected} style={styles.prevBtn}>
            ⬅ Prev Turn
          </button>{" "}
          <button onClick={nextTurn} disabled={!socket?.connected} style={styles.nextBtn}>
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

