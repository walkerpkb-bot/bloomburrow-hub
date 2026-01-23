import React, { useState, useRef, useEffect } from 'react'

const API_BASE = '/api'

function ChatWindow({ session, onSessionUpdate }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'player', content: userMessage }])
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/dm/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage,
          includeState: true
        })
      })
      
      const data = await res.json()
      
      if (data.response) {
        setMessages(prev => [...prev, { role: 'dm', content: data.response }])
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
            {msg.content}
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
        <button onClick={sendMessage} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  )
}

export default ChatWindow
