import React, { useState } from 'react'

const API_BASE = '/api'

const SPECIES = [
  'Mousefolk', 'Rabbitfolk', 'Birdfolk', 'Batfolk', 'Frogfolk',
  'Ratfolk', 'Otterfolk', 'Lizardfolk', 'Squirrelfolk', 'Raccoonfolk'
]

// XP thresholds for each level
const LEVEL_THRESHOLDS = {
  2: 2,
  3: 4,
  4: 7,
  5: 11
}

// Get the level a character should be based on XP
const getLevelForXP = (xp) => {
  if (xp >= 11) return 5
  if (xp >= 7) return 4
  if (xp >= 4) return 3
  if (xp >= 2) return 2
  return 1
}

// Check if character can level up
const canLevelUp = (char) => {
  const targetLevel = getLevelForXP(char.xp)
  return targetLevel > char.level
}

function RosterView({ roster, onCreateCharacter, onSelectCharacter, onStartSession, sessionActive, onRefresh, campaignId }) {
  const [selectedIds, setSelectedIds] = useState([])
  const [showStartModal, setShowStartModal] = useState(false)
  const [quest, setQuest] = useState('')
  const [location, setLocation] = useState('')
  const [levelUpChar, setLevelUpChar] = useState(null)
  const [levelUpChoice, setLevelUpChoice] = useState(null)

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

  const getNextLevelReward = (char) => {
    const nextLevel = char.level + 1
    switch (nextLevel) {
      case 2: return { type: 'stat', desc: '+1 to one stat (max 4)' }
      case 3: return { type: 'heart', desc: '+1 Heart (now 6 total)' }
      case 4: return { type: 'choice', desc: 'New species ability OR +1 Thread' }
      case 5: return { type: 'stat', desc: '+1 to one stat (max 5)' }
      default: return null
    }
  }

  const handleLevelUp = async () => {
    if (!levelUpChar) return

    const nextLevel = levelUpChar.level + 1

    // Level 3 doesn't need a choice, others do
    if (nextLevel !== 3 && !levelUpChoice) return

    const updates = { level: nextLevel }

    if (nextLevel === 3) {
      // Auto +1 heart
      updates.maxHearts = levelUpChar.maxHearts + 1
    } else if (nextLevel === 2 || nextLevel === 5) {
      // +1 to chosen stat
      const maxStat = nextLevel === 5 ? 5 : 4
      if (levelUpChar.stats[levelUpChoice] < maxStat) {
        updates.stats = { ...levelUpChar.stats, [levelUpChoice]: levelUpChar.stats[levelUpChoice] + 1 }
      }
    } else if (nextLevel === 4) {
      // Choice: thread or ability
      if (levelUpChoice === 'thread') {
        updates.maxThreads = levelUpChar.maxThreads + 1
      }
      // ability would need to be tracked separately
    }

    try {
      await fetch(`${API_BASE}/campaigns/${campaignId}/characters/${levelUpChar.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      setLevelUpChar(null)
      setLevelUpChoice(null)
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Failed to level up:', err)
    }
  }

  const updateCharStat = async (charId, field, delta) => {
    const char = roster.find(c => c.id === charId)
    if (!char) return

    const newValue = (char[field] || 0) + delta
    if (newValue < 1) return // Don't go below 1

    try {
      await fetch(`${API_BASE}/campaigns/${campaignId}/characters/${charId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newValue })
      })
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Failed to update character:', err)
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
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span>XP: {char.xp}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); updateCharStat(char.id, 'maxHearts', -1) }}
                    style={{ padding: '0 4px', fontSize: '0.7rem', cursor: 'pointer', background: 'var(--parchment)', border: '1px solid var(--warm-brown)', borderRadius: '3px' }}
                  >-</button>
                  <span style={{ color: 'var(--berry-red)' }}>♥{char.maxHearts}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); updateCharStat(char.id, 'maxHearts', 1) }}
                    style={{ padding: '0 4px', fontSize: '0.7rem', cursor: 'pointer', background: 'var(--parchment)', border: '1px solid var(--warm-brown)', borderRadius: '3px' }}
                  >+</button>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); updateCharStat(char.id, 'maxThreads', -1) }}
                    style={{ padding: '0 4px', fontSize: '0.7rem', cursor: 'pointer', background: 'var(--parchment)', border: '1px solid var(--warm-brown)', borderRadius: '3px' }}
                  >-</button>
                  <span style={{ color: 'var(--golden)' }}>✦{char.maxThreads}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); updateCharStat(char.id, 'maxThreads', 1) }}
                    style={{ padding: '0 4px', fontSize: '0.7rem', cursor: 'pointer', background: 'var(--parchment)', border: '1px solid var(--warm-brown)', borderRadius: '3px' }}
                  >+</button>
                </span>
              </div>
              {canLevelUp(char) && (
                <button
                  className="btn btn-primary"
                  onClick={(e) => {
                    e.stopPropagation()
                    setLevelUpChar(char)
                    setLevelUpChoice(null)
                  }}
                  style={{ marginTop: '0.5rem', width: '100%', fontSize: '0.85rem' }}
                >
                  Level Up!
                </button>
              )}
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

      {/* Level Up Modal */}
      {levelUpChar && (
        <div className="modal-overlay" onClick={() => setLevelUpChar(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1rem' }}>
              {levelUpChar.name} Levels Up!
            </h2>
            <p style={{ marginBottom: '0.5rem' }}>
              Level {levelUpChar.level} → Level {levelUpChar.level + 1}
            </p>
            <p style={{ marginBottom: '1rem', fontStyle: 'italic' }}>
              {getNextLevelReward(levelUpChar)?.desc}
            </p>

            {/* Level 2 or 5: Choose a stat */}
            {(levelUpChar.level + 1 === 2 || levelUpChar.level + 1 === 5) && (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Choose a stat to increase:</p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['brave', 'clever', 'kind'].map(stat => {
                    const maxStat = levelUpChar.level + 1 === 5 ? 5 : 4
                    const canIncrease = levelUpChar.stats[stat] < maxStat
                    return (
                      <button
                        key={stat}
                        className={`btn ${levelUpChoice === stat ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => canIncrease && setLevelUpChoice(stat)}
                        disabled={!canIncrease}
                        style={{ flex: 1, opacity: canIncrease ? 1 : 0.5 }}
                      >
                        {stat.toUpperCase()} ({levelUpChar.stats[stat]})
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Level 3: Auto heart */}
            {levelUpChar.level + 1 === 3 && (
              <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--parchment)', borderRadius: '8px' }}>
                <p>Your max Hearts will increase from {levelUpChar.maxHearts} to {levelUpChar.maxHearts + 1}!</p>
              </div>
            )}

            {/* Level 4: Choose thread or ability */}
            {levelUpChar.level + 1 === 4 && (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Choose your reward:</p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className={`btn ${levelUpChoice === 'thread' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setLevelUpChoice('thread')}
                    style={{ flex: 1 }}
                  >
                    +1 Thread
                  </button>
                  <button
                    className={`btn ${levelUpChoice === 'ability' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setLevelUpChoice('ability')}
                    style={{ flex: 1 }}
                  >
                    Species Ability
                  </button>
                </div>
              </div>
            )}

            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setLevelUpChar(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleLevelUp}
                disabled={levelUpChar.level + 1 !== 3 && !levelUpChoice}
              >
                Confirm Level Up
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RosterView
