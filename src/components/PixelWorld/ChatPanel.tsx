'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import type { ChatMessage } from '@/types/database';
import { ReportBlockModal } from './ReportBlockModal';

interface ChatPanelProps {
  messages: ChatMessage[];
  currentUserId: string;
  partnerId: string;
  partnerName: string;
  isLoading: boolean;
  onSendMessage: (content: string) => void;
  onSpeechBubble?: (text: string) => void;
}

export function ChatPanel({
  messages,
  currentUserId,
  partnerId,
  partnerName,
  isLoading,
  onSendMessage,
  onSpeechBubble,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [expanded, setExpanded] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Trigger speech bubble for new messages from partner
  useEffect(() => {
    if (messages.length === 0) return;
    const latest = messages[messages.length - 1];
    if (latest.sender_id !== currentUserId && onSpeechBubble) {
      onSpeechBubble(latest.content);
    }
  }, [messages, currentUserId, onSpeechBubble]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="fixed md:absolute bottom-0 left-0 right-0 z-30 pb-safe">
      {/* Toggle bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full bg-gray-900/90 border-t border-gray-700 px-4 py-2 sm:py-1.5 flex items-center justify-between min-h-[44px]"
      >
        <span className="text-xs font-mono text-gray-400">
          Pixel Cafe Chat with {partnerName}
        </span>
        <span className="flex items-center gap-2">
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); setShowReportModal(true); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setShowReportModal(true); } }}
            className="text-gray-500 hover:text-red-400 transition-colors"
            aria-label={`Report or block ${partnerName}`}
            title="Report / Block"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 1v14M3 1h8l-2 3.5L11 8H3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className="text-gray-500 text-xs">
            {expanded ? 'v' : '^'}
          </span>
        </span>
      </button>

      {expanded && (
        <div className="bg-gray-900/95 border-t border-gray-800 flex flex-col h-[60vh] sm:h-48">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
            {isLoading && (
              <p className="text-xs text-gray-500 font-mono text-center">
                Loading messages...
              </p>
            )}

            {!isLoading && messages.length === 0 && (
              <p className="text-xs text-gray-500 font-mono text-center py-4">
                Say hello! Your agents broke the ice, now it&apos;s your turn.
              </p>
            )}

            {messages.map((msg) => {
              const isOwn = msg.sender_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] px-2.5 py-1.5 rounded-lg text-xs font-mono ${
                      isOwn
                        ? 'bg-pink-600/80 text-white'
                        : 'bg-gray-700/80 text-gray-200'
                    }`}
                  >
                    <p>{msg.content}</p>
                    <span className="text-[10px] opacity-50 mt-0.5 block">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 px-3 py-2 border-t border-gray-800"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              maxLength={500}
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2.5 sm:py-1.5 text-sm sm:text-xs font-mono text-white placeholder:text-gray-500 focus:outline-none focus:border-pink-500"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-4 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 bg-pink-600 hover:bg-pink-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm sm:text-xs font-mono rounded transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      )}
      <ReportBlockModal
        targetUserId={partnerId}
        targetName={partnerName}
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />
    </div>
  );
}
