// backend/db/seedCatalog.js
const fs = require("fs");
const path = require("path");

// 1) Known DB locations we might need to clean (covers both dev & container)
const candidates = [
  process.env.DB_PATH,                                      // preferred
  path.join(__dirname, "catalog.db"),                       // backend/db/catalog.db
  "/app/db/catalog.db",                                     // container volume path
  "/backend/db/catalog.db",                                 // just in case someone set this
].filter(Boolean);

const force =
  ["1","true","yes","y"].includes(String(process.env.FORCE_RESEED || "").toLowerCase()) ||
  process.argv.includes("--force");

// 2) If forcing, remove any existing DB files (+ SHM/WAL)
if (force) {
  for (const base of candidates) {
    for (const p of [base, `${base}-shm`, `${base}-wal`]) {
      try {
        if (fs.existsSync(p)) {
          fs.unlinkSync(p);
          console.log("Deleted", p);
        }
      } catch (e) {
        console.warn("Could not delete", p, e.message);
      }
    }
  }
}

// backend/db/seedCatalog.js
const catalog = require("./catalog");

const characters = [
  { name: 'Jeff', health: 45 },
  { name: 'Tel', health: 53 },
  { name: 'Elion', health: 28 },
  { name: 'Gurdil', health: 58 },
  { name: 'Hugo', health: 59 },
  { name: 'Jhaz', health: 39 }
];

const npcs = [
  { name: 'Dwarf (m)', health: 30 },
  { name: 'Fire Genasi (M)', health: 25 },
  { name: 'Gav', health: 53 },
  { name: 'Martith', health: 45 },
  { name: 'Half-elf (F)', health: 23 },
  { name: 'Lionin (M)', health: 28 },
  { name: 'Yuan-ti (f)', health: 66 },
  { name: 'Zombie', health: 11 },
  { name: 'Wexill', health: 45 },
  { name: 'Warhorse', health: 30 },
  { name: 'Camel', health: 15 },
  { name: 'Boar', health: 22 },
  { name: 'Elk', health: 45 }
];

const monsters = [
  { name: 'Wolf', health: 11 },
  { name: 'Bandit Captain', health: 65 },
  { name: 'Banshee', health: 58 },
  { name: 'Bearded devil', health: 52 },
  { name: 'Chain devil', health: 85 },
  { name: 'Beholder', health: 180 },
  { name: 'Black Pudding', health: 85 },
  { name: 'Blue Slaad', health: 123 },
  { name: 'Bugbear', health: 27 },
  { name: 'Bulette', health: 94 },
  { name: 'Chuul', health: 93 },
  { name: 'Dire Wolverine', health: 89 },
  { name: 'Ettin', health: 85 },
  { name: 'Flame Skull', health: 40 },
  { name: 'Frost Elemental', health: 114 },
  { name: 'Frost Giant', health: 138 },
  { name: 'Ghast', health: 36 },
  { name: 'Giant Moth', health: 33 },
  { name: 'Green Slaad', health: 127 },
  { name: 'Harpy', health: 38 },
  { name: 'Hobgoblin', health: 11 },
  { name: 'Ice Armour', health: 65 },
  { name: 'Ice Golem', health: 50 },
  { name: 'Ice Mephit', health: 21 },
  { name: 'Mind Witness', health: 75 },
  { name: 'Phase Spider', health: 32 },
  { name: 'Poltergiest', health: 22 },
  { name: 'Red Slaad', health: 93 },
  { name: 'Skeleton', health: 13 },
  { name: 'Spined Devil', health: 22 },
  { name: 'Thief', health: 19},
  { name: 'White Wrymling', health: 32 },
  { name: 'Wight', health: 45 },
  { name: 'Yeti', health: 51 },
  { name: 'Zombie Ogre', health: 85 },
  { name: 'Zombie', health: 22 },
  { name: 'Sprite', health: 7 },
  { name: 'Shadowling', health: 22 },
  { name: "Riding Drake", health: 45 },
  { name: 'Giant Lizard', health: 20 },
  { name: 'Giant Goat', health: 19 },
  { name: 'Drake', health: 25 },
  { name: 'Axebeak', health: 19 },
  { name: 'Panther', health: 13 },
];

function toRows(arr, type) {
  return arr.map(({ name, health }) => ({
    type,
    name,
    default_health: health === null ? null : Number(health),
    image_path: null, // <-- required by INSERT
  }));
}

// 4) If still forcing and the DB has rows, wipe the table
if (force && !catalog.seedIfEmpty) {
  console.log("WARN: catalog.seedIfEmpty missing; cannot auto-wipe.");
}

if (force && catalog.seedIfEmpty && !catalog.seedIfEmpty()) {
  if (typeof catalog.wipeAll === "function") {
    console.log("Forcing wipe of existing rows…");
    catalog.wipeAll();
  }
}

// 5) Seed if empty
if (catalog.seedIfEmpty()) {
  catalog.insertMany([
    ...toRows(characters, "PC"),
    ...toRows(npcs, "NPC"),
    ...toRows(monsters, "Monster"),
  ]);
  console.log("Catalog seeded.");
} else {
  console.log("Catalog already contains data, skipping seed.");
}