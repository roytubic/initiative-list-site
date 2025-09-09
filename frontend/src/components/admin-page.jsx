// frontend/src/components/admin-page.jsx
import React, { useEffect, useRef, useState, forwardRef } from "react";
import { Link } from "react-router-dom";

const API_BASE = (() => {
  if (typeof window === "undefined") return "";
  const p = window.location.port;
  if (p === "3001" || p === "5173") return "http://localhost:3000";
  return ""; // same-origin (prod: backend serves build)
})();

async function getJson(url) {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`);
  return r.json();
}

const IMG_EXTS = [".png", ".jpg", ".jpeg", ".webp"];

const imageLoads = (url) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url + (url.includes("?") ? "&" : "?") + "cb=" + Date.now();
  });

const localImageUrlsForName = (name) => {
  const base = "/creatureimages/" + encodeURIComponent(name || "");
  return IMG_EXTS.map((ext) => base + ext);
};

export default function AdminPage() {
  const [tab, setTab] = useState("NPC");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // UNCONTROLLED top form
  const nameRef = useRef(null);
  const hpRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePathEditing, setImagePathEditing] = useState(null);

  const [imgFlags, setImgFlags] = useState({});
  const inputRefs = useRef({});

  const stopGlobalHotkeys = (e) => {
    e.stopPropagation();
    if (e.nativeEvent?.stopImmediatePropagation) e.nativeEvent.stopImmediatePropagation();
  };

  useEffect(() => {
    const prev = window.__suppressHotkeys;
    window.__suppressHotkeys = true;
    return () => { window.__suppressHotkeys = prev || false; };
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getJson(`${API_BASE}/api/catalog/${tab}`);
      setRows(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    setEditingId(null);
    setImageFile(null);
    setImagePathEditing(null);
    if (nameRef.current) nameRef.current.value = "";
    if (hpRef.current) hpRef.current.value = "";
  }, [tab]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = {};
      for (const r of rows) {
        let local = false;
        for (const url of localImageUrlsForName(r.name || "")) {
          // eslint-disable-next-line no-await-in-loop
          if (await imageLoads(url)) { local = true; break; }
        }
        let uploaded = false;
        if (r.image_path) {
          // eslint-disable-next-line no-await-in-loop
          uploaded = await imageLoads(r.image_path);
        }
        next[r.id] = { local, uploaded };
      }
      if (!cancelled) setImgFlags(next);
    })();
    return () => { cancelled = true; };
  }, [rows]);

  const resetForm = () => {
    setEditingId(null);
    setImageFile(null);
    setImagePathEditing(null);
    if (nameRef.current) nameRef.current.value = "";
    if (hpRef.current) hpRef.current.value = "";
  };

  const uploadImage = async (file) => {
    if (!file) return null;
    const fd = new FormData();
    fd.append("image", file);
    const r = await fetch(`${API_BASE}/api/catalog/upload-image`, {
      method: "POST",
      body: fd,
    });
    if (!r.ok) throw new Error("upload failed");
    const j = await r.json();
    return j.image_path;
  };

  const readDrafts = () => {
    const name = (nameRef.current?.value || "").trim();
    const hpRaw = (hpRef.current?.value || "").trim();
    const hpNum = hpRaw === "" ? null : Number(hpRaw);
    return { name, hp: hpNum };
  };

  const saveRow = async () => {
    try {
      const { name, hp } = readDrafts();
      if (!name) { alert("Name is required"); return; }

      let image_path = imagePathEditing || null;
      if (imageFile) image_path = await uploadImage(imageFile);

      const payload = { type: tab, name, default_health: hp, image_path };

      if (editingId) {
        await fetch(`${API_BASE}/api/catalog/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`${API_BASE}/api/catalog`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      await load();
      resetForm();
    } catch (e) {
      alert(`Save failed: ${e.message}`);
    }
  };

  const removeRow = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    await fetch(`${API_BASE}/api/catalog/${id}`, { method: "DELETE" });
    load();
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setImagePathEditing(row.image_path || null);
    setImageFile(null);
    if (nameRef.current) nameRef.current.value = row.name || "";
    if (hpRef.current) hpRef.current.value = row.default_health == null ? "" : String(row.default_health);
  };

  const updateHP = async (row, newHP) => {
    await fetch(`${API_BASE}/api/catalog/${row.id}/hp`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ default_health: newHP === "" ? null : Number(newHP) }),
    });
    load();
  };

  const uploadForRow = async (row, file) => {
    if (!file) return;
    try {
      const image_path = await uploadImage(file);
      await fetch(`${API_BASE}/api/catalog/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: row.type,
          name: row.name,
          default_health: row.default_health,
          image_path,
        }),
      });
      await load();
    } catch (e) {
      alert(`Upload failed: ${e.message}`);
    }
  };

  const exportSeed = async () => {
    try {
      const [pcs, npcs, monsters] = await Promise.all([
        getJson(`${API_BASE}/api/catalog/PC`),
        getJson(`${API_BASE}/api/catalog/NPC`),
        getJson(`${API_BASE}/api/catalog/Monster`),
      ]);

      const toLines = (arr) =>
        arr
          .map(
            (r) =>
              `  { name: ${JSON.stringify(r.name)}, health: ${
                r.default_health === null || r.default_health === undefined ? "null" : Number(r.default_health)
              } }`
          )
          .join(",\n");

      const code =
        "const characters = [\n" + toLines(pcs) + "\n];\n\n" +
        "const npcs = [\n" + toLines(npcs) + "\n];\n\n" +
        "const monsters = [\n" + toLines(monsters) + "\n];\n";

      const blob = new Blob([code], { type: "application/javascript;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "seed.js";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Export failed: ${e.message}`);
    }
  };

  // Field with forwardRef so refs work
  const Field = forwardRef(({ style, ...props }, ref) => (
    <input
      ref={ref}
      onKeyDownCapture={stopGlobalHotkeys}
      onKeyUpCapture={stopGlobalHotkeys}
      style={{
        padding: "6px 8px",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.18)",
        background: "rgba(255,255,255,0.06)",
        color: "#eaeaea",
        outline: "none",
        ...(style || {}),
      }}
      {...props}
    />
  ));

  return (
    <div style={styles.page} data-allow-typing="true">
      <div style={styles.card} onKeyDownCapture={stopGlobalHotkeys} onKeyUpCapture={stopGlobalHotkeys}>
        <header style={styles.header}>
          <h2 style={{ margin: 0 }}>Catalog Admin</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={exportSeed} style={styles.secondaryBtn}>Export Seed JS</button>
            <Link to="/" style={styles.homeLink}>⟵ Home</Link>
          </div>
        </header>

        <div style={styles.tabs}>
          <button onClick={() => setTab("NPC")} style={{ ...styles.tabBtn, ...(tab === "NPC" ? styles.tabActive : {}) }}>NPCs</button>
          <button onClick={() => setTab("Monster")} style={{ ...styles.tabBtn, ...(tab === "Monster" ? styles.tabActive : {}) }}>Monsters</button>
          <button onClick={() => setTab("PC")} style={{ ...styles.tabBtn, ...(tab === "PC" ? styles.tabActive : {}) }}>PCs</button>
        </div>

        {/* Add / Edit */}
        <div style={styles.section}>
          <form onSubmit={(e) => e.preventDefault()}>
            <div style={{ display: "grid", gridTemplateColumns: "220px 140px 1fr 120px", gap: 10, alignItems: "center" }}>
              <Field
                id="admin-name"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder={`${tab} name`}
                ref={nameRef}
                defaultValue=""
              />
              <Field
                id="admin-hp"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                placeholder="Default HP"
                ref={hpRef}
                defaultValue=""
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                style={{ color: "#eaeaea" }}
                onKeyDownCapture={stopGlobalHotkeys}
                onKeyUpCapture={stopGlobalHotkeys}
              />
              <button type="button" onClick={saveRow} style={styles.primaryBtn}>
                {editingId ? "Update" : "Add"}
              </button>
            </div>
          </form>

          {imagePathEditing && (
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
              Current uploaded image: <code>{imagePathEditing}</code>
            </div>
          )}
        </div>

        {/* List + quick HP edit */}
        <div style={styles.section}>
          {loading ? (
            <div>Loading…</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>HP</th>
                  <th style={styles.th}>Image</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const flags = imgFlags[r.id] || { local: false, uploaded: false };
                  return (
                    <tr key={r.id}>
                      <td style={styles.td}>{r.name}</td>
                      <td style={styles.td}>
                        <Field
                          defaultValue={r.default_health ?? ""}
                          onBlur={(e) => updateHP(r, e.target.value)}
                          placeholder="(none)"
                          style={{ width: 90 }}
                        />
                      </td>
                      <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                        {flags.local && <span title="Local asset in /public/creatureimages" style={styles.tickGreen}>✔</span>}
                        {flags.uploaded && <span title="Uploaded image on server" style={styles.tickDim}>✔</span>}
                        {!flags.local && !flags.uploaded && (
                          <>
                            <button
                              type="button"
                              title="Upload image"
                              onClick={() => {
                                const id = "row-up-" + r.id;
                                (inputRefs.current[id] || document.getElementById(id))?.click();
                              }}
                              style={styles.plusBtn}
                            >＋</button>
                            <input
                              id={"row-up-" + r.id}
                              ref={(el) => (inputRefs.current["row-up-" + r.id] = el)}
                              type="file"
                              accept="image/*"
                              style={{ display: "none" }}
                              onChange={(e) => uploadForRow(r, e.target.files?.[0] || null)}
                            />
                          </>
                        )}
                      </td>
                      <td style={styles.td}>
                        <button onClick={() => startEdit(r)} style={styles.smallBtn}>Edit</button>{" "}
                        <button onClick={() => removeRow(r.id)} style={styles.dangerBtn}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <div style={{ marginTop: 8, fontSize: 12, color: "#b5c7e1" }}>
            <span style={styles.tickGreen}>✔</span> Local asset in <code>public/creatureimages</code>{" "}
            <span style={{ marginLeft: 12, ...styles.tickDim }}>✔</span> Uploaded image on server
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: 24,
    background:
      "radial-gradient(1200px 600px at 20% 0%, rgba(76,56,120,0.25), transparent), radial-gradient(800px 600px at 100% 0%, rgba(30,40,80,0.25), transparent), #0f1115",
    display: "grid",
    placeItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 1000,
    padding: 20,
    borderRadius: 16,
    background: "rgba(22,24,32,0.92)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
    color: "#eaeaea",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  homeLink: { color: "#9ecbff", textDecoration: "none" },
  tabs: { display: "flex", gap: 8, marginTop: 10, marginBottom: 10 },
  tabBtn: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
  },
  tabActive: {
    background: "linear-gradient(180deg, rgba(90,140,250,0.9), rgba(60,90,210,0.9))",
  },
  section: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    background: "rgba(255,255,255,0.02)",
  },
  primaryBtn: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "linear-gradient(180deg, rgba(50,180,120,0.95), rgba(30,130,90,0.95))",
    color: "white",
    cursor: "pointer",
  },
  secondaryBtn: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "linear-gradient(180deg, rgba(90,140,250,0.9), rgba(60,90,210,0.9))",
    color: "white",
    cursor: "pointer",
  },
  smallBtn: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.10)",
    color: "white",
    cursor: "pointer",
  },
  dangerBtn: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "linear-gradient(180deg, rgba(210,70,70,0.95), rgba(160,40,40,0.95))",
    color: "white",
    cursor: "pointer",
  },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
  },
  th: { textAlign: "left", padding: 8, opacity: 0.85 },
  td: { padding: 8, borderTop: "1px solid rgba(255,255,255,0.08)" },

  tickGreen: { display: "inline-block", color: "#4ade80", fontWeight: 800, marginRight: 8 },
  tickDim: { display: "inline-block", color: "#e2e8f0", opacity: 0.45, fontWeight: 800, marginRight: 8 },
  plusBtn: {
    padding: "2px 8px",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.10)",
    color: "white",
    cursor: "pointer",
    lineHeight: 1.2,
  },
};
