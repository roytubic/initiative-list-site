import React, { useEffect, useMemo, useState } from "react";
import SearchableSelect from "./searchableSelect";

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
  const [selectedOpt, setSelectedOpt] = useState(null);

  // Defaults for alignment by type:
  // PC -> Good, NPC -> Good (green), Monster -> Evil
  useEffect(() => {
    setAlignment(type === "Monster" ? "Evil" : "Good");
    setSelectedOpt(null); // reset picker when switching list
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

  const options = useMemo(
    () =>
      list.map((o) => ({
        value: String(o.id),
        label:
          o.default_health != null ? `${o.name} (${o.default_health} HP)` : o.name,
        data: o,
      })),
    [list]
  );

const onAdd = () => {
    // must have either a selection OR a custom name
    const picked = selectedOpt?.data || null;
    const hasCustomName = !!nameOverride.trim();
    if (!picked && !hasCustomName) return;

    const baseName = hasCustomName ? nameOverride.trim() : picked.name;

    const defaultHealth =
      (hpOverride || "").trim() !== ""
        ? Number(hpOverride)
        : picked?.default_health ?? null;

    const proto = {
      // NOTE: InitiativeTracker.addCreatures will assign unique ids per clone,
      // so we don't need to generate one here.
      name: baseName,
      type,
      alignment,
      initiative: initiative === "" ? 0 : Number(initiative),
      totalHealth:
        defaultHealth == null || Number.isNaN(defaultHealth)
          ? undefined
          : Number(defaultHealth),
      health:
        defaultHealth == null || Number.isNaN(defaultHealth)
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
    // keep selection; user often adds multiples of different types
  };

  const row = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  }

 const field = {
    padding: "6px 8px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(187, 187, 187, 0.13)",
    color: "#111111ff",
    outline: "none",
    boxSizing: "border-box",
  };
  
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={row}>
        {/* Type */}
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...field, width: 160 }}>
          <option value="PC">Select a PC</option>
          <option value="NPC">Select an NPC</option>
          <option value="Monster">Select a Monster</option>
        </select>

        {/* Searchable picker (substring match) */}
        <div style={{ flex: "1 1 320px", minWidth: 260, maxWidth: "100%" }}>
          <SearchableSelect
            options={options}
            value={selectedOpt}
            onChange={setSelectedOpt}
            placeholder="Type to search…"
          />
        </div>

        {/* Init / Qty */}
        <input
          value={initiative}
          onChange={(e) => setInitiative(e.target.value)}
          placeholder="Init"
          style={{ ...field, width: 80, flex: "0 0 80px" }}
        />
        <input
          value={qty}
          onChange={(e) => setQty(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
          type="number"
          min={1}
          max={20}
          style={{ ...field, width: 72, flex: "0 0 72px" }}
        />

        {/* Optional name / HP overrides */}
        <input
          value={nameOverride}
          onChange={(e) => setNameOverride(e.target.value)}
          placeholder="Name (optional)"
          style={{ ...field, flex: "1 1 180px", minWidth: 180 }}
        />
        <input
          value={hpOverride}
          onChange={(e) => setHpOverride(e.target.value)}
          placeholder="HP (optional)"
          style={{ ...field, width: 120 }}
        />

        {/* Alignment */}
        <select value={alignment} onChange={(e) => setAlignment(e.target.value)} style={{ ...field, width: 120 }}>
          <option>Good</option>
          <option>Neutral</option>
          <option>Evil</option>
        </select>

        {/* Add button pinned to the right */}
        <button
          onClick={onAdd}
          style={{
            marginLeft: "auto",
            minWidth: 140,
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.15)",
            background: "linear-gradient(180deg, rgba(90,140,250,0.9), rgba(60,90,210,0.9))",
            color: "white",
            cursor: "pointer",
            flex: "0 0 auto", 
          }}
        >
          Add Creature(s)
        </button>
      </div>
    </div>
  );
};