'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import type { ChatMessage } from '@/types/database';

export function useChat(matchId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load history + subscribe to new messages
  useEffect(() => {
    if (!matchId) return;

    setIsLoading(true);

    // Load history
    supabase
      .from('chat_messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as ChatMessage[]);
        setIsLoading(false);
      });

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [matchId, supabase]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!matchId || !content.trim()) return;
      await fetch(`/api/chat/${matchId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });
    },
    [matchId]
  );

  return { messages, sendMessage, isLoading, messagesEndRef };
}
