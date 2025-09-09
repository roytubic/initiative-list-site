// backend/db/catalog.js
const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "catalog.db"));
db.pragma("journal_mode = WAL");

// base table
db.exec(`
CREATE TABLE IF NOT EXISTS catalog_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('PC','NPC','Monster')),
  name TEXT NOT NULL,
  default_health INTEGER,
  image_path TEXT,
  UNIQUE(type, name) ON CONFLICT IGNORE
);
CREATE INDEX IF NOT EXISTS idx_catalog_type ON catalog_entries(type);
`);

// in case DB existed from earlier without image_path
try {
  db.exec(`ALTER TABLE catalog_entries ADD COLUMN image_path TEXT`);
} catch (e) {
  // already has column
}

const insertEntry = db.prepare(`
  INSERT OR IGNORE INTO catalog_entries (type, name, default_health, image_path)
  VALUES (@type, @name, @default_health, @image_path)
`);
const listByType = db.prepare(`
  SELECT id, type, name, default_health, image_path
  FROM catalog_entries
  WHERE type = ?
  ORDER BY name COLLATE NOCASE
`);
const upsert = db.prepare(`
  INSERT INTO catalog_entries (type, name, default_health, image_path)
  VALUES (@type, @name, @default_health, @image_path)
  ON CONFLICT(type, name) DO UPDATE SET
    default_health = excluded.default_health,
    image_path = COALESCE(excluded.image_path, catalog_entries.image_path)
`);
const updateById = db.prepare(`
  UPDATE catalog_entries
  SET name = @name, type = @type, default_health = @default_health, image_path = @image_path
  WHERE id = @id
`);
const updateHPById = db.prepare(`
  UPDATE catalog_entries
  SET default_health = @default_health
  WHERE id = @id
`);
const removeById = db.prepare(`DELETE FROM catalog_entries WHERE id = ?`);

function wipeAll() {
  // Drop all data; you can do DELETE, or DROP & recreate if you prefer
  db.prepare('DELETE FROM catalog').run();
}


module.exports = {
  seedIfEmpty() {
    const { c } = db.prepare(`SELECT COUNT(*) AS c FROM catalog_entries`).get();
    return c === 0;
  },
  insertMany(rows) {
    const tx = db.transaction((arr) => {
      for (const r of arr) insertEntry.run(r);
    });
    tx(rows);
  },
  list(type) {
    return listByType.all(type);
  },
  upsert(row) {
    return upsert.run(row);
  },
  update(row) {
    return updateById.run(row);
  },
  updateHP(id, default_health) {
    return updateHPById.run({ id, default_health });
  },
  delete(id) {
    return removeById.run(id);
  },
  wipeAll,
};
