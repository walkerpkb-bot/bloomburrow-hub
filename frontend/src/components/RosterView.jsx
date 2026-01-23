import React, { useState } from 'react'

const SPECIES = [
  'Mousefolk', 'Rabbitfolk', 'Birdfolk', 'Batfolk', 'Frogfolk',
  'Ratfolk', 'Otterfolk', 'Lizardfolk', 'Squirrelfolk', 'Raccoonfolk'
]

function RosterView({ roster, onCreateCharacter, onSelectCharacter, onStartSession, sessionActive }) {
  const [selectedIds, setSelectedIds] = useState([])
  const [showStartModal, setShowStartModal] = useState(false)
  const [quest, setQuest] = useState('')
  const [location, setLocation] = useState('')

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else if (selectedIds.length < 2) {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleStartRun = () => {
    if (selectedIds.length > 0 && quest && location) {
      onStartSession(quest, location, selectedIds)
      setShowStartModal(false)
      setSelectedIds([])
      setQuest('')
      setLocation('')
    }
  }

  return (
    <div>
      {!sessionActive && selectedIds.length > 0 && (
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span>{selectedIds.length} character(s) selected</span>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowStartModal(true)}
            style={{ flex: 'none', padding: '0.5rem 1rem' }}
          >
            Start Run
          </button>
        </div>
      )}

      <div className="roster-view">
        {roster.map(char => (
          <div 
            key={char.id} 
            className={`card roster-card ${selectedIds.includes(char.id) ? 'selected' : ''}`}
            onClick={() => !sessionActive && toggleSelect(char.id)}
            style={{
              border: selectedIds.includes(char.id) ? '3px solid var(--forest-green)' : undefined
            }}
          >
            <div className="card-header" style={{ 
              background: selectedIds.includes(char.id) ? 'var(--forest-green)' : 'var(--warm-brown)' 
            }}>
              {char.name}
              <span className="level">Lvl {char.level}</span>
            </div>
            <div className="card-body">
              <div className="species" style={{ color: 'var(--forest-green)', fontWeight: 600 }}>
                {char.species}
              </div>
              <div className="stats">
                <div className="stat">
                  <span style={{ color: 'var(--berry-red)' }}>BRV</span> {char.stats.brave}
                </div>
                <div className="stat">
                  <span style={{ color: 'var(--sky-blue)' }}>CLV</span> {char.stats.clever}
                </div>
                <div className="stat">
                  <span style={{ color: 'var(--forest-green)' }}>KND</span> {char.stats.kind}
                </div>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                XP: {char.xp} | ♥ {char.maxHearts} | ✦ {char.maxThreads}
              </div>
            </div>
          </div>
        ))}

        <div className="card add-character-card" onClick={onCreateCharacter}>
          <span>+</span>
        </div>
      </div>

      {/* Start Run Modal */}
      {showStartModal && (
        <div className="modal-overlay" onClick={() => setShowStartModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1rem' }}>Start New Run</h2>
            
            <div className="form-group">
              <label>Quest</label>
              <input
                type="text"
                value={quest}
                onChange={(e) => setQuest(e.target.value)}
                placeholder="e.g., Rescue the missing scout"
              />
            </div>

            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Bramble Hollow"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <strong>Party:</strong>
              <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                {selectedIds.map(id => {
                  const char = roster.find(c => c.id === id)
                  return <li key={id}>{char?.name} ({char?.species})</li>
                })}
              </ul>
            </div>

            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowStartModal(false)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleStartRun}
                disabled={!quest || !location}
              >
                Begin Adventure!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RosterView
