// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import DMPage from "./components/dm-page";
import PlayerPage from "./components/player-page";
import AdminPage from "./components/admin-page"; // ⬅️ add this

function Home() {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <header style={styles.header}>
          <div style={styles.logoCircle}>⚔️</div>
          <div>
            <h1 style={styles.title}>Initiative Tracker</h1>
          </div>
        </header>

        <div style={styles.actions}>
          <Link to="/dm" style={{ textDecoration: "none" }}>
            <button style={{ ...styles.ctaBtn, ...styles.dmBtn }}>
              Dungeon Master
            </button>
          </Link>

          <Link to="/player" style={{ textDecoration: "none" }}>
            <button style={{ ...styles.ctaBtn, ...styles.playerBtn }}>
              Player
            </button>
          </Link>
        </div>

        {/* New admin button row */}
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          <Link to="/admin" style={{ textDecoration: "none" }}>
            <button style={{ ...styles.ctaBtn, ...styles.adminBtn }}>
              DB Admin
            </button>
          </Link>
        </div>

        <div style={styles.tips}>
          <div style={styles.tipItem}>
            <span style={styles.tipTitle}>Hotkeys</span>
            <span>←/→ for Prev/Next turn (DM page)</span>
          </div>
        </div>
      </div>

      <footer style={styles.footer}>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dm" element={<DMPage />} />
        <Route path="/player" element={<PlayerPage />} />
        <Route path="/admin" element={<AdminPage />} /> {/* ⬅️ new route */}
      </Routes>
    </Router>
  );
}

/* ---------- Inline theme to match your dark UI ---------- */
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
    maxWidth: 880,
    padding: 24,
    borderRadius: 20,
    background: "rgba(22,24,32,0.92)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
    color: "#eaeaea",
  },
  header: {
    display: "flex",
    gap: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    fontSize: 26,
    background:
      "linear-gradient(180deg, rgba(80,140,220,0.25), rgba(30,60,130,0.25))",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
  },
  title: {
    margin: 0,
    fontSize: 28,
    letterSpacing: 0.3,
    color: "#f3f3f3",
  },
  actions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 12,
  },
  ctaBtn: {
    width: "100%",
    padding: "14px 18px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.15)",
    color: "white",
    fontSize: 18,
    cursor: "pointer",
    transition: "transform 120ms ease, box-shadow 120ms ease, opacity 120ms",
  },
  dmBtn: {
    background:
      "linear-gradient(180deg, rgba(210,70,70,0.95), rgba(160,40,40,0.95))",
    boxShadow: "0 8px 22px rgba(210,70,70,0.25)",
  },
  playerBtn: {
    background:
      "linear-gradient(180deg, rgba(50,180,120,0.95), rgba(30,130,90,0.95))",
    boxShadow: "0 8px 22px rgba(50,180,120,0.25)",
  },
  adminBtn: {
    background:
      "linear-gradient(180deg, rgba(90,140,250,0.9), rgba(60,90,210,0.9))",
    boxShadow: "0 8px 22px rgba(90,140,250,0.25)",
  },
  tips: {
    marginTop: 16,
    padding: 12,
    borderRadius: 14,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
    display: "grid",
    gap: 8,
  },
  tipItem: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    fontSize: 14,
    opacity: 0.95,
  },
  tipTitle: {
    fontWeight: 700,
    color: "#d7e4ff",
    minWidth: 84,
    display: "inline-block",
  },
  footer: {
    marginTop: 10,
    color: "#a9a9a9",
    fontSize: 12,
    opacity: 0.8,
  },
};
