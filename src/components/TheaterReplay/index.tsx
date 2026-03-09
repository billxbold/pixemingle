'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { AgentAppearance, TheaterTurn } from '@/types/database';

interface TheaterReplayProps {
  turns: TheaterTurn[];
  outcome: 'accepted' | 'rejected' | null;
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
  deliver_line: 'delivers a line',
  react: 'reacts',
  use_prop: 'uses a prop',
  physical_comedy: 'does physical comedy',
  environment_interact: 'interacts with the environment',
  signature_move: 'pulls a signature move',
  entrance: 'makes an entrance',
  exit: 'exits the scene',
};

const EMOTION_COLORS: Record<string, string> = {
  neutral: 'text-gray-300',
  nervous: 'text-yellow-400',
  confident: 'text-green-400',
  embarrassed: 'text-red-300',
  excited: 'text-pink-400',
  dejected: 'text-blue-400',
  amused: 'text-green-300',
  annoyed: 'text-orange-400',
  hopeful: 'text-cyan-400',
  devastated: 'text-blue-600',
  smug: 'text-amber-400',
  shy: 'text-pink-300',
  trying_too_hard: 'text-yellow-500',
  genuinely_happy: 'text-green-500',
  cringing: 'text-red-400',
};

function getAgentLabel(role: TheaterTurn['agent_role'], chaserName: string, gatekeeperName: string): string {
  return role === 'chaser' ? chaserName : gatekeeperName;
}

function getAgentColor(role: TheaterTurn['agent_role']): string {
  return role === 'chaser' ? 'text-pink-400' : 'text-purple-400';
}

export function TheaterReplay({
  turns,
  outcome,
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

  const turnList = useMemo(() => turns ?? [], [turns]);

  const advanceStep = useCallback(() => {
    setCurrentStep((prev) => {
      const next = prev + 1;
      if (next >= turnList.length) {
        setIsPlaying(false);
        setIsFinished(true);
        return prev;
      }
      return next;
    });
  }, [turnList.length]);

  useEffect(() => {
    if (!isPlaying || currentStep < 0 || currentStep >= turnList.length) return;

    // Each turn displays for 2 seconds
    const delay = 2000;

    timerRef.current = setTimeout(() => {
      advanceStep();
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentStep, isPlaying, turnList, advanceStep]);

  useEffect(() => {
    if (stepsContainerRef.current) {
      stepsContainerRef.current.scrollTop = stepsContainerRef.current.scrollHeight;
    }
  }, [currentStep]);

  const handlePlay = () => {
    if (isFinished) {
      setCurrentStep(-1);
      setIsFinished(false);
    }
    setIsPlaying(true);
    setCurrentStep(0);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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

  const resultText = outcome === 'accepted'
    ? 'They matched!'
    : outcome === 'rejected'
    ? 'They didn\'t match this time...'
    : 'Result pending...';

  const resultColor = outcome === 'accepted'
    ? 'text-green-400'
    : outcome === 'rejected'
    ? 'text-red-400'
    : 'text-yellow-400';

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            'linear-gradient(45deg, #ec4899 25%, transparent 25%), linear-gradient(-45deg, #ec4899 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ec4899 75%), linear-gradient(-45deg, transparent 75%, #ec4899 75%)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        }}
      />

      <header className="relative z-10 w-full max-w-2xl mx-auto pt-8 pb-4 px-4">
        <h1 className="text-center font-mono text-2xl text-pink-400 tracking-widest">
          PIXEMINGLE THEATER
        </h1>
        <p className="text-center text-gray-500 font-mono text-xs mt-1">
          A pixel love story
        </p>
      </header>

      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 flex justify-center gap-8 mb-6">
        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-pink-500/40 bg-gray-900">
            {chaserPhoto ? (
              <img src={chaserPhoto} alt={chaserName} className="w-full h-full object-cover blur-lg saturate-50" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-mono text-pink-400">?</div>
            )}
          </div>
          <span className="font-mono text-sm text-pink-400">{chaserName}</span>
          <span className="font-mono text-xs text-gray-500 uppercase">chaser ({chaserGender})</span>
        </div>

        <div className="flex items-center">
          <span className="font-mono text-lg text-gray-600">vs</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-purple-500/40 bg-gray-900">
            {gatekeeperPhoto ? (
              <img src={gatekeeperPhoto} alt={gatekeeperName} className="w-full h-full object-cover blur-lg saturate-50" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-mono text-purple-400">?</div>
            )}
          </div>
          <span className="font-mono text-sm text-purple-400">{gatekeeperName}</span>
          <span className="font-mono text-xs text-gray-500 uppercase">gatekeeper ({gatekeeperGender})</span>
        </div>
      </div>

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

          {turnList.slice(0, currentStep + 1).map((turn, idx) => {
            const label = getAgentLabel(turn.agent_role, chaserName, gatekeeperName);
            const labelColor = getAgentColor(turn.agent_role);
            const emotionColor = turn.emotion ? EMOTION_COLORS[turn.emotion] ?? 'text-gray-300' : '';
            const actionLabel = ACTION_LABELS[turn.action] ?? turn.action;

            return (
              <div
                key={turn.id ?? idx}
                className={`transition-opacity duration-500 ${idx === currentStep ? 'opacity-100' : 'opacity-70'}`}
              >
                <div className="flex items-start gap-3">
                  <span className="font-mono text-xs text-gray-600 mt-1 w-6 text-right flex-shrink-0">
                    {turn.turn_number}.
                  </span>
                  <div className="flex-1">
                    <p className="font-mono text-sm">
                      <span className={`font-bold ${labelColor}`}>{label}</span>
                      <span className="text-gray-500"> {actionLabel}</span>
                      {turn.emotion && turn.emotion !== 'neutral' && (
                        <span className={`ml-2 text-xs ${emotionColor}`}>[{turn.emotion}]</span>
                      )}
                    </p>
                    {turn.text && (
                      <p className="mt-1 font-mono text-sm text-gray-200 italic pl-3 border-l-2 border-gray-700">
                        &ldquo;{turn.text}&rdquo;
                      </p>
                    )}
                    {turn.comedy_atoms && turn.comedy_atoms.length > 0 && (
                      <p className="mt-1 font-mono text-xs text-gray-500">atoms: {turn.comedy_atoms.join(', ')}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isFinished && (
            <div className="pt-4 border-t border-gray-700 text-center">
              <p className={`font-mono text-lg font-bold ${resultColor}`}>{resultText}</p>
            </div>
          )}
        </div>

        {turnList.length > 0 && currentStep >= 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-pink-500 transition-all duration-300"
                style={{ width: `${((Math.min(currentStep + 1, turnList.length)) / turnList.length) * 100}%` }}
              />
            </div>
            <span className="font-mono text-xs text-gray-500">
              {Math.min(currentStep + 1, turnList.length)}/{turnList.length}
            </span>
          </div>
        )}

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
              <span className="font-mono text-sm text-pink-300 animate-pulse">Playing...</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 py-8 space-y-4">
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
        <div className="text-center">
          <a
            href="/"
            className="inline-block px-8 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-mono rounded-lg transition-all shadow-lg shadow-pink-500/20 hover:shadow-pink-500/30"
          >
            Create your own agent
          </a>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 z-50">
        <span className="font-mono text-xs text-gray-700 select-none">pixemingle.com</span>
      </div>
    </div>
  );
}
