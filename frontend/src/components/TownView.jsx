import React, { useState } from 'react'

const API_BASE = '/api'

// Default values for backwards compatibility
const DEFAULT_BUILDINGS = [
  { key: 'generalStore', name: 'General Store', cost: 0, desc: 'Basic items, supplies' },
  { key: 'blacksmith', name: 'Blacksmith', cost: 20, desc: 'Weapons, armor, repairs' },
  { key: 'inn', name: 'Inn', cost: 15, desc: 'Rumors, recruit companions' },
  { key: 'temple', name: 'Temple', cost: 30, desc: 'Healing and blessings' },
]

const DEFAULT_CURRENCY = {
  name: 'Gold',
  symbol: '🪙'
}

function TownView({ town, onUpdate, campaignId, systemConfig }) {
  // Extract config or use defaults
  const buildings = systemConfig?.buildings || DEFAULT_BUILDINGS
  const currencyConfig = systemConfig?.currency || DEFAULT_CURRENCY
  const currencyName = currencyConfig.name || 'Gold'
  const currencySymbol = currencyConfig.symbol || '🪙'

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
    const building = buildings.find(b => b.key === key)
    const isBuilt = town?.buildings?.[key]

    if (isBuilt) return // Can't un-build

    if (town.seeds < building.cost) {
      alert(`Not enough ${currencyName.toLowerCase()}! Need ${building.cost}, have ${town.seeds}`)
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

  const addCurrency = async (amount) => {
    try {
      await fetch(`${API_BASE}/campaigns/${campaignId}/town`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seeds: (town?.seeds || 0) + amount })
      })
      onUpdate()
    } catch (err) {
      console.error('Failed to add currency:', err)
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
              {currencySymbol} {town.seeds} {currencyName}
            </div>
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary"
                onClick={() => addCurrency(-1)}
                style={{ flex: 'none', padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
              >
                -1
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => addCurrency(1)}
                style={{ flex: 'none', padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
              >
                +1
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => addCurrency(5)}
                style={{ flex: 'none', padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
              >
                +5
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => addCurrency(10)}
                style={{ flex: 'none', padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}
              >
                +10
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => addCurrency(20)}
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
              {buildings.map(building => {
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
                        {building.cost > 0 ? `${building.cost} ${currencySymbol}` : 'FREE'}
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
