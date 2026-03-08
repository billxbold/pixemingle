'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChatMessage } from '@/types/database';

export function useChat(matchId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load messages via API + poll for new ones
  useEffect(() => {
    if (!matchId) return;

    setIsLoading(true);

    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/chat/${matchId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages) setMessages(data.messages as ChatMessage[]);
        }
      } catch { /* network error */ }
      setIsLoading(false);
    };

    loadMessages();

    // Poll every 3s for new messages
    pollRef.current = setInterval(loadMessages, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [matchId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!matchId || !content.trim()) return;
      const res = await fetch(`/api/chat/${matchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (res.ok) {
        const { message } = await res.json();
        if (message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) return prev;
            return [...prev, message as ChatMessage];
          });
        }
      }
    },
    [matchId]
  );

  return { messages, sendMessage, isLoading };
}
