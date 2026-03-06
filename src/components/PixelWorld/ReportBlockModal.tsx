'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface ReportBlockModalProps {
  targetUserId: string;
  targetName: string;
  isOpen: boolean;
  onClose: () => void;
}

const REPORT_REASONS = [
  { value: 'fake_photos', label: 'Fake photos' },
  { value: 'inappropriate', label: 'Inappropriate' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Other' },
] as const;

type Tab = 'report' | 'block';

export function ReportBlockModal({
  targetUserId,
  targetName,
  isOpen,
  onClose,
}: ReportBlockModalProps) {
  const [tab, setTab] = useState<Tab>('report');
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const backdropRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTab('report');
      setReason('');
      setDetails('');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  // Escape key closes
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // Click outside closes
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  const handleReport = async () => {
    if (!reason) {
      setError('Please select a reason.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reported_id: targetUserId,
          reason,
          details: details.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit report');
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked_id: targetUserId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to block user');
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-label={`Report or block ${targetName}`}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-[90vw] max-w-sm shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h2 className="text-sm font-bold font-mono text-white">
            Report / Block
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => { setTab('report'); setError(''); }}
            className={`flex-1 py-2 text-xs font-mono transition-colors ${
              tab === 'report'
                ? 'text-pink-400 border-b-2 border-pink-500 bg-gray-800/50'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Report
          </button>
          <button
            onClick={() => { setTab('block'); setError(''); }}
            className={`flex-1 py-2 text-xs font-mono transition-colors ${
              tab === 'block'
                ? 'text-red-400 border-b-2 border-red-500 bg-gray-800/50'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Block
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {tab === 'report' ? (
            <>
              <p className="text-xs text-gray-400 font-mono">
                Why are you reporting {targetName}?
              </p>

              <div className="space-y-1.5">
                {REPORT_REASONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setReason(r.value)}
                    className={`w-full text-left px-3 py-2 rounded text-xs font-mono transition-colors ${
                      reason === r.value
                        ? 'bg-pink-500/20 text-pink-300 border border-pink-500/50'
                        : 'bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Additional details (optional)..."
                maxLength={500}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-xs font-mono text-white placeholder:text-gray-500 focus:outline-none focus:border-pink-500 resize-none"
              />

              <button
                onClick={handleReport}
                disabled={loading || !reason}
                className="w-full py-2.5 min-h-[44px] bg-pink-600 hover:bg-pink-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-mono font-bold rounded transition-colors"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </>
          ) : (
            <>
              <div className="text-center py-4 space-y-3">
                <p className="text-sm text-gray-300 font-mono">
                  Block {targetName}?
                </p>
                <p className="text-xs text-gray-500 font-mono">
                  You won&apos;t see each other anymore.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 py-2.5 min-h-[44px] bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-mono rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBlock}
                  disabled={loading}
                  className="flex-1 py-2.5 min-h-[44px] bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-mono font-bold rounded transition-colors"
                >
                  {loading ? 'Blocking...' : 'Block'}
                </button>
              </div>
            </>
          )}

          {error && (
            <p className="text-xs text-red-400 font-mono text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
