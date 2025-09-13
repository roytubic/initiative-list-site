// src/components/SearchableSelect.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

export default function SearchableSelect({ options, value, onChange, placeholder="— Choose —" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef(null);
  const norm = (s) => (s || "").toLowerCase();

  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return options;
    return options.filter((o) => norm(o.label).includes(q));
  }, [options, query]);

  useEffect(() => {
    const onDoc = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    // keep input in sync with current value
    setQuery(value?.label || "");
  }, [value]);

  const base = {
    padding: "6px 8px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255, 255, 255, 0.57)",
    color: "#1a1a1a",
    outline: "none",
    display: "block",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div ref={boxRef} style={{ position: "relative", width: "100%"  }}>
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Type to search…"
        style={base}
      />
      {open && (
        <div
          style={{
            position: "absolute",
            zIndex: 5000,
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            maxHeight: 260,
            overflowY: "auto",
            background: "rgba(22,24,32,0.98)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
          }}
        >
          <div style={{ padding: "6px 8px", color: "#bdbdbd" }}>{placeholder}</div>
          {filtered.map((o) => (
            <div
              key={o.value}
              onClick={() => { onChange(o); setOpen(false); }}
              style={{
                padding: "6px 8px",
                cursor: "pointer",
                background:
                  value?.value === o.value ? "rgba(255,255,255,0.06)" : "transparent",
              }}
            >
              {o.label}
            </div>
          ))}
          {!filtered.length && (
            <div style={{ padding: "6px 8px", color: "#999" }}>No matches</div>
          )}
        </div>
      )}
    </div>
  );
}
