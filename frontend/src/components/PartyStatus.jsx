import React from 'react'

function PartyStatus({ session, onUpdate }) {
  if (!session?.active) {
    return null
  }

  const updatePartyMember = (index, field, value) => {
    const newParty = [...session.party]
    newParty[index] = { ...newParty[index], [field]: value }
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
              
              <div className="hearts">
                {[...Array(5)].map((_, j) => (
                  <span 
                    key={j} 
                    className={`heart ${j < member.currentHearts ? '' : 'empty'}`}
                    onClick={() => updatePartyMember(i, 'currentHearts', j + 1)}
                    style={{ cursor: 'pointer' }}
                  >
                    ♥
                  </span>
                ))}
              </div>
              
              <div className="threads">
                {[...Array(3)].map((_, j) => (
                  <span 
                    key={j} 
                    className={`thread ${j < member.currentThreads ? '' : 'empty'}`}
                    onClick={() => updatePartyMember(i, 'currentThreads', j + 1)}
                    style={{ cursor: 'pointer' }}
                  >
                    ✦
                  </span>
                ))}
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
