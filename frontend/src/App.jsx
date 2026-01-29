import React, { useState, useEffect } from 'react'
import CharacterSheet from './components/CharacterSheet'
import RosterView from './components/RosterView'
import TownView from './components/TownView'
import SessionPanel from './components/SessionPanel'
import ChatWindow from './components/ChatWindow'
import PartyStatus from './components/PartyStatus'
import ImagePanel from './components/ImagePanel'
import CampaignSelector from './components/CampaignSelector'
import SettingsModal from './components/SettingsModal'
import InCampaignHeader from './components/InCampaignHeader'

const API_BASE = '/api'

function App() {
  // Campaign state
  const [currentView, setCurrentView] = useState('campaign-select') // 'campaign-select' | 'in-campaign'
  const [campaigns, setCampaigns] = useState([])
  const [activeCampaignId, setActiveCampaignId] = useState(null)
  const [activeCampaign, setActiveCampaign] = useState(null)
  const [showSettings, setShowSettings] = useState(false)

  // In-campaign state
  const [view, setView] = useState('session') // 'session', 'roster', 'town'
  const [session, setSession] = useState(null)
  const [roster, setRoster] = useState([])
  const [town, setTown] = useState(null)
  const [selectedCharacter, setSelectedCharacter] = useState(null)
  const [systemConfig, setSystemConfig] = useState(null)

  // Fetch campaigns on mount
  useEffect(() => {
    fetchCampaigns()
  }, [])

  // When campaign is selected, fetch campaign data
  useEffect(() => {
    if (activeCampaignId && currentView === 'in-campaign') {
      fetchSystemConfig()
      fetchSession()
      fetchRoster()
      fetchTown()
    }
  }, [activeCampaignId, currentView])

  // Refetch session when switching to session view
  useEffect(() => {
    if (view === 'session' && activeCampaignId) {
      fetchSession()
    }
  }, [view])

  // === Campaign Functions ===

  const fetchCampaigns = async (autoSelect = true) => {
    try {
      const res = await fetch(`${API_BASE}/campaigns`)
      const data = await res.json()
      setCampaigns(data.campaigns || [])

      // If there's only one campaign and autoSelect is true, auto-select it
      if (autoSelect && data.campaigns?.length === 1) {
        selectCampaign(data.campaigns[0].id)
      }
    } catch (err) {
      console.error('Failed to fetch campaigns:', err)
    }
  }

  const selectCampaign = async (campaignId) => {
    try {
      // Update lastPlayed on server
      await fetch(`${API_BASE}/campaigns/${campaignId}/select`, {
        method: 'PUT'
      })

      // Find the campaign in our list
      const campaign = campaigns.find(c => c.id === campaignId) ||
        (await fetch(`${API_BASE}/campaigns/${campaignId}`).then(r => r.json()))

      setActiveCampaignId(campaignId)
      setActiveCampaign(campaign)
      setCurrentView('in-campaign')
      setView('session') // Default to session view
    } catch (err) {
      console.error('Failed to select campaign:', err)
    }
  }

  const switchCampaign = () => {
    setCurrentView('campaign-select')
    setSession(null)
    setRoster([])
    setTown(null)
    setSystemConfig(null)
    fetchCampaigns(false) // Refresh campaign list without auto-select
  }

  // === Data Fetching (Campaign-Scoped) ===

  const fetchSystemConfig = async () => {
    if (!activeCampaignId) return
    try {
      const res = await fetch(`${API_BASE}/campaigns/${activeCampaignId}/system`)
      const data = await res.json()
      setSystemConfig(data)
    } catch (err) {
      console.error('Failed to fetch system config:', err)
    }
  }

  const fetchSession = async () => {
    if (!activeCampaignId) return
    try {
      const res = await fetch(`${API_BASE}/campaigns/${activeCampaignId}/session`)
      const data = await res.json()
      setSession(data)
    } catch (err) {
      console.error('Failed to fetch session:', err)
    }
  }

  const fetchRoster = async () => {
    if (!activeCampaignId) return
    try {
      const res = await fetch(`${API_BASE}/campaigns/${activeCampaignId}/characters`)
      const data = await res.json()
      setRoster(data)
    } catch (err) {
      console.error('Failed to fetch roster:', err)
    }
  }

  const fetchTown = async () => {
    if (!activeCampaignId) return
    try {
      const res = await fetch(`${API_BASE}/campaigns/${activeCampaignId}/town`)
      const data = await res.json()
      setTown(data)
    } catch (err) {
      console.error('Failed to fetch town:', err)
    }
  }

  // === Action Handlers (Campaign-Scoped) ===

  const handleCreateCharacter = async (character) => {
    if (!activeCampaignId) return
    try {
      const res = await fetch(`${API_BASE}/campaigns/${activeCampaignId}/characters`, {
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
    if (!activeCampaignId) return
    try {
      const res = await fetch(`${API_BASE}/campaigns/${activeCampaignId}/session/start`, {
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
    if (!activeCampaignId) return
    try {
      const res = await fetch(`${API_BASE}/campaigns/${activeCampaignId}/session/update`, {
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
    if (!activeCampaignId) return
    if (!confirm(`End the run with "${outcome}"?`)) return

    try {
      // First complete the authored run if applicable
      try {
        await fetch(`${API_BASE}/campaigns/${activeCampaignId}/complete-run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            outcome,
            facts_learned: [],
            npcs_met: [],
            locations_visited: []
          })
        })
      } catch (runErr) {
        // Ignore if no active authored run (freestyle campaign)
        console.log('No authored run to complete (freestyle campaign)')
      }

      // Then end the session
      await fetch(`${API_BASE}/campaigns/${activeCampaignId}/session/end`, {
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

  // === Render ===

  // Campaign selector view
  if (currentView === 'campaign-select') {
    return (
      <div className="app">
        <CampaignSelector
          campaigns={campaigns}
          onSelectCampaign={selectCampaign}
          onOpenSettings={() => setShowSettings(true)}
        />

        {showSettings && (
          <SettingsModal
            campaigns={campaigns}
            onClose={() => setShowSettings(false)}
            onRefresh={() => fetchCampaigns(false)}
          />
        )}
      </div>
    )
  }

  // In-campaign view
  return (
    <div className="app">
      <InCampaignHeader
        campaign={activeCampaign}
        view={view}
        setView={setView}
        onSwitchCampaign={switchCampaign}
      />

      <main className="app-main">
        {view === 'session' && (
          <div className="session-view">
            <div className="session-left">
              <ChatWindow
                session={session}
                onSessionUpdate={handleUpdateSession}
                onRefreshSession={fetchSession}
                campaignId={activeCampaignId}
              />
            </div>
            <div className="session-right">
              <PartyStatus
                session={session}
                onUpdate={handleUpdateSession}
              />
              <ImagePanel session={session} />
              <SessionPanel
                session={session}
                onEndSession={handleEndSession}
              />
            </div>
            <div className="scroll-btns">
              <button
                className="scroll-btn up"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                title="Scroll to top"
              >
                ↑
              </button>
              <button
                className="scroll-btn down"
                onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                title="Scroll to bottom"
              >
                ↓
              </button>
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
            onRefresh={fetchRoster}
            campaignId={activeCampaignId}
            systemConfig={systemConfig}
          />
        )}

        {view === 'town' && (
          <TownView
            town={town}
            onUpdate={fetchTown}
            campaignId={activeCampaignId}
            systemConfig={systemConfig}
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
              systemConfig={systemConfig}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
