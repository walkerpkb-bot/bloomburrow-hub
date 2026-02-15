import React, { useState, useEffect } from 'react'
import PrepCoachChat from './PrepCoachChat'
import { fetchDMPrep, createPrepNote, updatePrepNote, deletePrepNote, pinInsight, deletePin } from '../api/dmPrep'

const NOTE_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'voice', label: 'NPC Voice' },
  { value: 'pacing', label: 'Pacing' },
  { value: 'secret', label: 'Secret' },
  { value: 'reminder', label: 'Reminder' },
]

function DMPrepSection({ campaignId, npcs = [], locations = [], runs = [] }) {
  const [prepData, setPrepData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeSubSection, setActiveSubSection] = useState('chat')

  // Note form state
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [editingNote, setEditingNote] = useState(null)
  const [noteContent, setNoteContent] = useState('')
  const [noteCategory, setNoteCategory] = useState('general')
  const [noteRelatedTo, setNoteRelatedTo] = useState('')

  // Fetch prep data on mount
  useEffect(() => {
    fetchPrepData()
  }, [campaignId])

  const fetchPrepData = async () => {
    try {
      const data = await fetchDMPrep(campaignId)
      setPrepData(data)
    } catch (err) {
      console.error('Failed to fetch DM prep data:', err)
      setPrepData({ author_notes: [], conversation: [], pinned: [] })
    } finally {
      setLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!noteContent.trim()) return

    try {
      const newNote = await createPrepNote(campaignId, {
        content: noteContent.trim(),
        category: noteCategory,
        related_to: noteRelatedTo || null
      })
      setPrepData(prev => ({
        ...prev,
        author_notes: [...prev.author_notes, newNote]
      }))
      resetNoteForm()
    } catch (err) {
      console.error('Failed to add note:', err)
    }
  }

  const handleUpdateNote = async () => {
    if (!editingNote || !noteContent.trim()) return

    try {
      const updatedNote = await updatePrepNote(campaignId, editingNote.id, {
        content: noteContent.trim(),
        category: noteCategory,
        related_to: noteRelatedTo || null
      })
      setPrepData(prev => ({
        ...prev,
        author_notes: prev.author_notes.map(n =>
          n.id === editingNote.id ? updatedNote : n
        )
      }))
      resetNoteForm()
    } catch (err) {
      console.error('Failed to update note:', err)
    }
  }

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Delete this note?')) return

    try {
      await deletePrepNote(campaignId, noteId)
      setPrepData(prev => ({
        ...prev,
        author_notes: prev.author_notes.filter(n => n.id !== noteId)
      }))
    } catch (err) {
      console.error('Failed to delete note:', err)
    }
  }

  const handleDeletePin = async (pinId) => {
    if (!confirm('Unpin this insight?')) return

    try {
      await deletePin(campaignId, pinId)
      setPrepData(prev => ({
        ...prev,
        pinned: prev.pinned.filter(p => p.id !== pinId)
      }))
    } catch (err) {
      console.error('Failed to unpin:', err)
    }
  }

  const handlePinInsight = async (content, category = 'general', relatedTo = null) => {
    try {
      const newPin = await pinInsight(campaignId, { content, category, related_to: relatedTo })
      setPrepData(prev => ({
        ...prev,
        pinned: [...prev.pinned, newPin]
      }))
    } catch (err) {
      console.error('Failed to pin insight:', err)
    }
  }

  const handleConversationUpdate = (conversation) => {
    setPrepData(prev => ({ ...prev, conversation }))
  }

  const startEditNote = (note) => {
    setEditingNote(note)
    setNoteContent(note.content)
    setNoteCategory(note.category)
    setNoteRelatedTo(note.related_to || '')
    setShowNoteForm(true)
  }

  const resetNoteForm = () => {
    setShowNoteForm(false)
    setEditingNote(null)
    setNoteContent('')
    setNoteCategory('general')
    setNoteRelatedTo('')
  }

  // Build related_to options from NPCs, locations, and runs
  const relatedToOptions = [
    { value: '', label: 'None' },
    ...npcs.filter(n => n.name).map(n => ({ value: n.name, label: `NPC: ${n.name}` })),
    ...locations.filter(l => l.name).map(l => ({ value: l.name, label: `Location: ${l.name}` })),
    ...runs.filter(r => r.id).map(r => ({ value: r.id, label: `Episode: ${r.id}` }))
  ]

  if (loading) {
    return (
      <div className="form-section">
        <p className="text-center">Loading DM prep data...</p>
      </div>
    )
  }

  return (
    <div className="form-section dm-prep-section">
      <p className="section-intro">
        Prepare guidance for DMs running your campaign. Chat with the Prep Coach to think through how NPCs should behave, pacing tips, secrets to protect, and more. Notes you create here will be shown to the DM during gameplay.
      </p>

      {/* Sub-section tabs */}
      <div className="sub-section-tabs" style={{ marginBottom: '1rem', display: 'flex', gap: '0.25rem' }}>
        <button
          className={`btn ${activeSubSection === 'chat' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubSection('chat')}
          style={{ fontSize: '0.9rem' }}
        >
          Prep Coach
        </button>
        <button
          className={`btn ${activeSubSection === 'notes' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubSection('notes')}
          style={{ fontSize: '0.9rem' }}
        >
          Notes ({prepData?.author_notes?.length || 0})
        </button>
        <button
          className={`btn ${activeSubSection === 'pinned' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveSubSection('pinned')}
          style={{ fontSize: '0.9rem' }}
        >
          Pinned ({prepData?.pinned?.length || 0})
        </button>
      </div>

      {/* Chat sub-section */}
      {activeSubSection === 'chat' && (
        <PrepCoachChat
          campaignId={campaignId}
          conversation={prepData?.conversation || []}
          onConversationUpdate={handleConversationUpdate}
          onPinInsight={handlePinInsight}
        />
      )}

      {/* Notes sub-section */}
      {activeSubSection === 'notes' && (
        <div className="notes-section">
          {!showNoteForm && (
            <button
              className="add-btn"
              onClick={() => setShowNoteForm(true)}
              style={{ marginBottom: '1rem' }}
            >
              + Add Note
            </button>
          )}

          {showNoteForm && (
            <div className="sub-form-card" style={{ marginBottom: '1rem' }}>
              <div className="sub-form-header">
                <span>{editingNote ? 'Edit Note' : 'New Note'}</span>
                <button className="remove-btn" onClick={resetNoteForm}>Cancel</button>
              </div>

              <div className="form-group">
                <label>Content *</label>
                <textarea
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  placeholder="e.g., Bramblewick should speak in short, clipped sentences, always looking over his shoulder."
                  rows={3}
                  maxLength={1000}
                />
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label>Category</label>
                  <select value={noteCategory} onChange={e => setNoteCategory(e.target.value)}>
                    {NOTE_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group half">
                  <label>Related To</label>
                  <select value={noteRelatedTo} onChange={e => setNoteRelatedTo(e.target.value)}>
                    {relatedToOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={editingNote ? handleUpdateNote : handleAddNote}
                disabled={!noteContent.trim()}
              >
                {editingNote ? 'Save Changes' : 'Add Note'}
              </button>
            </div>
          )}

          {prepData?.author_notes?.length > 0 ? (
            <div className="notes-list">
              {prepData.author_notes.map(note => (
                <div key={note.id} className="note-card">
                  <div className="note-header">
                    <span className={`note-category cat-${note.category}`}>
                      {NOTE_CATEGORIES.find(c => c.value === note.category)?.label || note.category}
                    </span>
                    {note.related_to && (
                      <span className="note-related">re: {note.related_to}</span>
                    )}
                    <div className="note-actions">
                      <button className="edit-btn" onClick={() => startEditNote(note)}>Edit</button>
                      <button className="remove-btn" onClick={() => handleDeleteNote(note.id)}>Delete</button>
                    </div>
                  </div>
                  <div className="note-content">{note.content}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-center" style={{ padding: '2rem' }}>
              No notes yet. Add notes to help DMs run your campaign.
            </p>
          )}
        </div>
      )}

      {/* Pinned sub-section */}
      {activeSubSection === 'pinned' && (
        <div className="pinned-section">
          <p className="section-intro" style={{ marginBottom: '1rem' }}>
            Insights pinned from your Prep Coach conversations. These are also included in DM guidance.
          </p>

          {prepData?.pinned?.length > 0 ? (
            <div className="notes-list">
              {prepData.pinned.map(pin => (
                <div key={pin.id} className="note-card pinned">
                  <div className="note-header">
                    <span className={`note-category cat-${pin.category}`}>
                      {NOTE_CATEGORIES.find(c => c.value === pin.category)?.label || pin.category}
                    </span>
                    {pin.related_to && (
                      <span className="note-related">re: {pin.related_to}</span>
                    )}
                    <div className="note-actions">
                      <button className="remove-btn" onClick={() => handleDeletePin(pin.id)}>Unpin</button>
                    </div>
                  </div>
                  <div className="note-content">{pin.content}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-center" style={{ padding: '2rem' }}>
              No pinned insights yet. Chat with the Prep Coach and pin useful guidance.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default DMPrepSection
