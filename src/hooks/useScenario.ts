'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import type { FlirtScenario } from '@/types/database';

export function useScenario(
  matchId: string | null,
  role: 'chaser' | 'gatekeeper'
) {
  const [scenario, setScenario] = useState<FlirtScenario | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [venueProposal, setVenueProposal] = useState<{ venue: string; text: string } | null>(null);
  const [dateStatus, setDateStatus] = useState<'pending' | 'proposed' | 'accepted' | 'countered' | 'declined'>('pending');
  const [reactionData, setReactionData] = useState<Record<string, string> | null>(null);
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Subscribe to match channel for real-time sync
  useEffect(() => {
    if (!matchId) return;

    const channel = supabase.channel(`match:${matchId}`);

    channel
      .on('broadcast', { event: 'scenario_ready' }, ({ payload }) => {
        setScenario(payload.scenario);
      })
      .on('broadcast', { event: 'step' }, ({ payload }) => {
        // Gatekeeper follows chaser's step advancement
        if (role === 'gatekeeper') {
          setCurrentStep(payload.step_index);
        }
      })
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
  }, [matchId, role, supabase]);

  // Chaser broadcasts step advancement
  const advanceStep = useCallback(
    (stepIndex: number) => {
      if (role !== 'chaser' || !channelRef.current) return;
      channelRef.current.send({
        type: 'broadcast',
        event: 'step',
        payload: { step_index: stepIndex },
      });
      setCurrentStep(stepIndex);
    },
    [role]
  );

  const generate = useCallback(async () => {
    if (!matchId) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/scenarios/${matchId}/generate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.error) {
        console.error('Generation error:', data.error);
        return;
      }
      setScenario(data.scenario);

      // Broadcast to gatekeeper
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'scenario_ready',
          payload: { scenario: data.scenario },
        });
      }
    } finally {
      setIsGenerating(false);
    }
  }, [matchId]);

  const submitResult = useCallback(
    async (result: 'accepted' | 'rejected') => {
      if (!matchId) return;
      await fetch(`/api/scenarios/${matchId}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result }),
      });
    },
    [matchId]
  );

  const fetchCached = useCallback(async () => {
    if (!matchId) return;
    const res = await fetch(`/api/scenarios/${matchId}`);
    const data = await res.json();
    if (data.scenario) setScenario(data.scenario);
  }, [matchId]);

  const broadcastDateProposal = useCallback((venue: string, text: string) => {
    channelRef.current?.send({
      type: 'broadcast', event: 'date_proposed', payload: { venue, text },
    });
  }, []);

  const broadcastVenueResponse = useCallback((event: string, payload: Record<string, unknown>) => {
    channelRef.current?.send({ type: 'broadcast', event, payload });
  }, []);

  return {
    scenario,
    currentStep,
    isGenerating,
    generate,
    fetchCached,
    advanceStep,
    submitResult,
    venueProposal,
    dateStatus,
    reactionData,
    broadcastDateProposal,
    broadcastVenueResponse,
  };
}
