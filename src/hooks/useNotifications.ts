'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import {
  requestPermission,
  registerServiceWorker,
  showNotification,
} from '@/lib/push-notifications';
import type { Notification } from '@/types/database';

/** Map notification types to pixel-art-themed copy */
const NOTIFICATION_COPY: Record<Notification['type'], string> = {
  match_request: 'Your agent just received a love letter!',
  theater_ready: 'Someone let your agent try! Watch the flirting now',
  chat_message: 'Your match sent a message at the pixel cafe',
  match_expired: 'A match timed out... your agent is crying',
  match_result: 'The theater results are in!',
};

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();
  const pushInitialized = useRef(false);

  // Request push permission + register service worker once on mount
  useEffect(() => {
    if (pushInitialized.current) return;
    pushInitialized.current = true;

    requestPermission().then((granted) => {
      if (granted) {
        registerServiceWorker();
      }
    });
  }, []);

  // Load existing unread notifications + subscribe to new ones
  useEffect(() => {
    if (!userId) return;

    // Load unread
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) {
          setNotifications(data as Notification[]);
          setUnreadCount(data.length);
        }
      });

    // Subscribe to new notifications via Realtime
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => {
            if (prev.some((n) => n.id === newNotification.id)) return prev;
            return [newNotification, ...prev];
          });
          setUnreadCount((prev) => prev + 1);

          // Show browser push notification only when tab is hidden
          if (typeof document !== 'undefined' && document.hidden) {
            const body =
              NOTIFICATION_COPY[newNotification.type] ??
              'Something happened in the pixel world!';
            showNotification('Pixemingle', {
              body,
              tag: `pixemingle-${newNotification.id}`,
              data: { url: '/world' },
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId, supabase]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    },
    [supabase]
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [userId, supabase]);

  const latest = notifications[0] ?? null;

  return {
    notifications,
    unreadCount,
    latest,
    markAsRead,
    markAllAsRead,
  };
}
