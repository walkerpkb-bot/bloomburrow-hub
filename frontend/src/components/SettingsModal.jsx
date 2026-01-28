import React, { useState, useRef } from 'react'

const API_BASE = '/api'

function SettingsModal({ campaigns, onClose, onRefresh }) {
  const [editingCampaign, setEditingCampaign] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleEditClick = (campaign) => {
    setEditingCampaign(editingCampaign?.id === campaign.id ? null : campaign)
  }

  const handleAddArt = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !editingCampaign) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${API_BASE}/campaigns/${editingCampaign.id}/banner`, {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        // Refresh campaigns to show new banner
        onRefresh?.()
        setEditingCampaign(null)
      } else {
        const err = await res.json()
        alert(err.detail || 'Failed to upload image')
      }
    } catch (err) {
      console.error('Upload failed:', err)
      alert('Failed to upload image')
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Campaign Settings</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <h3>Your Campaigns</h3>

          <div className="settings-campaign-list">
            {campaigns.map(campaign => (
              <div key={campaign.id} className="settings-campaign-item">
                <div className="settings-campaign-info">
                  <span className="settings-campaign-name">{campaign.name}</span>
                  <span className="settings-campaign-chars">
                    {campaign.characterCount || 0} characters
                  </span>
                </div>
                <div className="settings-campaign-actions">
                  <div className="edit-wrapper">
                    <button
                      className="btn-small"
                      onClick={() => handleEditClick(campaign)}
                    >
                      Edit
                    </button>
                    {editingCampaign?.id === campaign.id && (
                      <div className="edit-menu">
                        <button
                          className="edit-menu-item"
                          onClick={handleAddArt}
                          disabled={uploading}
                        >
                          {uploading ? 'Uploading...' : 'Add Campaign Art'}
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    className="btn-small btn-danger"
                    disabled
                    title="Coming soon"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="settings-add-section">
            <button className="btn-primary" disabled title="Coming soon">
              + Add New Campaign
            </button>
            <p className="settings-note">
              More campaign management features coming soon.
            </p>
          </div>
        </div>

        {/* Hidden file input for image upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </div>
    </div>
  )
}

export default SettingsModal
