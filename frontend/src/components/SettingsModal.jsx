import React, { useState, useRef, useEffect } from 'react'
import CampaignForm from './CampaignForm'

const API_BASE = '/api'

function SettingsModal({ campaigns, onClose, onRefresh }) {
  const [editingCampaign, setEditingCampaign] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [quickCreateName, setQuickCreateName] = useState('')
  const [showQuickCreate, setShowQuickCreate] = useState(false)
  const [editingDraftId, setEditingDraftId] = useState(null) // Campaign ID when editing a draft
  const [draftInitialData, setDraftInitialData] = useState(null) // Draft content to load into form
  const [draftInitialSystem, setDraftInitialSystem] = useState(null) // Draft system config to load into form
  const [loadingDraft, setLoadingDraft] = useState(false)
  const fileInputRef = useRef(null)

  const handleEditClick = (campaign) => {
    setEditingCampaign(editingCampaign?.id === campaign.id ? null : campaign)
  }

  const handleDeleteCampaign = async (campaign) => {
    if (!confirm(`Delete "${campaign.name}"? This cannot be undone.`)) return

    try {
      const res = await fetch(`${API_BASE}/campaigns/${campaign.id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        onRefresh?.()
        setEditingCampaign(null)
      } else {
        const err = await res.json()
        alert(err.detail || 'Failed to delete campaign')
      }
    } catch (err) {
      console.error('Delete failed:', err)
      alert('Failed to delete campaign')
    }
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
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleQuickCreate = async () => {
    if (!quickCreateName.trim()) return

    try {
      const res = await fetch(`${API_BASE}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickCreateName.trim(),
          description: '',
          currencyName: 'gold'
        })
      })

      if (res.ok) {
        onRefresh?.()
        setQuickCreateName('')
        setShowQuickCreate(false)
        setShowAddMenu(false)
      } else {
        const err = await res.json()
        alert(err.detail || 'Failed to create campaign')
      }
    } catch (err) {
      console.error('Create failed:', err)
      alert('Failed to create campaign')
    }
  }

  const handleFullFormSubmit = async (data) => {
    // data is { content, system }
    const { content, system } = data
    try {
      let campaignId = editingDraftId

      // If not editing an existing draft, create campaign first
      if (!campaignId) {
        const createRes = await fetch(`${API_BASE}/campaigns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: content.name,
            description: content.premise,
            currencyName: system?.currency?.name || 'gold'
          })
        })

        if (!createRes.ok) {
          const err = await createRes.json()
          alert(err.detail || 'Failed to create campaign')
          return
        }

        const newCampaign = await createRes.json()
        campaignId = newCampaign.id
      }

      // Save the system config
      if (system) {
        const systemRes = await fetch(`${API_BASE}/campaigns/${campaignId}/system`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(system)
        })

        if (!systemRes.ok) {
          console.error('Failed to save system config')
        }
      }

      // Save the full content (validates and marks as non-draft)
      const contentRes = await fetch(`${API_BASE}/campaigns/${campaignId}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })

      if (!contentRes.ok) {
        const err = await contentRes.json()
        alert(err.detail?.errors?.join('\n') || 'Failed to save campaign content')
        return
      }

      onRefresh?.()
      setShowCampaignForm(false)
      setShowAddMenu(false)
      setEditingDraftId(null)
      setDraftInitialData(null)
      setDraftInitialSystem(null)
    } catch (err) {
      console.error('Create failed:', err)
      alert('Failed to create campaign')
    }
  }

  const handleSaveDraft = async (data) => {
    // data is { content, system }
    const { content, system } = data
    try {
      let campaignId = editingDraftId

      // If not editing an existing draft, create campaign first
      if (!campaignId) {
        const createRes = await fetch(`${API_BASE}/campaigns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: content.name || 'Untitled Campaign',
            description: content.premise || '',
            currencyName: system?.currency?.name || 'gold'
          })
        })

        if (!createRes.ok) {
          const err = await createRes.json()
          alert(err.detail || 'Failed to create campaign')
          return
        }

        const newCampaign = await createRes.json()
        campaignId = newCampaign.id
      }

      // Save the system config
      if (system) {
        const systemRes = await fetch(`${API_BASE}/campaigns/${campaignId}/system`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(system)
        })

        if (!systemRes.ok) {
          console.error('Failed to save system config')
        }
      }

      // Save as draft (no validation)
      const draftRes = await fetch(`${API_BASE}/campaigns/${campaignId}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })

      if (!draftRes.ok) {
        const err = await draftRes.json()
        alert(err.detail || 'Failed to save draft')
        return
      }

      onRefresh?.()
      setShowCampaignForm(false)
      setShowAddMenu(false)
      setEditingDraftId(null)
      setDraftInitialData(null)
      setDraftInitialSystem(null)
    } catch (err) {
      console.error('Save draft failed:', err)
      alert('Failed to save draft')
    }
  }

  const handleContinueEditing = async (campaign) => {
    setLoadingDraft(true)
    try {
      // Fetch draft content
      const res = await fetch(`${API_BASE}/campaigns/${campaign.id}/draft`)
      if (res.ok) {
        const data = await res.json()
        if (data.hasDraft && data.content) {
          setDraftInitialData(data.content)
        }
      }

      // Also fetch system config
      const systemRes = await fetch(`${API_BASE}/campaigns/${campaign.id}/system`)
      if (systemRes.ok) {
        const systemData = await systemRes.json()
        setDraftInitialSystem(systemData)
      }

      setEditingDraftId(campaign.id)
      setShowCampaignForm(true)
      setEditingCampaign(null)
    } catch (err) {
      console.error('Failed to load draft:', err)
    } finally {
      setLoadingDraft(false)
    }
  }

  // Show campaign form in full screen
  if (showCampaignForm) {
    return (
      <div className="campaign-form-modal">
        <CampaignForm
          onSubmit={handleFullFormSubmit}
          onCancel={() => {
            setShowCampaignForm(false)
            setEditingDraftId(null)
            setDraftInitialData(null)
            setDraftInitialSystem(null)
          }}
          onSaveDraft={handleSaveDraft}
          initialData={draftInitialData}
          initialSystem={draftInitialSystem}
        />
      </div>
    )
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
                  <span className="settings-campaign-name">
                    {campaign.name}
                    {campaign.isDraft && <span className="draft-badge">Draft</span>}
                  </span>
                  <span className="settings-campaign-chars">
                    {campaign.characterCount || 0} characters
                  </span>
                </div>
                <div className="settings-campaign-actions">
                  <div className="edit-wrapper">
                    <button
                      className="btn-small"
                      onClick={() => handleEditClick(campaign)}
                      disabled={loadingDraft}
                    >
                      {loadingDraft && editingCampaign?.id === campaign.id ? 'Loading...' : 'Edit'}
                    </button>
                    {editingCampaign?.id === campaign.id && (
                      <div className="edit-menu">
                        {campaign.isDraft && (
                          <button
                            className="edit-menu-item"
                            onClick={() => handleContinueEditing(campaign)}
                            disabled={loadingDraft}
                          >
                            Continue Editing
                          </button>
                        )}
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
                    onClick={() => handleDeleteCampaign(campaign)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="settings-add-section">
            {!showAddMenu && !showQuickCreate && (
              <button
                className="btn-primary"
                onClick={() => setShowAddMenu(true)}
              >
                + Add New Campaign
              </button>
            )}

            {showAddMenu && !showQuickCreate && (
              <div className="add-menu">
                <p className="add-menu-label">Choose creation method:</p>
                <div className="add-menu-buttons">
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setShowQuickCreate(true)
                      setShowAddMenu(false)
                    }}
                  >
                    Quick Create
                    <span className="btn-hint">Name only, freestyle play</span>
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => setShowCampaignForm(true)}
                  >
                    Full Setup
                    <span className="btn-hint">NPCs, locations, story beats</span>
                  </button>
                </div>
                <button
                  className="btn-link"
                  onClick={() => setShowAddMenu(false)}
                >
                  Cancel
                </button>
              </div>
            )}

            {showQuickCreate && (
              <div className="quick-create">
                <input
                  type="text"
                  value={quickCreateName}
                  onChange={e => setQuickCreateName(e.target.value)}
                  placeholder="Campaign name..."
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleQuickCreate()}
                />
                <div className="quick-create-buttons">
                  <button
                    className="btn-primary"
                    onClick={handleQuickCreate}
                    disabled={!quickCreateName.trim()}
                  >
                    Create
                  </button>
                  <button
                    className="btn-link"
                    onClick={() => {
                      setShowQuickCreate(false)
                      setQuickCreateName('')
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
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
