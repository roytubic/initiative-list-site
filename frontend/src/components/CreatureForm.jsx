import React, { useState } from 'react';

export default function CreatureForm({ addCreatures }) {
  const [selectedCharacter, setSelectedCharacter] = useState('');
  const [selectedNPC, setSelectedNPC] = useState('');
  const [selectedMonster, setSelectedMonster] = useState('');
  const [initiative, setInitiative] = useState('');
  const [name, setName] = useState('');
  const [health, setHealth] = useState('');
  const [alignment, setAlignment] = useState('Good');
  const [quantity, setQuantity] = useState(1);

  const characters = [
    { name: 'Jeff', health: 75 },
    { name: 'Tel', health: 53 },
    { name: 'Elion', health: 42 },
    { name: 'Gurdil', health: 54 },
    { name: 'Hugo', health: 60 },
    { name: 'Jhaz', health: 52 }
  ];

  const npcs = [
    { name: 'Dwarf (m)', health: null },
    { name: 'Fire Genasi (M)', health: null },
    { name: 'Gav', health: null },
    { name: 'Martith', health: null },
    { name: 'Half-elf (F)', health: null },
    { name: 'Lionin (M)', health: null },
    { name: 'Yuan-ti (f)', health: 66 },
    { name: 'Zombie', health: 11 }
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
    { name: 'Dire Wolverine', health: null },
    { name: 'Ettin', health: 85 },
    { name: 'Flame Skull', health: 40 },
    { name: 'Frost Elemental', health: 114 },
    { name: 'Frost Giant', health: 138 },
    { name: 'Ghast', health: 36 },
    { name: 'Giant Moth', health: null },
    { name: 'Green Slaad', health: 127 },
    { name: 'Harpy', health: 38 },
    { name: 'Hobgoblin', health: 11 },
    { name: 'Ice Armour', health: 65 },
    { name: 'Ice Golem', health: 50 },
    { name: 'Ice Mephit', health: 21 },
    { name: 'Jetad the White', health: null },
    { name: 'Lurse', health: null },
    { name: 'Mind Witness', health: 75 },
    { name: 'Phase Spider', health: 32 },
    { name: 'Poltergiest', health: null },
    { name: 'Red Slaad', health: 93 },
    { name: 'Ripterror', health: null },
    { name: 'Rock Worm', health: null },
    { name: 'Skeleton', health: 13 },
    { name: 'Spined Devil', health: 22 },
    { name: 'Thief', health: null },
    { name: "Ula'ree soldier", health: null },
    { name: 'VS Arcanist', health: null },
    { name: 'VS Spy', health: null },
    { name: 'VS Swordsman', health: null },
    { name: 'White Wrymling', health: 32 },
    { name: 'Wight', health: 45 },
    { name: 'Yeti', health: 51 },
    { name: 'Zombie Ogre', health: 85 },
    { name: 'Zombie', health: 22 },
    { name: 'Lord Jenthril', health: 55 },
    { name: 'Sprite', health: 7 },
    { name: 'Shadowling', health: 22 }
  ];

  const handlePCChange = (e) => {
    const character = characters.find((x) => x.name === e.target.value);
    if (character) {
      setSelectedCharacter(character.name);
      setSelectedNPC('');
      setSelectedMonster('');
      setName(character.name);
      setHealth(character.health ?? '');
      setAlignment('Good');
    }
  };

  const handleNPCChange = (e) => {
    const npc = npcs.find((x) => x.name === e.target.value);
    if (npc) {
      setSelectedNPC(npc.name);
      setSelectedCharacter('');
      setSelectedMonster('');
      setName(npc.name);
      setHealth(npc.health ?? '');
      setAlignment('Good');
    }
  };

  const handleMonsterChange = (e) => {
    const m = monsters.find((x) => x.name === e.target.value);
    if (m) {
      setSelectedMonster(m.name);
      setSelectedCharacter('');
      setSelectedNPC('');
      setName(m.name);
      setHealth(m.health ?? '');
      setAlignment('Bad');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate to guarantee we pass a valid proto
    const init = Number(initiative);
    const hp = health === '' || health == null ? null : Number(health);
    if (!name || Number.isNaN(init)) {
      alert('Please choose a creature and enter initiative.');
      return;
    }

    const proto = {
      initiative: init,
      name: name.trim(),
      health: hp == null ? 0 : hp,
      totalHealth: hp == null ? Math.max(1, 1) : Math.max(1, hp),
      type: selectedCharacter ? 'PC' : 'NPC',
      alignment
    };

    const qty = Math.max(1, Math.min(20, Number(quantity) || 1));
    addCreatures(proto, qty);

    // reset minimal fields
    setSelectedCharacter('');
    setSelectedNPC('');
    setSelectedMonster('');
    setInitiative('');
    setName('');
    setHealth('');
    setAlignment('Good');
    setQuantity(1);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <select value={selectedCharacter} onChange={handlePCChange}>
        <option value="">Select a PC</option>
        {characters.map((c) => (
          <option key={c.name} value={c.name}>{c.name}</option>
        ))}
      </select>

      <select value={selectedNPC} onChange={handleNPCChange}>
        <option value="">Select an NPC</option>
        {npcs.map((n) => (
          <option key={n.name} value={n.name}>{n.name}</option>
        ))}
      </select>

      <select value={selectedMonster} onChange={handleMonsterChange}>
        <option value="">Select a Monster</option>
        {monsters.map((m) => (
          <option key={m.name} value={m.name}>{m.name}</option>
        ))}
      </select>

      <input
        type="number"
        value={initiative}
        onChange={(e) => setInitiative(e.target.value)}
        placeholder="Init"
        style={{ width: 70 }}
        required
      />

      {/* Quantity 1..20 */}
      <select value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}>
        {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>

      {/* Optional overrides */}
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" />
      <input type="number" value={health ?? ''} onChange={(e) => setHealth(e.target.value)} placeholder="HP (optional)" />
      <select value={alignment} onChange={(e) => setAlignment(e.target.value)}>
        <option value="Good">Good</option>
        <option value="Bad">Bad</option>
      </select>

      <button type="submit">Add Creature(s)</button>
    </form>
  );
}
