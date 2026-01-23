import React, { useState } from 'react'

const SPECIES = [
  { name: 'Mousefolk', trait: 'Quick Paws - Once per run, take two actions in one turn' },
  { name: 'Rabbitfolk', trait: 'Warm Hearth - When you heal someone, they heal +1 extra Heart' },
  { name: 'Birdfolk', trait: 'Take Wing - Fly short distances' },
  { name: 'Batfolk', trait: 'Night Sight - See in darkness, sense hidden creatures' },
  { name: 'Frogfolk', trait: 'Read the Signs - Once per run, ask one yes/no question about ahead' },
  { name: 'Ratfolk', trait: 'Insect Companion - Your bug can scout, distract, or fetch' },
  { name: 'Otterfolk', trait: 'Slippery - Advantage on dodge/escape rolls' },
  { name: 'Lizardfolk', trait: 'Cold Blood, Hot Fury - After damage, next attack +1d4' },
  { name: 'Squirrelfolk', trait: 'Bone Whisper - Once per run, ask a corpse one question' },
  { name: 'Raccoonfolk', trait: 'Junk Magic - Once per run, produce any mundane item' },
]

function CharacterSheet({ character, onSave, onCancel }) {
  const [name, setName] = useState(character?.name || '')
  const [species, setSpecies] = useState(character?.species || 'Mousefolk')
  const [brave, setBrave] = useState(character?.stats?.brave || 2)
  const [clever, setClever] = useState(character?.stats?.clever || 2)
  const [kind, setKind] = useState(character?.stats?.kind || 1)

  const totalPoints = brave + clever + kind
  const isValid = name && species && totalPoints === 5 && 
    brave >= 1 && brave <= 3 && 
    clever >= 1 && clever <= 3 && 
    kind >= 1 && kind <= 3

  const selectedSpecies = SPECIES.find(s => s.name === species)

  const handleSave = () => {
    if (!isValid) return
    
    onSave({
      name,
      species,
      level: 1,
      xp: 0,
      stats: { brave, clever, kind },
      maxHearts: 5,
      maxThreads: 3,
      gear: [],
      weavesKnown: [],
      notes: ''
    })
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1rem', textAlign: 'center' }}>
        {character?.id ? 'Edit Character' : 'Create Character'}
      </h2>

      <div className="form-group">
        <label>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter character name"
        />
      </div>

      <div className="form-group">
        <label>Species</label>
        <select value={species} onChange={(e) => setSpecies(e.target.value)}>
          {SPECIES.map(s => (
            <option key={s.name} value={s.name}>{s.name}</option>
          ))}
        </select>
        {selectedSpecies && (
          <div style={{ 
            marginTop: '0.5rem', 
            fontSize: '0.85rem', 
            color: 'var(--forest-green)',
            fontStyle: 'italic'
          }}>
            {selectedSpecies.trait}
          </div>
        )}
      </div>

      <div className="form-group">
        <label>
          Stats (5 points total, each 1-3) — 
          <span style={{ 
            color: totalPoints === 5 ? 'var(--forest-green)' : 'var(--berry-red)',
            fontWeight: 700
          }}>
            {' '}{totalPoints}/5 used
          </span>
        </label>
        
        <div className="stat-inputs">
          <div className="stat-input">
            <label style={{ color: 'var(--berry-red)' }}>Brave</label>
            <input
              type="number"
              min="1"
              max="3"
              value={brave}
              onChange={(e) => setBrave(Math.min(3, Math.max(1, parseInt(e.target.value) || 1)))}
            />
          </div>
          <div className="stat-input">
            <label style={{ color: 'var(--sky-blue)' }}>Clever</label>
            <input
              type="number"
              min="1"
              max="3"
              value={clever}
              onChange={(e) => setClever(Math.min(3, Math.max(1, parseInt(e.target.value) || 1)))}
            />
          </div>
          <div className="stat-input">
            <label style={{ color: 'var(--forest-green)' }}>Kind</label>
            <input
              type="number"
              min="1"
              max="3"
              value={kind}
              onChange={(e) => setKind(Math.min(3, Math.max(1, parseInt(e.target.value) || 1)))}
            />
          </div>
        </div>
      </div>

      <div style={{ 
        background: 'var(--parchment)', 
        padding: '1rem', 
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        <div><strong>Hearts:</strong> 5</div>
        <div><strong>Threads:</strong> 3</div>
      </div>

      <div className="form-actions">
        <button className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button 
          className="btn btn-primary" 
          onClick={handleSave}
          disabled={!isValid}
        >
          {character?.id ? 'Save Changes' : 'Create Character'}
        </button>
      </div>
    </div>
  )
}

export default CharacterSheet
