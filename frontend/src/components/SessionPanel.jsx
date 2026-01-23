import React from 'react'

// This component can be expanded for session management controls
// Currently session flow is handled in other components

function SessionPanel({ session, onEndSession }) {
  if (!session?.active) return null

  return (
    <div className="card">
      <div className="card-header purple">Session</div>
      <div className="card-body">
        <div><strong>Phase:</strong> {session.runState}</div>
        <div><strong>Room:</strong> {session.roomNumber} / {session.roomsTotal}</div>
        
        {session.lootCollected?.length > 0 && (
          <div style={{ marginTop: '0.5rem' }}>
            <strong>Loot:</strong>
            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
              {session.lootCollected.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-secondary"
            onClick={() => onEndSession('retreat')}
            style={{ flex: 1, fontSize: '0.85rem' }}
          >
            Retreat
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => onEndSession('victory')}
            style={{ flex: 1, fontSize: '0.85rem' }}
          >
            Victory!
          </button>
        </div>
      </div>
    </div>
  )
}

export default SessionPanel
