import React, { useState, useRef, useEffect } from 'react'

const API_BASE = '/api'

function ChatWindow({ session, onSessionUpdate, onRefreshSession, campaignId }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false)
  const [speakingIndex, setSpeakingIndex] = useState(null)
  const [illustrate, setIllustrate] = useState(false)
  const messagesEndRef = useRef(null)

  // Simple markdown renderer for italics and bold
  const renderMarkdown = (text) => {
    // Split by markdown patterns, preserving delimiters
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
      const italicMatch = remaining.match(/^\*(.+?)\*/)
      if (italicMatch) {
        parts.push(<em key={key++}>{italicMatch[1]}</em>)
        remaining = remaining.slice(italicMatch[0].length)
        continue
      }

      // Find next markdown or end of string
      const nextMark = remaining.search(/\*/)
      if (nextMark === -1) {
        parts.push(remaining)
        break
      } else if (nextMark === 0) {
        // Lone asterisk, just add it
        parts.push('*')
        remaining = remaining.slice(1)
      } else {
        parts.push(remaining.slice(0, nextMark))
        remaining = remaining.slice(nextMark)
      }
    }

    return parts
  }

  const speakText = (text, index) => {
    // Stop any current speech
    window.speechSynthesis.cancel()

    if (speakingIndex === index) {
      // If clicking the same message, just stop
      setSpeakingIndex(null)
      return
    }

    // Clean up the text - remove markdown-style formatting
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/\[SCENE:[^\]]*\]/g, '') // Remove scene tags
      .trim()

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.rate = 0.95
    utterance.pitch = 1.0

    utterance.onend = () => setSpeakingIndex(null)
    utterance.onerror = () => setSpeakingIndex(null)

    setSpeakingIndex(index)
    window.speechSynthesis.speak(utterance)
  }

  useEffect(() => {
    // Load messages from session log
    if (session?.log) {
      const chatMessages = session.log
        .filter(entry => entry.type === 'chat')
        .map(entry => ({
          role: entry.role,
          content: entry.content
        }))
      setMessages(chatMessages)
    }
  }, [session?.log])

  useEffect(() => {
    // Only auto-scroll after sending a new message, not on initial load
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      setShouldAutoScroll(false)
    }
  }, [messages, shouldAutoScroll])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'player', content: userMessage }])
    setLoading(true)
    setShouldAutoScroll(true)

    try {
      const res = await fetch(`${API_BASE}/campaigns/${campaignId}/dm/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          includeState: true,
          requestIllustration: illustrate
        })
      })
      
      const data = await res.json()

      if (data.response) {
        setMessages(prev => [...prev, { role: 'dm', content: data.response }])
      }

      // If there's an image, refresh session to update ImagePanel
      if (data.image_url && onRefreshSession) {
        onRefreshSession()
      }
    } catch (err) {
      console.error('Failed to send message:', err)
      setMessages(prev => [...prev, { 
        role: 'dm', 
        content: '*(The magical connection falters... please try again)*' 
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

  if (!session?.active) {
    return (
      <div className="card chat-window">
        <div className="card-header brown">Adventure</div>
        <div className="card-body text-center" style={{ padding: '3rem' }}>
          <h3>No Active Adventure</h3>
          <p className="mt-1">Go to the Roster tab to create characters and start a new run!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card chat-window">
      <div className="card-header brown">
        {session.quest} — {session.location}
      </div>
      
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="text-center" style={{ color: '#999', padding: '2rem' }}>
            The adventure awaits... say something to begin!
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            {msg.role === 'dm' ? renderMarkdown(msg.content) : msg.content}
            {msg.role === 'dm' && (
              <button
                className={`speak-btn ${speakingIndex === i ? 'speaking' : ''}`}
                onClick={() => speakText(msg.content, i)}
                title={speakingIndex === i ? 'Stop' : 'Read aloud'}
              >
                {speakingIndex === i ? '◼' : '▶'}
              </button>
            )}
          </div>
        ))}
        
        {loading && (
          <div className="chat-message dm" style={{ opacity: 0.6 }}>
            <em>The DM is weaving a response...</em>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What do you do?"
          disabled={loading}
        />
        <label className="illustrate-toggle" title="Generate an illustration with the response">
          <input
            type="checkbox"
            checked={illustrate}
            onChange={(e) => setIllustrate(e.target.checked)}
          />
          <span>🎨</span>
        </label>
        <button onClick={sendMessage} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  )
}

export default ChatWindow
