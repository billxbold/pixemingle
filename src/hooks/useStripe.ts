'use client';

import { useState, useEffect, useCallback } from 'react';

interface OwnedCosmetic {
  item_id: string;
  item_type: string;
  amount_cents: number;
  created_at: string;
}

export function useStripe() {
  const [tier, setTier] = useState<'free' | 'wingman' | 'rizzlord'>('free');
  const [ownedCosmetics, setOwnedCosmetics] = useState<OwnedCosmetic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshTier = useCallback(async () => {
    try {
      const res = await fetch('/api/payments/status');
      if (res.ok) {
        const data = await res.json();
        setTier(data.tier || 'free');
      }
    } catch {
      // silently fail - tier defaults to free
    }
  }, []);

  const refreshOwned = useCallback(async () => {
    try {
      const res = await fetch('/api/cosmetics/owned');
      if (res.ok) {
        const data = await res.json();
        setOwnedCosmetics(data.owned || []);
      }
    } catch {
      // silently fail
    }
  }, []);

  // Initial load
  useEffect(() => {
    setIsLoading(true);
    Promise.all([refreshTier(), refreshOwned()]).finally(() => setIsLoading(false));
  }, [refreshTier, refreshOwned]);

  const checkout = useCallback(async (subTier: 'wingman' | 'rizzlord') => {
    const res = await fetch('/api/payments/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier: subTier,
        return_url: window.location.href,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to create checkout session');
    }

    const { url } = await res.json();
    if (url) {
      window.location.href = url;
    }
  }, []);

  const purchaseCosmetic = useCallback(async (itemId: string) => {
    const res = await fetch('/api/cosmetics/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to create payment');
    }

    const data = await res.json();
    // Refresh owned cosmetics after purchase initiated
    await refreshOwned();
    return data.client_secret as string;
  }, [refreshOwned]);

  return {
    tier,
    ownedCosmetics,
    isLoading,
    checkout,
    purchaseCosmetic,
    refreshTier,
    refreshOwned,
  };
}
