import React, { useState } from 'react'

function PartyStatus({ session, onUpdate }) {
  const [addingItem, setAddingItem] = useState(null) // index of character adding to
  const [newItemName, setNewItemName] = useState('')

  if (!session?.active) {
    return null
  }

  const updatePartyMember = (index, field, value) => {
    const newParty = [...session.party]
    newParty[index] = { ...newParty[index], [field]: value }
    onUpdate({ party: newParty })
  }

  const addItem = (memberIndex) => {
    if (!newItemName.trim()) return
    const newParty = [...session.party]
    const currentGear = newParty[memberIndex].gear || []
    newParty[memberIndex] = { ...newParty[memberIndex], gear: [...currentGear, newItemName.trim()] }
    onUpdate({ party: newParty })
    setNewItemName('')
    setAddingItem(null)
  }

  const removeItem = (memberIndex, itemIndex) => {
    const newParty = [...session.party]
    const newGear = newParty[memberIndex].gear.filter((_, i) => i !== itemIndex)
    newParty[memberIndex] = { ...newParty[memberIndex], gear: newGear }
    onUpdate({ party: newParty })
  }

  const updateEnemy = (index, field, value) => {
    const newEnemies = [...session.enemies]
    newEnemies[index] = { ...newEnemies[index], [field]: value }
    onUpdate({ enemies: newEnemies })
  }

  const removeEnemy = (index) => {
    const newEnemies = session.enemies.filter((_, i) => i !== index)
    onUpdate({ enemies: newEnemies })
  }

  return (
    <>
      {/* Party */}
      <div className="card party-status">
        <div className="card-header">Party</div>
        <div className="card-body">
          {session.party.map((member, i) => (
            <div key={i} className="character-card">
              <h4>{member.name}</h4>
              <div className="species">{member.species}</div>
              
              <div className="hearts" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <button
                  type="button"
                  className="stat-adj-btn"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if ((member.maxHearts || 5) > 1) updatePartyMember(i, 'maxHearts', (member.maxHearts || 5) - 1)
                  }}
                  style={{ padding: '0 4px', fontSize: '0.7rem', cursor: 'pointer', background: 'var(--parchment)', border: '1px solid var(--warm-brown)', borderRadius: '3px' }}
                >-</button>
                {[...Array(member.maxHearts || 5)].map((_, j) => (
                  <button
                    key={j}
                    type="button"
                    className={`heart-btn ${j < member.currentHearts ? 'filled' : 'empty'}`}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      updatePartyMember(i, 'currentHearts', j + 1)
                    }}
                  >
                    ♥
                  </button>
                ))}
                <button
                  type="button"
                  className="stat-adj-btn"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    updatePartyMember(i, 'maxHearts', (member.maxHearts || 5) + 1)
                  }}
                  style={{ padding: '0 4px', fontSize: '0.7rem', cursor: 'pointer', background: 'var(--parchment)', border: '1px solid var(--warm-brown)', borderRadius: '3px' }}
                >+</button>
              </div>

              <div className="threads" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <button
                  type="button"
                  className="stat-adj-btn"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if ((member.maxThreads || 3) > 1) updatePartyMember(i, 'maxThreads', (member.maxThreads || 3) - 1)
                  }}
                  style={{ padding: '0 4px', fontSize: '0.7rem', cursor: 'pointer', background: 'var(--parchment)', border: '1px solid var(--warm-brown)', borderRadius: '3px' }}
                >-</button>
                {[...Array(member.maxThreads || 3)].map((_, j) => (
                  <button
                    key={j}
                    type="button"
                    className={`thread-btn ${j < member.currentThreads ? 'filled' : 'empty'}`}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      updatePartyMember(i, 'currentThreads', j + 1)
                    }}
                  >
                    ✦
                  </button>
                ))}
                <button
                  type="button"
                  className="stat-adj-btn"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    updatePartyMember(i, 'maxThreads', (member.maxThreads || 3) + 1)
                  }}
                  style={{ padding: '0 4px', fontSize: '0.7rem', cursor: 'pointer', background: 'var(--parchment)', border: '1px solid var(--warm-brown)', borderRadius: '3px' }}
                >+</button>
              </div>

              <div className="inventory">
                {(member.gear || []).map((item, j) => (
                  <span key={j} className="inventory-item">
                    {item}
                    <button
                      className="remove-item"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        removeItem(i, j)
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {addingItem === i ? (
                  <span className="add-item-input">
                    <input
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addItem(i)
                        if (e.key === 'Escape') { setAddingItem(null); setNewItemName('') }
                      }}
                      placeholder="Item name"
                      autoFocus
                    />
                    <button onClick={() => addItem(i)}>+</button>
                    <button onClick={() => { setAddingItem(null); setNewItemName('') }}>×</button>
                  </span>
                ) : (
                  <button
                    className="add-item-btn"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setAddingItem(i)
                    }}
                  >
                    +
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enemies */}
      {session.enemies && session.enemies.length > 0 && (
        <div className="card">
          <div className="card-header red">Enemies</div>
          <div className="card-body">
            <div className="enemies-list">
              {session.enemies.map((enemy, i) => (
                <div key={i} className="enemy-card">
                  <span className="name">{enemy.name}</span>
                  <div className="hearts">
                    {[...Array(enemy.maxHearts)].map((_, j) => (
                      <span 
                        key={j} 
                        className={`heart ${j < enemy.currentHearts ? '' : 'empty'}`}
                        onClick={() => updateEnemy(i, 'currentHearts', j + 1)}
                        style={{ cursor: 'pointer' }}
                      >
                        ♥
                      </span>
                    ))}
                    <span 
                      onClick={() => removeEnemy(i)}
                      style={{ cursor: 'pointer', marginLeft: '0.5rem', opacity: 0.5 }}
                    >
                      ✕
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default PartyStatus
