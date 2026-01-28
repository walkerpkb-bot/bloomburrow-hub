import React, { useState } from 'react'

const API_BASE = '/api'

const BUILDINGS = [
  { key: 'generalStore', name: 'General Store', cost: 0, desc: 'Basic items, healing berries' },
  { key: 'blacksmith', name: 'Blacksmith', cost: 20, desc: 'Weapons, armor, repairs' },
  { key: 'weaversHut', name: "Weaver's Hut", cost: 20, desc: 'New weaves, Thread potions' },
  { key: 'inn', name: 'Inn', cost: 15, desc: 'Rumors, recruit companions' },
  { key: 'shrine', name: 'Shrine', cost: 30, desc: 'Respec stats, change traits' },
  { key: 'watchtower', name: 'Watchtower', cost: 25, desc: 'See next run danger level' },
  { key: 'garden', name: 'Garden', cost: 15, desc: 'Grow healing items' },
]

function TownView({ town, onUpdate, campaignId }) {
  const [editingName, setEditingName] = useState(false)
  const [townName, setTownName] = useState(town?.name || '')

  const saveTownName = async () => {
    try {
      await fetch(`${API_BASE}/campaigns/${campaignId}/town`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: townName })
      })
      setEditingName(false)
      onUpdate()
    } catch (err) {
      console.error('Failed to save town name:', err)
    }
  }

  const toggleBuilding = async (key) => {
    const building = BUILDINGS.find(b => b.key === key)
    const isBuilt = town?.buildings?.[key]
    
    if (isBuilt) return // Can't un-build
    
    if (town.seeds < building.cost) {
      alert(`Not enough seeds! Need ${building.cost}, have ${town.seeds}`)
      return
    }

    try {
      await fetch(`${API_BASE}/campaigns/${campaignId}/town`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          seeds: town.seeds - building.cost,
          buildings: { [key]: true }
        })
      })
      onUpdate()
    } catch (err) {
      console.error('Failed to build:', err)
    }
  }

  const addSeeds = async (amount) => {
    try {
      await fetch(`${API_BASE}/campaigns/${campaignId}/town`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seeds: (town?.seeds || 0) + amount })
      })
      onUpdate()
    } catch (err) {
      console.error('Failed to add seeds:', err)
    }
  }

  if (!town) return <div>Loading...</div>

  return (
    <div className="town-view">
      {/* Left Column - Town Info & Buildings */}
      <div>
        {/* Town Name */}
        <div className="card mb-2">
          <div className="card-header golden">Town Name</div>
          <div className="card-body">
            {editingName ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={townName}
                  onChange={(e) => setTownName(e.target.value)}
                  placeholder="Name your town..."
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary" onClick={saveTownName}>Save</button>
              </div>
            ) : (
              <div 
                onClick={() => setEditingName(true)}
                style={{ cursor: 'pointer', fontWeight: 600, fontSize: '1.2rem' }}
              >
                {town.name || '(Click to name your town)'}
              </div>
            )}
          </div>
        </div>

        {/* Treasury */}
        <div className="card mb-2">
          <div className="card-header golden">Treasury</div>
          <div className="card-body">
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--golden)' }}>
              🌰 {town.seeds} Seeds
            </div>
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary"
                onClick={() => addSeeds(-1)}
                style={{ flex: 'none', padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
              >
                -1
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => addSeeds(1)}
                style={{ flex: 'none', padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
              >
                +1
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => addSeeds(5)}
                style={{ flex: 'none', padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
              >
                +5
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => addSeeds(10)}
                style={{ flex: 'none', padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
              >
                +10
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => addSeeds(20)}
                style={{ flex: 'none', padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
              >
                +20
              </button>
            </div>
          </div>
        </div>

        {/* Buildings */}
        <div className="card">
          <div className="card-header brown">Buildings</div>
          <div className="card-body">
            <div className="building-list">
              {BUILDINGS.map(building => {
                const isBuilt = town.buildings?.[building.key]
                const canAfford = town.seeds >= building.cost
                
                return (
                  <div 
                    key={building.key} 
                    className={`building-item ${!isBuilt && !canAfford ? 'locked' : ''}`}
                    onClick={() => !isBuilt && toggleBuilding(building.key)}
                    style={{ cursor: isBuilt ? 'default' : 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      checked={isBuilt}
                      readOnly
                    />
                    <div style={{ flex: 1 }}>
                      <div className="name">{building.name}</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{building.desc}</div>
                    </div>
                    {!isBuilt && (
                      <div className="cost">
                        {building.cost > 0 ? `${building.cost} 🌰` : 'FREE'}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Map Area */}
      <div>
        <div className="card" style={{ height: '100%' }}>
          <div className="card-header">Town Map</div>
          <div className="card-body" style={{ 
            minHeight: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--parchment)',
            color: '#999',
            fontStyle: 'italic'
          }}>
            Draw your town here as it grows!
            <br /><br />
            (Future: upload/display town drawing)
          </div>
        </div>
      </div>
    </div>
  )
}

export default TownView
