import React, { useState, useEffect } from 'react'
import CharacterSheet from './components/CharacterSheet'
import RosterView from './components/RosterView'
import TownView from './components/TownView'
import SessionPanel from './components/SessionPanel'
import ChatWindow from './components/ChatWindow'
import DiceRoller from './components/DiceRoller'
import PartyStatus from './components/PartyStatus'

const API_BASE = '/api'

function App() {
  const [view, setView] = useState('session') // 'session', 'roster', 'town'
  const [session, setSession] = useState(null)
  const [roster, setRoster] = useState([])
  const [town, setTown] = useState(null)
  const [selectedCharacter, setSelectedCharacter] = useState(null)

  // Fetch initial data
  useEffect(() => {
    fetchSession()
    fetchRoster()
    fetchTown()
  }, [])

  // Refetch session when switching to session view
  useEffect(() => {
    if (view === 'session') {
      fetchSession()
    }
  }, [view])

  const fetchSession = async () => {
    try {
      const res = await fetch(`${API_BASE}/session`)
      const data = await res.json()
      setSession(data)
    } catch (err) {
      console.error('Failed to fetch session:', err)
    }
  }

  const fetchRoster = async () => {
    try {
      const res = await fetch(`${API_BASE}/characters`)
      const data = await res.json()
      setRoster(data)
    } catch (err) {
      console.error('Failed to fetch roster:', err)
    }
  }

  const fetchTown = async () => {
    try {
      const res = await fetch(`${API_BASE}/town`)
      const data = await res.json()
      setTown(data)
    } catch (err) {
      console.error('Failed to fetch town:', err)
    }
  }

  const handleCreateCharacter = async (character) => {
    try {
      const res = await fetch(`${API_BASE}/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(character)
      })
      const newChar = await res.json()
      setRoster([...roster, newChar])
      setSelectedCharacter(null)
    } catch (err) {
      console.error('Failed to create character:', err)
    }
  }

  const handleStartSession = async (quest, location, partyIds) => {
    try {
      const res = await fetch(`${API_BASE}/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quest, location, partyIds })
      })
      const data = await res.json()
      setSession(data)
      setView('session')
    } catch (err) {
      console.error('Failed to start session:', err)
    }
  }

  const handleUpdateSession = async (updates) => {
    try {
      const res = await fetch(`${API_BASE}/session/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      const data = await res.json()
      setSession(data)
    } catch (err) {
      console.error('Failed to update session:', err)
    }
  }

  const handleEndSession = async (outcome) => {
    if (!confirm(`End the run with "${outcome}"?`)) return

    try {
      await fetch(`${API_BASE}/session/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome })
      })
      fetchSession()
      fetchRoster() // Refresh to show updated XP
    } catch (err) {
      console.error('Failed to end session:', err)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🌿 Bloomburrow Hub</h1>
        <nav>
          <button 
            className={view === 'session' ? 'active' : ''} 
            onClick={() => setView('session')}
          >
            Adventure
          </button>
          <button 
            className={view === 'roster' ? 'active' : ''} 
            onClick={() => setView('roster')}
          >
            Roster
          </button>
          <button 
            className={view === 'town' ? 'active' : ''} 
            onClick={() => setView('town')}
          >
            Town
          </button>
        </nav>
      </header>

      <main className="app-main">
        {view === 'session' && (
          <div className="session-view">
            <div className="session-left">
              <ChatWindow
                session={session}
                onSessionUpdate={handleUpdateSession}
              />
            </div>
            <div className="session-right">
              <PartyStatus
                session={session}
                onUpdate={handleUpdateSession}
              />
              <DiceRoller />
              <SessionPanel
                session={session}
                onEndSession={handleEndSession}
              />
            </div>
          </div>
        )}

        {view === 'roster' && (
          <RosterView 
            roster={roster}
            onCreateCharacter={() => setSelectedCharacter({})}
            onSelectCharacter={setSelectedCharacter}
            onStartSession={handleStartSession}
            sessionActive={session?.active}
          />
        )}

        {view === 'town' && (
          <TownView 
            town={town}
            onUpdate={fetchTown}
          />
        )}
      </main>

      {selectedCharacter !== null && (
        <div className="modal-overlay" onClick={() => setSelectedCharacter(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <CharacterSheet 
              character={selectedCharacter}
              onSave={handleCreateCharacter}
              onCancel={() => setSelectedCharacter(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
