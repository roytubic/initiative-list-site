// backend/routes/catalogRoutes.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const router = express.Router();
const catalog = require("../db/catalog");

// storage for images -> backend/public/creatureimages
const imagesDir = path.join(__dirname, "..", "public", "creatureimages");
fs.mkdirSync(imagesDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, imagesDir),
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^\w.\-]/g, "_");
      const ts = Date.now();
      const ext = path.extname(safe) || ".png";
      const base = path.basename(safe, ext);
      cb(null, `${base}_${ts}${ext}`);
    },
  }),
});

// list
router.get("/:type", (req, res) => {
  const t = req.params.type;
  if (!["PC", "NPC", "Monster"].includes(t)) {
    return res.status(400).json({ error: "type must be PC, NPC, or Monster" });
  }
  res.json(catalog.list(t));
});

// create/upsert single
router.post("/", express.json(), (req, res) => {
  const { type, name, default_health, image_path } = req.body || {};
  if (!["NPC", "Monster", "PC"].includes(type) || !name?.trim()) {
    return res.status(400).json({ error: "Invalid type or name" });
  }
  catalog.upsert({
    type,
    name: name.trim(),
    default_health:
      default_health === null || default_health === undefined
        ? null
        : Number(default_health),
    image_path: image_path || null,
  });
  res.status(201).json({ ok: true });
});

// update full row
router.put("/:id", express.json(), (req, res) => {
  const id = Number(req.params.id);
  const { type, name, default_health, image_path } = req.body || {};
  if (!id || !["PC", "NPC", "Monster"].includes(type) || !name?.trim()) {
    return res.status(400).json({ error: "Invalid payload" });
  }
  catalog.update({
    id,
    type,
    name: name.trim(),
    default_health:
      default_health === null || default_health === undefined
        ? null
        : Number(default_health),
    image_path: image_path || null,
  });
  res.json({ ok: true });
});

// update only HP
router.put("/:id/hp", express.json(), (req, res) => {
  const id = Number(req.params.id);
  const { default_health } = req.body || {};
  if (!id || default_health === undefined) {
    return res.status(400).json({ error: "Invalid payload" });
    }
  catalog.updateHP(id, Number(default_health));
  res.json({ ok: true });
});

// delete
router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  catalog.delete(id);
  res.json({ ok: true });
});

// upload image (multipart/form-data with field "image")
router.post("/upload-image", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file" });
  // public URL path your frontend can use
  const publicPath = `/media/creatureimages/${req.file.filename}`;
  res.status(201).json({ ok: true, image_path: publicPath });
});

// bulk import (JSON or CSV-in-body)
router.post("/bulk", upload.none(), (req, res) => {
  // accepts: [{type,name,default_health,image_path?}, ...] OR csv in "csv" field
  let rows = [];
  if (req.body?.csv) {
    // naive CSV: name,default_health,type
    const csv = String(req.body.csv).trim();
    const lines = csv.split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      const [name, hp, type] = line.split(",").map((s) => (s || "").trim());
      if (!name || !["NPC", "Monster", "PC"].includes(type)) continue;
      rows.push({
        type,
        name,
        default_health: hp === "" ? null : Number(hp),
        image_path: null,
      });
    }
  } else if (req.body?.json) {
    try {
      const arr = JSON.parse(req.body.json);
      if (Array.isArray(arr)) rows = arr;
    } catch {}
  } else if (Array.isArray(req.body)) {
    rows = req.body;
  }

  if (!rows.length) return res.status(400).json({ error: "No rows" });
  const cleaned = rows.map((r) => ({
    type: r.type,
    name: String(r.name || "").trim(),
    default_health:
      r.default_health === null || r.default_health === undefined
        ? null
        : Number(r.default_health),
    image_path: r.image_path || null,
  })).filter(r => r.name && ["PC","NPC","Monster"].includes(r.type));

  catalog.insertMany(cleaned);
  res.json({ ok: true, count: cleaned.length });
});

module.exports = router;
