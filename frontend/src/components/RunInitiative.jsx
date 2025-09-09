import React, { useRef, useEffect } from 'react';

const RunInitiative = ({ creatures }) => {
  const newWindowRef = useRef(null);

  const openNewWindow = async () => {
    if (!newWindowRef.current || newWindowRef.current.closed) {
      // Open immediately to avoid blockers
      newWindowRef.current = window.open('', '_blank', 'width=560,height=680');
      newWindowRef.current.document.write(`
        <html><head><title>Initiative Tracker</title></head>
        <body style="font-family: Arial, sans-serif; color:#f4e7c3; background:#1c1c1c; display:flex; align-items:center; justify-content:center; height:100vh;">
          <div>Setting up encounter...</div>
        </body></html>
      `);
      newWindowRef.current.document.close();

      // Create encounter
      const res = await fetch('http://localhost:3000/api/encounter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dmPass: 'secret123' })
      }).then(r => r.json());

      const { id, code, dmToken } = res || {};

      // Seed creatures
      await fetch(`http://localhost:3000/api/encounter/${id}/creatures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dmToken, creatures })
      });

      // Notify opener (DM screen) so it can connect its own socket
      window.postMessage({ type: 'ENCOUNTER_READY', id, dmToken, code }, '*');

      // Render popup UI + wire sockets
      newWindowRef.current.document.open();
      newWindowRef.current.document.write(`
        <html>
          <head>
            <title>Initiative Tracker</title>
            <style>
              html, body {
                margin: 0; padding: 0; height: 100%;
                font-family: Arial, sans-serif;
                color: #f4e7c3;
              }
              .frame { display:flex; flex-direction:column; gap:10px; height:100vh; padding:12px; box-sizing:border-box; text-shadow:-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000; }
              .header { display:grid; grid-template-columns: 1fr auto auto; align-items:center; gap:12px; }
              .list { flex:1; overflow-y:auto; padding-right:6px; }
              .row { display:grid; grid-template-columns:56px 1fr auto auto; grid-template-rows:1fr 1fr; grid-column-gap:10px; grid-row-gap:2px; align-items:center; padding:8px; border-radius:10px; border:2px solid #2b2b2b; margin-bottom:8px; box-shadow:0 2px 0 rgba(0,0,0,0.4); }
              .row.good-pc { background: rgba(40,90,200,0.35); }
              .row.good-npc { background: rgba(50,120,60,0.35); }
              .row.bad { background: rgba(160,40,40,0.35); }
              .row.active { outline:3px solid #ffd54f; box-shadow:0 0 10px rgba(255,213,79,0.7); }
              .portrait { grid-row:1 / span 2; width:56px; height:56px; border-radius:8px; background:#000 center/cover no-repeat; border:1px solid #333; }
              .name { font-weight:bold; font-size:16px; line-height:1; }
              .status { font-size:12px; opacity:0.9; }
              .hp-wrap { grid-column:2 / span 2; display:flex; align-items:center; gap:10px; }
              .hp-bar { width:220px; height:10px; background:#6d4c41; border-radius:6px; position:relative; overflow:hidden; }
              .hp-fill { position:absolute; left:0; top:0; bottom:0; background:#8bc34a; transition:width 0.3s; }
              .hp-temp { position:absolute; left:0; top:0; bottom:0; background:#ffb74d; opacity:0.9; transition:width 0.3s; }
              .hp-numbers { font-size:12px; min-width:110px; }
              .right { grid-column:4; grid-row:1 / span 2; justify-self:end; align-self:center; display:flex; flex-direction:column; gap:6px; align-items:flex-end; font-size:12px; }
              .code { font-size:14px; background:rgba(0,0,0,0.35); border:1px solid #333; border-radius:8px; padding:6px 10px; }
            </style>
          </head>
          <body>
            <div class="frame">
              <div class="header">
                <div><strong>Initiative Order</strong></div>
                <div id="round-indicator"></div>
                <div id="join-code" class="code">Join Code: ${code || ''}</div>
              </div>
              <div id="list" class="list"></div>
            </div>

            <script src="http://localhost:3000/socket.io/socket.io.js"></script>
            <script>
              // --- Asset paths from opener ---
              const ORIGIN = (window.opener && window.opener.location && window.opener.location.origin) ? window.opener.location.origin : '';
              document.addEventListener('DOMContentLoaded', () => {
                document.body.style.background = '#1c1c1c url(' + ORIGIN + '/Background/goldrush.gif) center/cover no-repeat fixed';
              });
              const imgUrl = (n) => ORIGIN + '/creatureimages/' + encodeURIComponent(n) + '.png';
              function imageNameFor(c) {
                let n = (c.name || '').trim();
                n = n.replace(/\\s*-\\s*\\d+$/, ''); // "-N"
                n = n.replace(/\\s+\\d+$/, '');      // " 2"
                return n;
              }

              // --- Popup state ---
              let currentIndex = 0;
              let round = 1;
              let revealed = {}; // creatureKey -> true once they've had a turn
              let creatures = ${JSON.stringify(creatures || [])};

              const alignmentClass = (c) =>
                c.alignment === 'Bad' ? 'bad'
                : (c.alignment === 'Good' && c.type === 'NPC') ? 'good-npc'
                : 'good-pc';

              const sorted = (arr) => [...arr].sort((a,b) => (b.initiative ?? 0) - (a.initiative ?? 0));
              const creatureKey = (c) => c.id ? c.id : (c.name + '|' + (c.initiative ?? 0));

              function markCurrentRevealed() {
                const order = sorted(creatures);
                const c = order[currentIndex];
                if (c && c.alignment === 'Bad') {
                  revealed[creatureKey(c)] = true; // reveal name/portrait on its turn
                }
              }

              function render() {
                const list = document.getElementById('list');
                const r = sorted(creatures);
                list.innerHTML = '';
                r.forEach((c, idx) => {
                  const isActive = (idx === currentIndex);
                  const isEnemy = c.alignment === 'Bad';
                  const isGoodNPC = (c.alignment === 'Good' && c.type === 'NPC');
                  const key = creatureKey(c);
                  const isRevealed = isActive || revealed[key] === true; // name/portrait secrecy

                  const total = c.totalHealth || c.total_hp || 1;
                  const cur = Number(c.health ?? c.current_hp ?? 0);
                  const thp = Number(c.tempHP ?? c.temp_hp ?? 0);
                  const hpPct  = Math.max(0, Math.min(100, (cur / total) * 100));
                  const thpPct = Math.max(0, Math.min(100, (thp / total) * 100));

                  const row = document.createElement('div');
                  row.className = 'row ' + alignmentClass(c) + (isActive ? ' active' : '');
                  if (cur <= 0) row.style.opacity = '0.5';

                  // Portrait (name/portrait hidden until enemy's turn)
                  const portrait = document.createElement('div');
                  portrait.className = 'portrait';
                  const imgName = imageNameFor(c);
                  portrait.style.backgroundImage =
                    (isEnemy && !isRevealed) ? 'url(' + imgUrl('unknown') + ')'
                                             : 'url(' + imgUrl(imgName) + ')';

                  // Name
                  const name = document.createElement('div');
                  name.className = 'name';
                  name.textContent =
                    (isEnemy && !isRevealed)
                      ? (c.initiative ?? 0) + '  Unknown Foe'
                      : (c.initiative ?? 0) + '  ' + c.name;

                  // Status (conditions or em dash)
                  const status = document.createElement('div');
                  status.className = 'status';
                  status.textContent =
                    (isEnemy && !isRevealed)
                      ? '—'
                      : ((c.conditions && c.conditions.length) ? c.conditions.join(', ') : '—');

                  // Right meta
                  const right = document.createElement('div');
                  right.className = 'right';
                  right.innerHTML = '<div>Type: ' + (c.type || 'PC') + '</div><div>Align: ' + (c.alignment || '') + '</div>';

                  // HP section:
                  // - Enemies: no HP bar and no numbers at all
                  // - Good NPCs: show bar only (no numbers)
                  // - PCs: show bar and numbers
                  let hpWrap = null;
                  if (!isEnemy) {
                    hpWrap = document.createElement('div');
                    hpWrap.className = 'hp-wrap';

                    const bar = document.createElement('div');
                    bar.className = 'hp-bar';

                    const hpFill = document.createElement('div');
                    hpFill.className = 'hp-fill';
                    hpFill.style.width = hpPct + '%';

                    const hpTemp = document.createElement('div');
                    hpTemp.className = 'hp-temp';
                    hpTemp.style.width = thpPct + '%';

                    bar.appendChild(hpFill);
                    bar.appendChild(hpTemp);
                    hpWrap.appendChild(bar);

                    if (!isGoodNPC) {
                      // PCs: numbers
                      const hpNumbers = document.createElement('div');
                      hpNumbers.className = 'hp-numbers';
                      hpNumbers.textContent = cur + ' / ' + total + (thp > 0 ? ' (+' + thp + ')' : '');
                      hpWrap.appendChild(hpNumbers);
                    }
                  }

                  // Assemble row
                  const frag = document.createDocumentFragment();
                  frag.appendChild(portrait);
                  frag.appendChild(name);
                  frag.appendChild(right);
                  frag.appendChild(status);
                  if (hpWrap) frag.appendChild(hpWrap);
                  row.appendChild(frag);
                  list.appendChild(row);
                });

                document.getElementById('round-indicator').textContent = 'Round ' + round;
              }

              // --- Socket wiring (DM display role) ---
              const socket = io('http://localhost:3000', {
                auth: { role: 'dm', encounterId: '${id}', token: '${dmToken}' }
              });
              socket.on('connect', () => console.log('DM popup socket connected'));

              // Full state (also fires when DM adds/removes creatures)
              socket.on('encounter:state', (state) => {
                creatures = (state.creatures || []).map(c => ({
                  id: c.id,
                  name: c.name,
                  type: c.type,
                  alignment: c.alignment,
                  initiative: c.initiative,
                  totalHealth: c.total_hp,
                  health: c.current_hp,
                  tempHP: c.temp_hp,
                  conditions: c.conditions || []
                }));
                if (typeof state.turnIndex === 'number') currentIndex = state.turnIndex;
                if (typeof state.round === 'number') round = state.round;
                markCurrentRevealed();
                render();
                if (window.opener) {
                  window.opener.postMessage({ type: 'CREATURES_SYNC', creatures }, '*');
                }
              });

              // Incremental patch (player/DM edits)
              socket.on('creature:update', ({ creatureId, patch }) => {
                let changed = false;
                creatures = creatures.map(c => {
                  if (c.id === creatureId) {
                    changed = true;
                    return {
                      ...c,
                      health: (typeof patch.current_hp === 'number') ? patch.current_hp : c.health,
                      tempHP: (typeof patch.temp_hp === 'number') ? patch.temp_hp : c.tempHP,
                      conditions: Array.isArray(patch.conditions) ? patch.conditions : c.conditions
                    };
                  }
                  return c;
                });
                if (changed) {
                  render();
                  if (window.opener) {
                    window.opener.postMessage({ type: 'CREATURES_SYNC', creatures }, '*');
                  }
                }
              });

              // Turn change (reveal enemy on its turn)
              socket.on('turn:state', ({ round: r, turnIndex }) => {
                round = r;
                currentIndex = turnIndex || 0;
                markCurrentRevealed();
                render();
              });

              // Initial paint
              markCurrentRevealed();
              render();
            </script>
          </body>
        </html>
      `);
      newWindowRef.current.document.close();

      window.__initiativePopup = newWindowRef.current;
    }
  };

  // Forward pre-encounter local list changes (harmless)
  useEffect(() => {
    if (newWindowRef.current && !newWindowRef.current.closed) {
      newWindowRef.current.postMessage({ type: 'UPDATE_CREATURES', creatures }, '*');
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
