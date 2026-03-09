'use client'

import { useState, useRef, useCallback, type FormEvent } from 'react'

interface AgentMessage {
  role: 'user' | 'agent'
  text: string
  timestamp: number
}

interface AgentChatBarProps {
  onAgentResponse: (text: string, action: string | null) => void
  context?: string
  matchId?: string | null
}

export function AgentChatBar({ onAgentResponse, context, matchId }: AgentChatBarProps) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const logRef = useRef<HTMLDivElement>(null)

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || sending) return

    const userMsg = input.trim()
    setInput('')
    setSending(true)

    setMessages(prev => [...prev, { role: 'user', text: userMsg, timestamp: Date.now() }])

    try {
      const res = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, context, ...(matchId ? { match_id: matchId } : {}) }),
      })
      if (!res.ok) {
        setMessages(prev => [...prev, { role: 'agent', text: 'Hmm, something went wrong...', timestamp: Date.now() }])
        return
      }
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'agent', text: data.text ?? 'Hmm...', timestamp: Date.now() }])
      onAgentResponse(data.text ?? 'Hmm...', data.action ?? null)
    } catch {
      setMessages(prev => [...prev, { role: 'agent', text: 'Oops, my pixel brain glitched...', timestamp: Date.now() }])
    } finally {
      setSending(false)
      setTimeout(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' }), 50)
    }
  }, [input, sending, context, matchId, onAgentResponse])

  return (
    <div className="relative z-40 shrink-0">
      {/* Expandable log */}
      {expanded && (
        <div
          ref={logRef}
          className="bg-gray-900/95 border-t border-gray-700 max-h-60 overflow-y-auto px-4 py-2 space-y-2"
        >
          {messages.slice(-20).map((msg, i) => (
            <div key={i} className={`text-sm font-mono ${msg.role === 'user' ? 'text-gray-400' : 'text-pink-300'}`}>
              <span className="opacity-50">{msg.role === 'user' ? 'You' : 'Agent'}:</span> {msg.text}
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-sm text-gray-600 font-mono">No messages yet. Say something to your agent!</div>
          )}
        </div>
      )}

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900/95 border-t border-gray-700 flex items-center gap-2 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-gray-500 hover:text-white text-lg min-w-[32px] min-h-[32px] flex items-center justify-center"
          aria-label={expanded ? 'Collapse chat log' : 'Expand chat log'}
        >
          {expanded ? 'v' : '^'}
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={sending ? 'Agent is thinking...' : 'Talk to your agent...'}
          disabled={sending}
          aria-label="Message your agent"
          className="flex-1 bg-gray-800 text-white text-sm font-mono rounded px-3 py-2 border border-gray-700 focus:border-pink-500 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="bg-pink-500 text-white text-sm font-mono px-4 py-2 rounded hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px]"
        >
          Send
        </button>
      </form>
    </div>
  )
}
