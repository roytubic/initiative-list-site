// backend/server.js
(async () => {
  const express = require('express');
  const cors = require('cors');
  const path = require('path');
  const bcrypt = require('bcryptjs');
  const http = require('http');
  const { Server } = require('socket.io');
  const { nanoid } = await import('nanoid');

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*', credentials: true }
  });

  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  // Mount the catalog API
  app.use("/api/catalog", require("./routes/catalogRoutes"));

  // REMOVE this (it starts a second server and prints wrong port)
  // app.listen(3000, () => console.log("Server running on :3000"));

  // ---- In-memory store ----
  const encounters = {};

  const makeCode = () => nanoid(4).toUpperCase();
  const makeId = () => nanoid(8);
  const makeToken = () => nanoid(24);

  // ---- REST API ----
  app.post('/api/encounter', async (req, res) => {
    const { dmPass } = req.body || {};
    if (!dmPass) return res.status(400).json({ error: 'dmPass required' });

    const id = makeId();
    const code = makeCode();
    const dmPassHash = await bcrypt.hash(dmPass, 10);
    const dmToken = makeToken();

    encounters[id] = {
      id, code, dmPassHash, dmToken,
      round: 1,
      turnIndex: 0,
      creatures: [],
      claims: {}
    };

    res.json({ id, code, dmToken });
  });

  app.post('/api/encounter/:id/unlock', async (req, res) => {
    const { id } = req.params;
    const { dmPass } = req.body || {};
    const enc = encounters[id];
    if (!enc) return res.status(404).json({ error: 'not found' });
    const ok = await bcrypt.compare(dmPass || '', enc.dmPassHash);
    if (!ok) return res.status(401).json({ error: 'bad pass' });
    enc.dmToken = makeToken();
    res.json({ dmToken: enc.dmToken, code: enc.code });
  });

  app.get('/api/encounter/:id', (req, res) => {
    const { id } = req.params;
    const enc = encounters[id];
    if (!enc) return res.status(404).json({ error: 'not found' });
    res.json(snapshot(enc));
  });

  app.get('/api/encounter/code/:code', (req, res) => {
    const { code } = req.params;
    const enc = Object.values(encounters).find(e => e.code === code.toUpperCase());
    if (!enc) return res.status(404).json({ error: 'not found' });
    res.json(snapshot(enc));
  });

  app.post('/api/encounter/:id/creatures', (req, res) => {
    const { id } = req.params;
    const { dmToken, creatures } = req.body || {};
    const enc = encounters[id];
    if (!enc) return res.status(404).json({ error: 'not found' });
    if (dmToken !== enc.dmToken) return res.status(401).json({ error: 'unauthorized' });

    enc.creatures = (creatures || []).map((c) => ({
      id: c.id || makeId(),
      name: c.name,
      type: c.type || 'PC',
      alignment: c.alignment || 'Good',
      initiative: c.initiative ?? 0,
      total_hp: c.totalHealth ?? c.total_hp ?? Math.max(1, Number(c.health ?? 1)),
      current_hp: c.health ?? c.current_hp ?? 0,
      temp_hp: c.tempHP ?? c.temp_hp ?? 0,
      conditions: Array.isArray(c.conditions) ? c.conditions : []
    })).sort((a, b) => (b.initiative ?? 0) - (a.initiative ?? 0));

    io.to('enc:' + id).emit('encounter:state', snapshot(enc));
    res.json({ ok: true, count: enc.creatures.length });
  });

  app.post('/api/encounter/:id/join', (req, res) => {
    const { id } = req.params;
    const { code, creatureId, playerName } = req.body || {};
    const enc = encounters[id];
    if (!enc) return res.status(404).json({ error: 'not found' });
    if (!code || code !== enc.code) return res.status(401).json({ error: 'bad code' });

    const creature = enc.creatures.find(c => c.id === creatureId);
    if (!creature) return res.status(400).json({ error: 'creature not found' });
    if (enc.claims[creatureId]) return res.status(409).json({ error: 'already claimed' });

    const playerToken = makeToken();
    enc.claims[creatureId] = { playerName: playerName || 'Player', playerToken };

    io.to('enc:' + id).emit('creature:claim', { creatureId, playerName: playerName || 'Player' });
    res.json({ encounterId: id, playerToken });
  });

    // serve uploaded images under /media
    const publicDir = path.join(__dirname, '../public');
    app.use('/public', express.static(publicDir));
    app.use('/creatureimages', express.static(path.join(publicDir, 'creatureimages')));


  // Serve built frontend (production)
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  app.get('*', (req, res) =>
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'))
  );

  function snapshot(enc) {
    return {
      id: enc.id,
      code: enc.code,
      round: enc.round,
      turnIndex: enc.turnIndex,
      creatures: enc.creatures,
      claims: Object.fromEntries(Object.entries(enc.claims).map(([cid, v]) => [cid, { playerName: v.playerName }]))
    };
  }

  io.on('connection', (socket) => {
    const role = socket.handshake.auth?.role;
    const encounterId = socket.handshake.auth?.encounterId;
    const token = socket.handshake.auth?.token;

    const enc = encounterId ? encounters[encounterId] : null;
    if (!enc) return socket.disconnect(true);

    let allowedCreatureIds = new Set();
    if (role === 'dm') {
      if (token !== enc.dmToken) return socket.disconnect(true);
    } else if (role === 'player') {
      const match = Object.entries(enc.claims).find(([cid, v]) => v.playerToken === token);
      if (!match) return socket.disconnect(true);
      allowedCreatureIds.add(match[0]);
    } else {
      return socket.disconnect(true);
    }

    const room = 'enc:' + encounterId;
    socket.join(room);

    socket.emit('encounter:state', snapshot(enc));

    socket.on('creature:update', ({ creatureId, patch }) => {
      const c = enc.creatures.find(x => x.id === creatureId);
      if (!c) return;
      if (role === 'player' && !allowedCreatureIds.has(creatureId)) return;

      if (typeof patch.current_hp === 'number') c.current_hp = Math.max(0, Math.min(patch.current_hp, c.total_hp));
      if (typeof patch.temp_hp === 'number') c.temp_hp = Math.max(0, patch.temp_hp);
      if (Array.isArray(patch.conditions)) c.conditions = patch.conditions;

      io.to(room).emit('creature:update', {
        creatureId,
        patch: { current_hp: c.current_hp, temp_hp: c.temp_hp, conditions: c.conditions }
      });
    });

    socket.on('turn:next', () => {
      if (role !== 'dm') return;
      const len = enc.creatures.length || 1;
      enc.turnIndex = (enc.turnIndex + 1) % len;
      if (enc.turnIndex === 0) enc.round += 1;
      io.to(room).emit('turn:state', { round: enc.round, turnIndex: enc.turnIndex });
    });

    socket.on('turn:prev', () => {
      if (role !== 'dm') return;
      const len = enc.creatures.length || 1;
      enc.turnIndex = (enc.turnIndex - 1 + len) % len;
      if (enc.turnIndex === len - 1) enc.round = Math.max(1, enc.round - 1);
      io.to(room).emit('turn:state', { round: enc.round, turnIndex: enc.turnIndex });
    });
  });

  // ✅ Only this listen:
  server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
})();
