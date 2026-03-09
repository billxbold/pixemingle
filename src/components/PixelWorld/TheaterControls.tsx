'use client';

import { useState, useEffect } from 'react';

interface TheaterControlsProps {
  isPlaying: boolean;
  isGenerating: boolean;
  currentStep: number;
  totalSteps: number;
  attemptNumber: number;
  maxAttempts: number;
  scenarioResult: string | null;
  onGenerate: () => void;
  onSubmitResult: (result: 'accepted' | 'rejected') => void;
  rateLimitRemaining?: number;
}

export function TheaterControls({
  isPlaying,
  isGenerating,
  currentStep,
  totalSteps,
  attemptNumber,
  maxAttempts,
  scenarioResult,
  onGenerate,
  onSubmitResult,
  rateLimitRemaining,
}: TheaterControlsProps) {
  const [showResult, setShowResult] = useState(false);

  // Show result panel when scenario completes
  useEffect(() => {
    if (scenarioResult === 'pending' && !isPlaying && totalSteps > 0 && currentStep >= totalSteps - 1) {
      setShowResult(true);
    }
  }, [scenarioResult, isPlaying, totalSteps, currentStep]);

  return (
    <div className="absolute bottom-20 sm:bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-40 w-[90vw] sm:w-auto max-w-md">
      {/* Progress bar */}
      {totalSteps > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400">
            Step {currentStep + 1}/{totalSteps}
          </span>
          <div className="w-32 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-pink-500 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
          <span className="text-xs font-mono text-gray-400">
            Attempt {attemptNumber}/{maxAttempts}
          </span>
        </div>
      )}

      {/* Playing indicator */}
      {isPlaying && (
        <div className="bg-gray-900/80 border border-pink-500/30 rounded-lg px-4 py-2">
          <span className="text-sm font-mono text-pink-300 animate-pulse">
            Watching the magic happen...
          </span>
        </div>
      )}

      {/* Generating indicator */}
      {isGenerating && (
        <div className="bg-gray-900/80 border border-purple-500/30 rounded-lg px-4 py-2">
          <span className="text-sm font-mono text-purple-300 animate-pulse">
            Your agent is planning their move...
          </span>
        </div>
      )}

      {/* Result panel — between attempts */}
      {showResult && !isPlaying && !isGenerating && (
        <div className="bg-gray-900/90 border border-gray-700 rounded-lg px-6 py-4 text-center space-y-3 max-w-sm">
          <p className="text-sm font-mono text-gray-300">
            {attemptNumber < maxAttempts
              ? 'Your agent is regrouping... Try again?'
              : 'Last attempt! Make it count!'}
          </p>

          <div className="flex gap-3 justify-center">
            {attemptNumber < maxAttempts && (
              <button
                onClick={() => {
                  setShowResult(false);
                  onGenerate();
                }}
                disabled={rateLimitRemaining === 0}
                className="px-4 py-2 min-h-[44px] bg-pink-600 hover:bg-pink-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-mono rounded transition-colors"
              >
                Yes, send them back!
              </button>
            )}
            <button
              onClick={() => {
                setShowResult(false);
                onSubmitResult('rejected');
              }}
              className="px-4 py-2 min-h-[44px] bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-mono rounded transition-colors"
            >
              {attemptNumber < maxAttempts ? 'No, find someone else' : 'Accept fate'}
            </button>
          </div>

          {/* Accept match (if scenario was good) */}
          <button
            onClick={() => {
              setShowResult(false);
              onSubmitResult('accepted');
            }}
            className="px-4 py-2 min-h-[44px] bg-green-600 hover:bg-green-500 text-white text-sm font-mono rounded transition-colors w-full"
          >
            It&apos;s a match! Move to the cafe
          </button>

          {rateLimitRemaining === 0 && (
            <p className="text-xs text-amber-400 font-mono">
              Rate limit reached. Upgrade for more attempts!
            </p>
          )}
        </div>
      )}

      {/* Initial generate button (no scenario yet) */}
      {!isPlaying && !isGenerating && totalSteps === 0 && (
        <button
          onClick={onGenerate}
          className="px-6 py-3 min-h-[44px] bg-pink-600 hover:bg-pink-500 text-white font-mono rounded-lg transition-colors shadow-lg shadow-pink-500/20"
        >
          Send your agent in!
        </button>
      )}
    </div>
  );
}
