'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Notification } from '@/types/database';

interface NotificationPixelProps {
  notification: Notification | null;
  onDismiss: (id: string) => void;
  onAction?: (notification: Notification) => void;
}

const NOTIFICATION_MESSAGES: Record<string, string> = {
  match_request: "Someone's interested!",
  theater_ready: 'Your match is ready! Time for the theater!',
  chat_message: 'New message at the pixel cafe!',
  match_expired: 'A match has expired...',
  match_result: 'Your agent returned with news!',
};

export function NotificationPixel({
  notification,
  onDismiss,
  onAction,
}: NotificationPixelProps) {
  const [visible, setVisible] = useState(false);
  const [animFrame, setAnimFrame] = useState(0);

  useEffect(() => {
    if (!notification) {
      setVisible(false);
      return;
    }
    setVisible(true);
    setAnimFrame(0);
  }, [notification]);

  // Envelope bobbing animation
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setAnimFrame((f) => (f + 1) % 4);
    }, 300);
    return () => clearInterval(interval);
  }, [visible]);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!notification || !visible) return;
    const timeout = setTimeout(() => {
      setVisible(false);
      onDismiss(notification.id);
    }, 8000);
    return () => clearTimeout(timeout);
  }, [notification, visible, onDismiss]);

  const handleClick = useCallback(() => {
    if (!notification) return;
    if (onAction) onAction(notification);
    setVisible(false);
    onDismiss(notification.id);
  }, [notification, onAction, onDismiss]);

  if (!visible || !notification) return null;

  const message =
    NOTIFICATION_MESSAGES[notification.type] || 'New notification!';
  const bobOffset = [0, -2, -4, -2][animFrame];

  return (
    <div
      className="absolute top-4 right-4 z-50 cursor-pointer select-none"
      style={{ transform: `translateY(${bobOffset}px)` }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      {/* Pixel envelope */}
      <div className="relative">
        <div className="bg-amber-100 border-2 border-amber-800 rounded-sm p-0.5 w-10 h-7 relative">
          {/* Envelope flap */}
          <div
            className="absolute top-0 left-0 w-full h-0 border-l-[18px] border-r-[18px] border-t-[12px] border-l-transparent border-r-transparent border-t-amber-300"
            style={{ borderTopColor: '#fcd34d' }}
          />
          {/* Heart seal */}
          <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full" />
        </div>

        {/* Exclamation badge */}
        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 border border-red-800 rounded-full flex items-center justify-center">
          <span className="text-white text-[8px] font-bold">!</span>
        </div>
      </div>

      {/* Speech bubble */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white border-2 border-gray-800 rounded px-2 py-1 whitespace-nowrap shadow-md">
        <span className="text-xs font-mono text-gray-900">{message}</span>
        {/* Bubble arrow */}
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-l-2 border-t-2 border-gray-800 rotate-45" />
      </div>
    </div>
  );
}
