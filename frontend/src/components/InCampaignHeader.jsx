import React from 'react'

function InCampaignHeader({ campaign, view, setView, onSwitchCampaign }) {
  return (
    <header className="in-campaign-header">
      <div className="header-title-section">
        <h1>{campaign?.name || 'Campaign'}</h1>
        <button
          className="switch-campaign-btn"
          onClick={onSwitchCampaign}
        >
          (switch campaigns)
        </button>
      </div>

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
  )
}

export default InCampaignHeader
