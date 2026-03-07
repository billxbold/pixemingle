'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { FlirtScenario, FlirtStep, AgentAppearance } from '@/types/database';

interface TheaterReplayProps {
  scenario: FlirtScenario;
  chaserName: string;
  gatekeeperName: string;
  chaserAppearance: AgentAppearance | null;
  gatekeeperAppearance: AgentAppearance | null;
  chaserPhoto: string | null;
  gatekeeperPhoto: string | null;
  chaserGender?: 'male' | 'female' | 'nonbinary';
  gatekeeperGender?: 'male' | 'female' | 'nonbinary';
}

const ACTION_LABELS: Record<string, string> = {
  idle: 'standing still',
  nervous_walk: 'walks over nervously',
  confident_walk: 'struts in confidently',
  walk_away: 'walks away',
  pickup_line: 'delivers a pickup line',
  eye_roll: 'rolls their eyes',
  phone_check: 'checks their phone',
  blush: 'blushes',
  sad_slump: 'slumps sadly',
  angry_kick: 'kicks the ground angrily',
  rejected_shock: 'looks shocked at the rejection',
  flower_offer: 'offers a flower',
  flower_accept: 'accepts the flower',
  flower_throw: 'throws the flower away',
  dramatic_entrance: 'makes a dramatic entrance',
  victory_dance: 'does a victory dance',
  walk_together: 'walks off together',
  thinking: 'is thinking...',
  determined_face: 'puts on a determined face',
  irritated_foot_tap: 'taps foot impatiently',
  put_up_sign: 'puts up a sign',
  call_security: 'calls security',
};

const EMOTION_COLORS: Record<string, string> = {
  neutral: 'text-gray-300',
  happy: 'text-green-400',
  sad: 'text-blue-400',
  angry: 'text-red-400',
  nervous: 'text-yellow-400',
  excited: 'text-pink-400',
  bored: 'text-gray-500',
  irritated: 'text-orange-400',
};

function getAgentLabel(agent: FlirtStep['agent'], chaserName: string, gatekeeperName: string): string {
  if (agent === 'chaser') return chaserName;
  if (agent === 'gatekeeper') return gatekeeperName;
  return `${chaserName} & ${gatekeeperName}`;
}

function getAgentColor(agent: FlirtStep['agent']): string {
  if (agent === 'chaser') return 'text-pink-400';
  if (agent === 'gatekeeper') return 'text-purple-400';
  return 'text-amber-400';
}

export function TheaterReplay({
  scenario,
  chaserName,
  gatekeeperName,
  chaserPhoto,
  gatekeeperPhoto,
  chaserGender = 'male',
  gatekeeperGender = 'female',
}: TheaterReplayProps) {
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepsContainerRef = useRef<HTMLDivElement>(null);

  const steps = useMemo(() => scenario.steps ?? [], [scenario.steps]);

  const advanceStep = useCallback(() => {
    setCurrentStep((prev) => {
      const next = prev + 1;
      if (next >= steps.length) {
        setIsPlaying(false);
        setIsFinished(true);
        return prev;
      }
      return next;
    });
  }, [steps.length]);

  // Schedule next step when currentStep changes and we're playing
  useEffect(() => {
    if (!isPlaying || currentStep < 0 || currentStep >= steps.length) return;

    const step = steps[currentStep];
    const delay = step.duration_ms ?? 2000;

    timerRef.current = setTimeout(() => {
      advanceStep();
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentStep, isPlaying, steps, advanceStep]);

  // Auto-scroll to latest step
  useEffect(() => {
    if (stepsContainerRef.current) {
      stepsContainerRef.current.scrollTop = stepsContainerRef.current.scrollHeight;
    }
  }, [currentStep]);

  const handlePlay = () => {
    if (isFinished) {
      // Replay
      setCurrentStep(-1);
      setIsFinished(false);
    }
    setIsPlaying(true);
    // Kick off first step
    setCurrentStep(0);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(
      `Watch my pixel agents flirt on Pixemingle! ${window.location.href}`
    );
    window.open(`https://x.com/intent/tweet?text=${text}`, '_blank');
  };

  const resultText = scenario.result === 'accepted'
    ? 'They matched!'
    : scenario.result === 'rejected'
    ? 'They didn\'t match this time...'
    : 'Result pending...';

  const resultColor = scenario.result === 'accepted'
    ? 'text-green-400'
    : scenario.result === 'rejected'
    ? 'text-red-400'
    : 'text-yellow-400';

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center relative overflow-hidden">
      {/* Pixel-art background pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            'linear-gradient(45deg, #ec4899 25%, transparent 25%), linear-gradient(-45deg, #ec4899 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ec4899 75%), linear-gradient(-45deg, transparent 75%, #ec4899 75%)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        }}
      />

      {/* Header */}
      <header className="relative z-10 w-full max-w-2xl mx-auto pt-8 pb-4 px-4">
        <h1 className="text-center font-mono text-2xl text-pink-400 tracking-widest">
          PIXEMINGLE THEATER
        </h1>
        <p className="text-center text-gray-500 font-mono text-xs mt-1">
          A pixel love story
        </p>
      </header>

      {/* Character cards */}
      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 flex justify-center gap-8 mb-6">
        {/* Chaser card */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-pink-500/40 bg-gray-900">
            {chaserPhoto ? (
              <img
                src={chaserPhoto}
                alt={chaserName}
                className="w-full h-full object-cover blur-lg saturate-50"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-mono text-pink-400">
                ?
              </div>
            )}
          </div>
          <span className="font-mono text-sm text-pink-400">{chaserName}</span>
          <span className="font-mono text-xs text-gray-500 uppercase">chaser ({chaserGender})</span>
        </div>

        {/* VS */}
        <div className="flex items-center">
          <span className="font-mono text-lg text-gray-600">vs</span>
        </div>

        {/* Gatekeeper card */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-purple-500/40 bg-gray-900">
            {gatekeeperPhoto ? (
              <img
                src={gatekeeperPhoto}
                alt={gatekeeperName}
                className="w-full h-full object-cover blur-lg saturate-50"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-mono text-purple-400">
                ?
              </div>
            )}
          </div>
          <span className="font-mono text-sm text-purple-400">{gatekeeperName}</span>
          <span className="font-mono text-xs text-gray-500 uppercase">gatekeeper ({gatekeeperGender})</span>
        </div>
      </div>

      {/* Steps display */}
      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 flex-1 flex flex-col">
        <div
          ref={stepsContainerRef}
          className="bg-gray-900/80 border border-gray-800 rounded-xl p-6 min-h-[300px] max-h-[400px] overflow-y-auto space-y-4 scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-700"
        >
          {currentStep < 0 && !isFinished && (
            <div className="flex items-center justify-center h-full min-h-[260px]">
              <p className="text-gray-600 font-mono text-sm animate-pulse">
                Press play to watch the scene unfold...
              </p>
            </div>
          )}

          {steps.slice(0, currentStep + 1).map((step, idx) => {
            const label = getAgentLabel(step.agent, chaserName, gatekeeperName);
            const labelColor = getAgentColor(step.agent);
            const emotionColor = step.emotion ? EMOTION_COLORS[step.emotion] ?? 'text-gray-300' : '';
            const actionLabel = ACTION_LABELS[step.action] ?? step.action;

            return (
              <div
                key={idx}
                className={`transition-opacity duration-500 ${
                  idx === currentStep ? 'opacity-100' : 'opacity-70'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Step number */}
                  <span className="font-mono text-xs text-gray-600 mt-1 w-6 text-right flex-shrink-0">
                    {idx + 1}.
                  </span>

                  <div className="flex-1">
                    {/* Agent name + action */}
                    <p className="font-mono text-sm">
                      <span className={`font-bold ${labelColor}`}>{label}</span>
                      <span className="text-gray-500"> {actionLabel}</span>
                      {step.emotion && step.emotion !== 'neutral' && (
                        <span className={`ml-2 text-xs ${emotionColor}`}>
                          [{step.emotion}]
                        </span>
                      )}
                    </p>

                    {/* Speech text */}
                    {step.text && (
                      <p className="mt-1 font-mono text-sm text-gray-200 italic pl-3 border-l-2 border-gray-700">
                        &ldquo;{step.text}&rdquo;
                      </p>
                    )}

                    {/* Props */}
                    {step.props && step.props.length > 0 && (
                      <p className="mt-1 font-mono text-xs text-gray-500">
                        props: {step.props.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Result */}
          {isFinished && (
            <div className="pt-4 border-t border-gray-700 text-center">
              <p className={`font-mono text-lg font-bold ${resultColor}`}>
                {resultText}
              </p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {steps.length > 0 && currentStep >= 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-pink-500 transition-all duration-300"
                style={{
                  width: `${((Math.min(currentStep + 1, steps.length)) / steps.length) * 100}%`,
                }}
              />
            </div>
            <span className="font-mono text-xs text-gray-500">
              {Math.min(currentStep + 1, steps.length)}/{steps.length}
            </span>
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-center gap-4 mt-6">
          {(!isPlaying || isFinished) && (
            <button
              onClick={handlePlay}
              className="px-6 py-3 bg-pink-600 hover:bg-pink-500 text-white font-mono rounded-lg transition-colors shadow-lg shadow-pink-500/20"
            >
              {isFinished ? 'Replay' : 'Play'}
            </button>
          )}

          {isPlaying && !isFinished && (
            <div className="px-6 py-3 bg-gray-800 border border-pink-500/30 rounded-lg">
              <span className="font-mono text-sm text-pink-300 animate-pulse">
                Playing...
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Share + CTA section */}
      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 py-8 space-y-4">
        {/* Share buttons */}
        <div className="flex justify-center gap-3">
          <button
            onClick={handleCopyLink}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-mono text-sm rounded-lg border border-gray-700 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={handleShareTwitter}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-mono text-sm rounded-lg border border-gray-700 transition-colors"
          >
            Share on X
          </button>
        </div>

        {/* CTA */}
        <div className="text-center">
          <a
            href="/"
            className="inline-block px-8 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-mono rounded-lg transition-all shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30"
          >
            Create your own agent
          </a>
        </div>
      </div>

      {/* Watermark */}
      <div className="fixed bottom-4 right-4 z-50">
        <span className="font-mono text-xs text-gray-700 select-none">
          pixemingle.com
        </span>
      </div>
    </div>
  );
}
