'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';

/**
 * Real-time date proposal sync via Supabase broadcast channel.
 * Handles date proposal/venue response broadcasting.
 */
// Module-scope singleton — avoids infinite re-subscribe loops from
// createClient() producing a new reference on every render.
const supabase = createClient();

export function useDateSync(
  matchId: string | null,
  role: 'chaser' | 'gatekeeper',
  initialProposal?: { dateStatus: 'proposed'; venue: string; inviteText: string } | null,
) {
  const [venueProposal, setVenueProposal] = useState<{ venue: string; text: string } | null>(
    initialProposal ? { venue: initialProposal.venue, text: initialProposal.inviteText } : null,
  );
  const [dateStatus, setDateStatus] = useState<'pending' | 'proposed' | 'accepted' | 'countered' | 'declined'>(
    initialProposal ? 'proposed' : 'pending',
  );
  const [reactionData, setReactionData] = useState<Record<string, string> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Hydrate from recovered proposal (arrives async after page load)
  useEffect(() => {
    if (initialProposal && dateStatus === 'pending') {
      setVenueProposal({ venue: initialProposal.venue, text: initialProposal.inviteText });
      setDateStatus('proposed');
    }
  }, [initialProposal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to match channel for real-time date proposal sync
  useEffect(() => {
    if (!matchId) return;

    const channel = supabase.channel(`match:${matchId}`);

    channel
      .on('broadcast', { event: 'date_proposed' }, ({ payload }) => {
        setVenueProposal(payload as { venue: string; text: string });
        setDateStatus('proposed');
      })
      .on('broadcast', { event: 'venue_accepted' }, ({ payload }) => {
        setDateStatus('accepted');
        setReactionData(payload as Record<string, string>);
      })
      .on('broadcast', { event: 'venue_countered' }, ({ payload }) => {
        setDateStatus('countered');
        setReactionData(payload as Record<string, string>);
      })
      .on('broadcast', { event: 'date_declined' }, ({ payload }) => {
        setDateStatus('declined');
        setReactionData(payload as Record<string, string>);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [matchId, role]);

  // Handle match expiry / status changes
  useEffect(() => {
    if (!matchId) return;
    const channel = supabase
      .channel(`match-status:${matchId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'matches',
        filter: `id=eq.${matchId}`,
      }, (payload) => {
        const newStatus = (payload.new as Record<string, unknown>).status;
        if (newStatus === 'expired' || newStatus === 'unmatched') {
          setDateStatus('declined');
        }
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [matchId]);

  const broadcastDateProposal = useCallback((venue: string, text: string) => {
    setVenueProposal({ venue, text });
    setDateStatus('proposed');
    channelRef.current?.send({
      type: 'broadcast', event: 'date_proposed', payload: { venue, text },
    });
  }, []);

  const broadcastVenueResponse = useCallback((event: string, payload: Record<string, unknown>) => {
    if (event === 'venue_accepted') {
      setDateStatus('accepted');
      setReactionData(payload as Record<string, string>);
    } else if (event === 'venue_countered') {
      setDateStatus('countered');
      setReactionData(payload as Record<string, string>);
    } else if (event === 'date_declined') {
      setDateStatus('declined');
      setReactionData(payload as Record<string, string>);
    }
    channelRef.current?.send({ type: 'broadcast', event, payload });
  }, []);

  return {
    venueProposal,
    dateStatus,
    reactionData,
    broadcastDateProposal,
    broadcastVenueResponse,
  };
}
