// src/RunInitiative.jsx
import React, { useRef, useEffect } from "react";
import { io } from "socket.io-client";

const RunInitiative = ({ creatures }) => {
  const newWindowRef = useRef(null);

  const openNewWindow = async () => {
    if (newWindowRef.current && !newWindowRef.current.closed) return;

    // Open popup immediately (prevents blockers)
    newWindowRef.current = window.open("", "_blank", "width=640,height=820");
    newWindowRef.current.document.write(`
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Initiative Tracker</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet" />
          <style>
            :root{
              --bg:#0f1115; --panel:#161820; --ink:#f2f5f7; --muted:#cdd6e0; --line:rgba(255,255,255,0.08);
              --pc:#3f6bd8; --npc:#2eaa6b; --evil:#c43b3b;
              --pc-glow:rgba(63,107,216,0.45); --npc-glow:rgba(46,170,107,0.45); --evil-glow:rgba(196,59,59,0.45);
              --hp-bg:#5b463d; --hp-fill:#7ed67e; --hp-temp:#49cfe0; --active-outline:#ffd54f;
            }
            *{box-sizing:border-box}
            html,body{height:100%;margin:0;background:var(--bg);color:var(--ink);font-family:"Inter",system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}
            .frame{min-height:100%;display:grid;grid-template-rows:auto 1fr;gap:12px;padding:14px}
            .header{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:12px}
            .title{font-weight:800;font-size:18px;letter-spacing:.3px}
            .chip{font-weight:600;font-size:13px;color:var(--muted);padding:6px 10px;border:1px solid var(--line);border-radius:999px;background:rgba(255,255,255,.03)}
            .list{overflow-y:auto;padding-right:6px;display:grid;gap:10px}
            .row{display:grid;grid-template-columns:60px 1fr auto;grid-template-rows:auto auto;gap:10px 14px;padding:10px;border-radius:14px;border:1px solid var(--line);background:var(--panel);position:relative;box-shadow:0 10px 26px rgba(0,0,0,.35)}
            .row.active{outline:3px solid var(--active-outline);box-shadow:0 0 0 1px rgba(0,0,0,.35),0 12px 24px rgba(0,0,0,.55)}
            .row::before{content:"";position:absolute;inset:0;border-radius:14px;pointer-events:none;mix-blend-mode:screen;opacity:.85}
            .row.pc::before{background:linear-gradient(180deg,var(--pc-glow),transparent 60%)}
            .row.npc::before{background:linear-gradient(180deg,var(--npc-glow),transparent 60%)}
            .row.evil::before{background:linear-gradient(180deg,var(--evil-glow),transparent 60%)}
            .portrait{grid-row:1 / span 2;width:60px;height:60px;border-radius:12px;background:#000 center/cover no-repeat;border:2px solid var(--line);box-shadow:inset 0 0 0 2px rgba(0,0,0,.35)}
            .ring{position:relative}
            .ring.pc{box-shadow:0 0 0 2px var(--pc)}
            .ring.npc{box-shadow:0 0 0 2px var(--npc)}
            .ring.evil{box-shadow:0 0 0 2px var(--evil)}
            .name{font-weight:700;font-size:16px;align-self:center;line-height:1.2}
            .meta{justify-self:end;align-self:center;text-align:right;color:var(--muted);font-size:12px;display:grid;gap:4px}
            .hp{grid-column:2 / span 2;display:flex;align-items:center;gap:10px}
            .hpbar{width:320px;max-width:100%;height:12px;border-radius:999px;background:var(--hp-bg);position:relative;overflow:hidden}
            .hp-fill,.hp-temp{position:absolute;left:0;top:0;bottom:0;transition:width .3s ease}
            .hp-fill{background:var(--hp-fill)}
            .hp-temp{background:var(--hp-temp)}
            .hp-numbers{min-width:110px;font-size:12px;color:var(--muted)}
            /* Conditions row under the name */
            .status{grid-column:2;grid-row:2;display:flex;gap:6px;align-items:center;font-size:12px;color:var(--muted)}
            .tag{padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid var(--line)}
            .code{font-weight:700;letter-spacing:.8px}
          </style>
        </head>
        <body>
          <div class="frame">
            <div class="header">
              <div class="title">Initiative Order</div>
              <div id="round" class="chip">Round 1</div>
              <div id="join" class="chip code">Join Code: …</div>
            </div>
            <div id="list" class="list"></div>
          </div>
        </body>
      </html>
    `);
    newWindowRef.current.document.close();

    // Create encounter on server
    const created = await fetch("http://localhost:3000/api/encounter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dmPass: "secret123" }),
    }).then((r) => r.json());

    const { id, code, dmToken } = created || {};

    // Seed creatures
    await fetch(`http://localhost:3000/api/encounter/${id}/creatures`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dmToken, creatures }),
    });

    // Tell the DM page (opener) the encounter is ready so it can connect its socket
    window.postMessage({ type: "ENCOUNTER_READY", id, dmToken, code }, "*");

    // ------------ Popup rendering (no socket here) ------------
    const doc = newWindowRef.current.document;
    const ORIGIN = window.location.origin;

    const classFor = (c) =>
      c.alignment === "Evil" ? "evil" : c.type === "NPC" ? "npc" : "pc";

    const imgUrl = (n) =>
      ORIGIN + "/creatureimages/" + encodeURIComponent(n) + ".png";

    const imageNameFor = (c) => {
      let n = (c.name || "").trim();
      n = n.replace(/\s*-\s*\d+$/, ""); // remove "-N"
      n = n.replace(/\s+\d+$/, "");     // remove " 2"
      return n;
    };

    let currentIndex = 0;
    let round = 1;
    const revealed = Object.create(null);
    let live = creatures || [];

    function revealCurrentIfEnemy() {
      const order = [...live].sort(
        (a, b) => (b.initiative ?? 0) - (a.initiative ?? 0)
      );
      const c = order[currentIndex];
      if (c && c.alignment === "Evil") {
        revealed[c.id || c.name] = true;
      }
    }

    function paint() {
      const list = doc.getElementById("list");
      const r = [...live].sort(
        (a, b) => (b.initiative ?? 0) - (a.initiative ?? 0)
      );

      doc.getElementById("round").textContent = "Round " + round;
      doc.getElementById("join").textContent = "Join Code: " + (code || "");

      list.innerHTML = "";
      r.forEach((c, idx) => {
        const isActive = idx === currentIndex;
        const alnClass = classFor(c);
        const isEnemy = alnClass === "evil";
        const isGoodNPC = alnClass === "npc";

        const total = Math.max(1, Number(c.total_hp ?? c.totalHealth ?? 1));
        const cur = Math.max(0, Number(c.current_hp ?? c.health ?? 0));
        const thp = Math.max(0, Number(c.temp_hp ?? c.tempHP ?? 0));
        const hpPct = Math.max(0, Math.min(100, (cur / total) * 100));
        const thpPct = Math.max(0, Math.min(100, (thp / total) * 100));

        const row = doc.createElement("div");
        row.className = `row ${alnClass}` + (isActive ? " active" : "");

        // portrait
        const portrait = doc.createElement("div");
        portrait.className = `portrait ring ${alnClass}`;
        const imgName = imageNameFor(c);
        const isRevealed = isActive || revealed[c.id || c.name] === true;
        portrait.style.backgroundImage =
          isEnemy && !isRevealed
            ? `url(${imgUrl("unknown")})`
            : `url(${imgUrl(imgName)})`;

        // name
        const name = doc.createElement("div");
        name.className = "name";
        name.textContent =
          isEnemy && !isRevealed
            ? (c.initiative ?? 0) + "  Unknown Foe"
            : (c.initiative ?? 0) + "  " + c.name;

        // meta (right side)
        const meta = doc.createElement("div");
        meta.className = "meta";
        meta.innerHTML = `<div>Type: ${c.type || "PC"}</div><div>Align: ${
          c.alignment || ""
        }</div>`;

        // status (conditions) under the name
        const status = doc.createElement("div");
        status.className = "status";
        if (isEnemy && !isRevealed) {
          status.textContent = "—";
        } else if (Array.isArray(c.conditions) && c.conditions.length) {
          c.conditions.forEach((cond) => {
            const s = doc.createElement("span");
            s.className = "tag";
            s.textContent = cond;
            status.appendChild(s);
          });
        } else {
          status.textContent = "—";
        }

        // HP (enemies: none; NPCs: bar only; PCs: bar + numbers)
        let hpWrap = null;
        if (!isEnemy) {
          hpWrap = doc.createElement("div");
          hpWrap.className = "hp";

          const bar = doc.createElement("div");
          bar.className = "hpbar";

          const fill = doc.createElement("div");
          fill.className = "hp-fill";
          fill.style.width = hpPct + "%";

          const temp = doc.createElement("div");
          temp.className = "hp-temp";
          temp.style.width = thpPct + "%";

          bar.appendChild(fill);
          bar.appendChild(temp);
          hpWrap.appendChild(bar);

          if (!isGoodNPC) {
            const nums = doc.createElement("div");
            nums.className = "hp-numbers";
            nums.textContent =
              `${cur} / ${total}` + (thp > 0 ? ` (+${thp})` : "");
            hpWrap.appendChild(nums);
          }
        }

        // assemble
        row.appendChild(portrait);
        row.appendChild(name);
        row.appendChild(meta);
        row.appendChild(status);
        if (hpWrap) row.appendChild(hpWrap);
        list.appendChild(row);
      });
    }

    // Set background art in popup
    doc.body.style.background = `#0f1115 url(${ORIGIN}/Background/goldrush.gif) center/cover fixed no-repeat`;

    // ------------ Socket in the PARENT window ------------
    const socket = io("http://localhost:3000", {
      auth: { role: "dm", encounterId: id, token: dmToken },
    });

    socket.on("connect", () => console.log("DM socket connected (parent)"));

    socket.on("encounter:state", (state) => {
      live = (state.creatures || []).map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        alignment: c.alignment,
        initiative: c.initiative,
        total_hp: c.total_hp,
        current_hp: c.current_hp,
        temp_hp: c.temp_hp,
        conditions: c.conditions || [],
      }));
      if (typeof state.turnIndex === "number") currentIndex = state.turnIndex;
      if (typeof state.round === "number") round = state.round;
      revealCurrentIfEnemy();
      paint();
    });

    socket.on("creature:update", ({ creatureId, patch }) => {
      live = live.map((c) =>
        c.id === creatureId
          ? {
              ...c,
              current_hp:
                typeof patch.current_hp === "number"
                  ? patch.current_hp
                  : c.current_hp,
              temp_hp:
                typeof patch.temp_hp === "number" ? patch.temp_hp : c.temp_hp,
              conditions: Array.isArray(patch.conditions)
                ? patch.conditions
                : c.conditions,
            }
          : c
      );
      paint();
    });

    socket.on("turn:state", ({ round: r, turnIndex }) => {
      round = r;
      currentIndex = turnIndex || 0;
      revealCurrentIfEnemy();
      paint();
    });

    // first paint
    revealCurrentIfEnemy();
    paint();
  };

  // keep popup aware if creatures update locally (harmless pre-encounter)
  useEffect(() => {
    if (newWindowRef.current && !newWindowRef.current.closed) {
      newWindowRef.current.postMessage(
        { type: "UPDATE_CREATURES", creatures },
        "*"
      );
    }
  }, [creatures]);

  useEffect(() => {
    return () => {
      if (newWindowRef.current) newWindowRef.current.close();
    };
  }, []);

  return (
    <div>
      <button onClick={openNewWindow}>Run Initiative</button>
    </div>
  );
};

export default RunInitiative;
