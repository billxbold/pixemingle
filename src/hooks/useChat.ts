'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import type { ChatMessage } from '@/types/database';

// Module-scope client to prevent infinite subscribe loops (same pattern as useNotifications, useTheater, useDateSync)
const supabase = createClient();

export function useChat(matchId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!matchId) return;
    try {
      const res = await fetch(`/api/chat/${matchId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages) setMessages(data.messages as ChatMessage[]);
      }
    } catch { /* network error */ }
  }, [matchId]);

  // Initial fetch + realtime subscription for new messages
  useEffect(() => {
    if (!matchId) return;

    setIsLoading(true);
    fetchMessages().finally(() => setIsLoading(false));

    const channel = supabase
      .channel(`chat:${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        setMessages(prev => {
          const newMsg = payload.new as ChatMessage;
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, fetchMessages]);

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
