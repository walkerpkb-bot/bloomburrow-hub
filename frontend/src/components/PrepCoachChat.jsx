import React, { useState, useRef, useEffect } from 'react'

const API_BASE = '/api'

function PrepCoachChat({ campaignId, conversation = [], onConversationUpdate, onPinInsight }) {
  const [messages, setMessages] = useState(conversation)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPinDialog, setShowPinDialog] = useState(null)
  const [pinCategory, setPinCategory] = useState('general')
  const messagesEndRef = useRef(null)

  // Sync messages with conversation prop
  useEffect(() => {
    setMessages(conversation)
  }, [conversation])

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    const newMessages = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/campaigns/${campaignId}/dm-prep/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      })

      const data = await res.json()

      if (data.response) {
        const updatedMessages = [...newMessages, { role: 'assistant', content: data.response }]
        setMessages(updatedMessages)
        onConversationUpdate?.(updatedMessages)
      }
    } catch (err) {
      console.error('Failed to send message:', err)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '*The Prep Coach connection faltered. Please try again.*'
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearConversation = async () => {
    if (!confirm('Clear the conversation history? This cannot be undone.')) return

    try {
      const res = await fetch(`${API_BASE}/campaigns/${campaignId}/dm-prep/conversation`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setMessages([])
        onConversationUpdate?.([])
      }
    } catch (err) {
      console.error('Failed to clear conversation:', err)
    }
  }

  const openPinDialog = (messageContent) => {
    setShowPinDialog(messageContent)
    setPinCategory('general')
  }

  const confirmPin = () => {
    if (showPinDialog) {
      onPinInsight?.(showPinDialog, pinCategory)
      setShowPinDialog(null)
    }
  }

  // Extract potential pin-worthy content from assistant messages
  const extractPinSuggestion = (content) => {
    // Look for "Pin this?" pattern
    const pinMatch = content.match(/\*\*Pin this\?\*\*\s*"([^"]+)"/)
    if (pinMatch) {
      return pinMatch[1]
    }
    return null
  }

  // Render markdown-like formatting
  const renderContent = (text) => {
    const parts = []
    let remaining = text
    let key = 0

    while (remaining.length > 0) {
      // Check for **bold**
      const boldMatch = remaining.match(/^\*\*(.+?)\*\*/)
      if (boldMatch) {
        parts.push(<strong key={key++}>{boldMatch[1]}</strong>)
        remaining = remaining.slice(boldMatch[0].length)
        continue
      }

      // Check for *italic*
      const italicMatch = remaining.match(/^\*([^*]+?)\*/)
      if (italicMatch) {
        parts.push(<em key={key++}>{italicMatch[1]}</em>)
        remaining = remaining.slice(italicMatch[0].length)
        continue
      }

      // Check for line breaks
      if (remaining.startsWith('\n')) {
        parts.push(<br key={key++} />)
        remaining = remaining.slice(1)
        continue
      }

      // Find next special character or end
      const nextMark = remaining.search(/\*|\n/)
      if (nextMark === -1) {
        parts.push(remaining)
        break
      } else if (nextMark === 0) {
        parts.push(remaining[0])
        remaining = remaining.slice(1)
      } else {
        parts.push(remaining.slice(0, nextMark))
        remaining = remaining.slice(nextMark)
      }
    }

    return parts
  }

  return (
    <div className="prep-coach-chat">
      <div className="prep-chat-header">
        <span>Prep Coach</span>
        {messages.length > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={clearConversation}>
            Clear Chat
          </button>
        )}
      </div>

      <div className="prep-chat-messages">
        {messages.length === 0 && (
          <div className="prep-chat-intro">
            <p><strong>Welcome to the Prep Coach!</strong></p>
            <p>I can help you prepare guidance for DMs running your campaign. Ask me about:</p>
            <ul>
              <li>How NPCs should speak and behave</li>
              <li>Pacing and tension throughout the campaign</li>
              <li>Secrets to protect and when to reveal them</li>
              <li>Tips for running specific encounters</li>
            </ul>
            <p>Start by telling me what aspect of the campaign you'd like to think through.</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isAssistant = msg.role === 'assistant'
          const pinSuggestion = isAssistant ? extractPinSuggestion(msg.content) : null

          return (
            <div key={i} className={`prep-chat-message ${msg.role}`}>
              <div className="message-content">
                {renderContent(msg.content)}
              </div>
              {isAssistant && (
                <div className="message-actions">
                  {pinSuggestion && (
                    <button
                      className="pin-btn suggested"
                      onClick={() => openPinDialog(pinSuggestion)}
                      title="Pin this suggested insight"
                    >
                      Pin Suggestion
                    </button>
                  )}
                  <button
                    className="pin-btn"
                    onClick={() => openPinDialog(msg.content)}
                    title="Pin custom selection from this message"
                  >
                    Pin Custom...
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {loading && (
          <div className="prep-chat-message assistant" style={{ opacity: 0.6 }}>
            <em>Thinking...</em>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="prep-chat-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about NPCs, pacing, secrets, encounters..."
          disabled={loading}
          rows={2}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>

      {/* Pin Dialog */}
      {showPinDialog && (
        <div className="modal-overlay" onClick={() => setShowPinDialog(null)}>
          <div className="modal-content pin-dialog" onClick={e => e.stopPropagation()}>
            <h3>Pin Insight</h3>
            <div className="form-group">
              <label>Content to pin:</label>
              <textarea
                value={showPinDialog}
                onChange={(e) => setShowPinDialog(e.target.value)}
                rows={4}
              />
            </div>
            <div className="form-group">
              <label>Category:</label>
              <select value={pinCategory} onChange={(e) => setPinCategory(e.target.value)}>
                <option value="general">General</option>
                <option value="voice">NPC Voice</option>
                <option value="pacing">Pacing</option>
                <option value="secret">Secret</option>
                <option value="reminder">Reminder</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowPinDialog(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={confirmPin}>
                Pin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PrepCoachChat
