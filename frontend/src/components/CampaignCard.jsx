import React from 'react'

function CampaignCard({ campaign, onClick }) {
  // Format last played date
  const formatLastPlayed = (dateString) => {
    if (!dateString) return 'Never played'

    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  return (
    <div className={`campaign-card ${campaign.isDraft ? 'is-draft' : ''}`} onClick={onClick}>
      {/* Banner Image */}
      <div
        className="campaign-card-banner"
        style={campaign.bannerImage ? {
          backgroundImage: `url(${campaign.bannerImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        } : {}}
      >
        {campaign.isDraft && (
          <div className="campaign-card-draft-banner">Draft - Incomplete</div>
        )}
      </div>

      {/* Card Body */}
      <div className="campaign-card-body">
        <h2 className="campaign-card-name">{campaign.name}</h2>

        {campaign.description && (
          <p className="campaign-card-description">{campaign.description}</p>
        )}

        <div className="campaign-card-meta">
          <div className="campaign-card-stats">
            <span className="campaign-card-stat">
              {campaign.characterCount || 0} character{campaign.characterCount !== 1 ? 's' : ''}
            </span>
            <span className="campaign-card-stat campaign-card-currency">
              {campaign.currencyAmount || 0} {campaign.currencyName || 'gold'}
            </span>
          </div>
          <span className="campaign-card-last-played">
            {formatLastPlayed(campaign.lastPlayed)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default CampaignCard
