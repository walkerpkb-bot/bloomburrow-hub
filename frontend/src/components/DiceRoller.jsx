import React, { useState } from 'react'

const API_BASE = '/api'

function DiceRoller() {
  const [lastRoll, setLastRoll] = useState(null)
  const [modifier, setModifier] = useState(0)

  const rollDie = async (dieType, sides) => {
    // Generate random roll (or input manually)
    const result = Math.floor(Math.random() * sides) + 1
    
    try {
      const res = await fetch(`${API_BASE}/dice/roll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dieType,
          result,
          modifier: dieType === 'd20' ? modifier : 0,
          purpose: ''
        })
      })
      
      const data = await res.json()
      setLastRoll(data)
    } catch (err) {
      // Fallback if API is down
      const total = result + (dieType === 'd20' ? modifier : 0)
      let threshold = null
      if (dieType === 'd20') {
        if (total >= 15) threshold = 'success'
        else if (total >= 10) threshold = 'partial'
        else threshold = 'failure'
      }
      setLastRoll({ die: dieType, result, modifier, total, threshold })
    }
  }

  const getThresholdLabel = (threshold) => {
    switch (threshold) {
      case 'success': return 'Yes!'
      case 'partial': return 'Yes, but...'
      case 'failure': return 'No, and...'
      default: return ''
    }
  }

  return (
    <div className="card dice-roller">
      <div className="card-header golden">Dice</div>
      <div className="card-body">
        <div className="dice-buttons">
          <button className="dice-btn d4" onClick={() => rollDie('d4', 4)}>d4</button>
          <button className="dice-btn d6" onClick={() => rollDie('d6', 6)}>d6</button>
          <button className="dice-btn d8" onClick={() => rollDie('d8', 8)}>d8</button>
          <button className="dice-btn d10" onClick={() => rollDie('d10', 10)}>d10</button>
          <button className="dice-btn d20" onClick={() => rollDie('d20', 20)}>d20</button>
        </div>

        <div className="form-group">
          <label style={{ fontSize: '0.85rem' }}>Modifier (for d20)</label>
          <input
            type="number"
            value={modifier}
            onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
            style={{ width: '80px', textAlign: 'center' }}
          />
        </div>

        {lastRoll && (
          <div className="dice-result">
            <div className="total">
              {lastRoll.result}
              {lastRoll.modifier !== 0 && (
                <span style={{ fontSize: '1rem', opacity: 0.7 }}>
                  {' '}+ {lastRoll.modifier} = {lastRoll.total}
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>{lastRoll.die}</div>
            
            {lastRoll.threshold && (
              <div className={`threshold ${lastRoll.threshold}`}>
                {getThresholdLabel(lastRoll.threshold)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DiceRoller
