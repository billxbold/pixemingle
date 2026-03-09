'use client';

import { useState, useCallback, useRef } from 'react';

export interface CoachingMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  action?: string;
  timestamp: Date;
}

export interface UseCoachingReturn {
  messages: CoachingMessage[];
  sendCoaching: (text: string) => Promise<void>;
  isAgentThinking: boolean;
  clearMessages: () => void;
  lastAction: string | null;
}

/**
 * Hook for managing coaching messages during theater.
 * Posts to /api/agent-chat with theater_coaching mode and match context.
 * Client-side rate limit: max 1 message per 3 seconds.
 */
export function useCoaching(matchId: string | null): UseCoachingReturn {
  const [messages, setMessages] = useState<CoachingMessage[]>([]);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const lastSentRef = useRef<number>(0);
  const idCounterRef = useRef(0);

  const generateId = useCallback(() => {
    idCounterRef.current += 1;
    return `coaching-${Date.now()}-${idCounterRef.current}`;
  }, []);

  const sendCoaching = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isAgentThinking) return;

    // Client-side rate limit: 3 seconds between messages
    const now = Date.now();
    if (now - lastSentRef.current < 3000) return;
    lastSentRef.current = now;

    // Add user message
    const userMsg: CoachingMessage = {
      id: generateId(),
      role: 'user',
      text: trimmed,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsAgentThinking(true);

    try {
      const res = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          match_id: matchId,
          context: 'theater_coaching',
        }),
      });

      if (!res.ok) {
        const agentMsg: CoachingMessage = {
          id: generateId(),
          role: 'agent',
          text: 'Hmm, my pixel brain is overloaded right now...',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, agentMsg]);
        setIsAgentThinking(false);
        return;
      }

      const data = await res.json();

      const agentAction = typeof data.action === 'string' ? data.action : undefined;
      const agentMsg: CoachingMessage = {
        id: generateId(),
        role: 'agent',
        text: typeof data.text === 'string' ? data.text : 'Hmm...',
        action: agentAction,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, agentMsg]);
      if (agentAction) setLastAction(agentAction);
    } catch {
      const errorMsg: CoachingMessage = {
        id: generateId(),
        role: 'agent',
        text: 'Oops, my pixel brain glitched...',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsAgentThinking(false);
    }
  }, [matchId, isAgentThinking, generateId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, sendCoaching, isAgentThinking, clearMessages, lastAction };
}
