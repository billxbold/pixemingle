'use client'

import { useState, useEffect, useRef, type FormEvent } from 'react'
import type { ChatMessage } from '@/types/database'

interface MatchChatPanelProps {
  messages: ChatMessage[]
  currentUserId: string
  partnerName: string
  partnerPhoto?: string
  isLoading: boolean
  onSendMessage: (content: string) => void
  onClose: () => void
  onFindAnother: () => void
}

export function MatchChatPanel({
  messages, currentUserId, partnerName, partnerPhoto,
  isLoading, onSendMessage, onClose, onFindAnother,
}: MatchChatPanelProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    onSendMessage(input)
    setInput('')
  }

  return (
    <div className="absolute z-50 bg-gray-900/95 flex flex-col inset-0 md:inset-auto md:right-0 md:top-0 md:h-full md:w-80 md:border-l md:border-gray-700">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-gray-800">
        {partnerPhoto ? (
          <img src={partnerPhoto} alt={partnerName} className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm">?</div>
        )}
        <span className="font-bold text-blue-300 flex-1">{partnerName}</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-xl" aria-label="Close chat">&times;</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`text-sm font-mono p-2 rounded-lg max-w-[85%] ${
              msg.sender_id === currentUserId
                ? 'bg-blue-600/30 text-blue-200 ml-auto'
                : 'bg-gray-800 text-gray-200'
            }`}
          >
            {msg.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message..."
          aria-label="Chat message"
          className="flex-1 bg-gray-800 text-white text-sm font-mono rounded px-3 py-2 border border-gray-700 focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-blue-500 text-white text-sm px-3 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Send
        </button>
      </form>

      {/* Find another */}
      <button
        onClick={onFindAnother}
        className="m-3 py-2 bg-gray-800 text-gray-400 text-sm font-mono rounded hover:bg-gray-700 hover:text-white transition-colors"
      >
        Find someone else...
      </button>
    </div>
  )
}
