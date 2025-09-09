import React, { useEffect, useMemo, useState } from "react";

const API_BASE = (() => {
  if (typeof window === "undefined") return "";
  const p = window.location.port;
  if (p === "3001" || p === "5173") return "http://localhost:3000";
  return ""; // same-origin
})();

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}

export default function CreatureForm({ addCreatures }) {
  const [pcs, setPcs] = useState([]);
  const [npcs, setNpcs] = useState([]);
  const [monsters, setMonsters] = useState([]);

  const [type, setType] = useState("PC"); // 'PC' | 'NPC' | 'Monster'
  const [qty, setQty] = useState(1);
  const [initiative, setInitiative] = useState("");
  const [nameOverride, setNameOverride] = useState("");
  const [hpOverride, setHpOverride] = useState("");
  const [alignment, setAlignment] = useState("Good");
  const [selectedId, setSelectedId] = useState("");

  // Defaults for alignment by type:
  // PC -> Good, NPC -> Good (green), Monster -> Evil
  useEffect(() => {
    if (type === "Monster") setAlignment("Evil");
    else if (type === "NPC") setAlignment("Good");
    else setAlignment("Good");
    setSelectedId("");
  }, [type]);

  useEffect(() => {
    (async () => {
      try {
        const [pcRows, npcRows, monsterRows] = await Promise.all([
          getJson(`${API_BASE}/api/catalog/PC`),
          getJson(`${API_BASE}/api/catalog/NPC`),
          getJson(`${API_BASE}/api/catalog/Monster`),
        ]);
        setPcs(pcRows);
        setNpcs(npcRows);
        setMonsters(monsterRows);
      } catch (e) {
        console.error("Catalog fetch failed:", e);
      }
    })();
  }, []);

  const list = useMemo(() => {
    return type === "PC" ? pcs : type === "NPC" ? npcs : monsters;
  }, [type, pcs, npcs, monsters]);

  const selected = useMemo(
    () => list.find((r) => String(r.id) === String(selectedId)) || null,
    [list, selectedId]
  );

  const onAdd = () => {
    if (!selected && !nameOverride.trim()) return;

    const baseName = (nameOverride || "").trim() || selected.name;
    const defaultHealth =
      (hpOverride || "").trim() !== ""
        ? Number(hpOverride)
        : selected?.default_health ?? null;

    const proto = {
      id: crypto.randomUUID(),
      name: baseName,
      type,          // 'PC' | 'NPC' | 'Monster'
      alignment,     // 'Good' | 'Neutral' | 'Evil'
      initiative: initiative === "" ? 0 : Number(initiative),
      totalHealth:
        defaultHealth === null || Number.isNaN(defaultHealth)
          ? undefined
          : Number(defaultHealth),
      health:
        defaultHealth === null || Number.isNaN(defaultHealth)
          ? 0
          : Number(defaultHealth),
      tempHP: 0,
      conditions: [],
    };

    addCreatures(proto, qty);

    setNameOverride("");
    setHpOverride("");
    setInitiative("");
    setQty(1);
  };

  const field = {
    padding: "6px 8px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255, 255, 255, 0.57)",
    color: "#1a1a1aff",
    outline: "none",
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, auto)",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={field}
        >
          <option value="PC">Select a PC</option>
          <option value="NPC">Select an NPC</option>
          <option value="Monster">Select a Monster</option>
        </select>

        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={field}
        >
          <option value="">— Choose —</option>
          {list.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} {o.default_health != null ? `(${o.default_health} HP)` : ""}
            </option>
          ))}
        </select>

        <input
          value={initiative}
          onChange={(e) => setInitiative(e.target.value)}
          placeholder="Init"
          style={{ ...field, width: 70 }}
        />
        <input
          value={qty}
          onChange={(e) =>
            setQty(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
          }
          type="number"
          min={1}
          max={20}
          style={{ ...field, width: 60 }}
        />
        <input
          value={nameOverride}
          onChange={(e) => setNameOverride(e.target.value)}
          placeholder="Name (optional)"
          style={{ ...field, width: 180 }}
        />
        <input
          value={hpOverride}
          onChange={(e) => setHpOverride(e.target.value)}
          placeholder="HP (optional)"
          style={{ ...field, width: 120 }}
        />
        <select
          value={alignment}
          onChange={(e) => setAlignment(e.target.value)}
          style={field}
        >
          <option>Good</option>
          <option>Neutral</option>
          <option>Evil</option>
        </select>

        <button
          onClick={onAdd}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.15)",
            background:
              "linear-gradient(180deg, rgba(90,140,250,0.9), rgba(60,90,210,0.9))",
            color: "white",
            cursor: "pointer",
          }}
        >
          Add Creature(s)
        </button>
      </div>
    </div>
  );
}
