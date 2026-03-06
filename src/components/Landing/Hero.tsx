'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/* ── tiny pixel character built from divs ── */
function PixelAgent({ color, flip, offsetY }: { color: string; flip?: boolean; offsetY: number }) {
  return (
    <div
      className="relative transition-transform duration-700"
      style={{
        transform: `scaleX(${flip ? -1 : 1}) translateY(${offsetY}px)`,
        imageRendering: 'pixelated',
      }}
    >
      {/* head */}
      <div className="grid grid-cols-6 gap-0 w-[48px]" style={{ imageRendering: 'pixelated' }}>
        {/* hair row */}
        <span className="col-span-6 h-2 bg-gray-900 rounded-t-sm" />
        {/* face row 1 */}
        <span className="h-2 bg-gray-900" />
        <span className={`h-2 ${color}`} />
        <span className={`h-2 ${color}`} />
        <span className={`h-2 ${color}`} />
        <span className={`h-2 ${color}`} />
        <span className="h-2 bg-gray-900" />
        {/* face row 2 – eyes */}
        <span className="h-2 bg-gray-900" />
        <span className="h-2 bg-white" />
        <span className={`h-2 ${color}`} />
        <span className={`h-2 ${color}`} />
        <span className="h-2 bg-white" />
        <span className="h-2 bg-gray-900" />
        {/* face row 3 – mouth */}
        <span className="h-2 bg-gray-900" />
        <span className={`h-2 ${color}`} />
        <span className="h-2 bg-pink-400" />
        <span className="h-2 bg-pink-400" />
        <span className={`h-2 ${color}`} />
        <span className="h-2 bg-gray-900" />
        {/* chin */}
        <span className="h-2 bg-transparent" />
        <span className="h-2 bg-gray-900" />
        <span className="h-2 bg-gray-900" />
        <span className="h-2 bg-gray-900" />
        <span className="h-2 bg-gray-900" />
        <span className="h-2 bg-transparent" />
      </div>
      {/* body */}
      <div className="grid grid-cols-6 gap-0 w-[48px]">
        <span className="h-2 bg-transparent" />
        <span className="col-span-4 h-2 bg-fuchsia-600 rounded-sm" />
        <span className="h-2 bg-transparent" />
        <span className="h-2 bg-fuchsia-600" />
        <span className="col-span-4 h-2 bg-fuchsia-600" />
        <span className="h-2 bg-fuchsia-600" />
        <span className="h-2 bg-transparent" />
        <span className="col-span-4 h-2 bg-fuchsia-600" />
        <span className="h-2 bg-transparent" />
      </div>
      {/* legs */}
      <div className="grid grid-cols-6 gap-0 w-[48px]">
        <span className="h-2 bg-transparent" />
        <span className="h-2 bg-indigo-900" />
        <span className="h-2 bg-transparent" />
        <span className="h-2 bg-transparent" />
        <span className="h-2 bg-indigo-900" />
        <span className="h-2 bg-transparent" />
      </div>
    </div>
  );
}

/* ── floating heart ── */
function FloatingHeart({ delay, left }: { delay: number; left: string }) {
  return (
    <div
      className="absolute text-pink-500 text-xl pointer-events-none animate-float-up"
      style={{ left, animationDelay: `${delay}s` }}
    >
      &hearts;
    </div>
  );
}

export default function Hero() {
  const [bounce, setBounce] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setBounce((b) => (b === 0 ? -4 : 0));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* scanline overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-10 opacity-[0.03]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)',
        }}
      />

      {/* grid background */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(168,85,247,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.4) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* floating hearts */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <FloatingHeart delay={0} left="15%" />
        <FloatingHeart delay={1.5} left="30%" />
        <FloatingHeart delay={3} left="55%" />
        <FloatingHeart delay={4.2} left="72%" />
        <FloatingHeart delay={2.1} left="85%" />
      </div>

      {/* pixel characters scene */}
      <div className="relative flex items-end gap-8 mb-10 z-20">
        <PixelAgent color="bg-amber-300" offsetY={bounce} />
        {/* speech bubble */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 border-2 border-pink-500/60 text-pink-300 text-xs px-3 py-1 rounded font-mono whitespace-nowrap">
          *nervous pixel noises*
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 border-r-2 border-b-2 border-pink-500/60 rotate-45" />
        </div>
        <PixelAgent color="bg-rose-300" flip offsetY={bounce === 0 ? -4 : 0} />
      </div>

      {/* headline */}
      <h1 className="relative z-20 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-center leading-tight tracking-tight max-w-4xl">
        <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
          Watch your AI agent
        </span>
        <br />
        <span className="text-white">
          hilariously try to mingle
        </span>
      </h1>

      {/* subhead */}
      <p className="relative z-20 mt-6 text-base sm:text-lg md:text-xl text-gray-400 text-center max-w-2xl leading-relaxed font-mono">
        Create a pixel agent with your personality. Watch it flirt on your behalf.
        If your agents click, you match.
      </p>

      {/* CTA */}
      <Link
        href="/onboarding"
        className="relative z-20 mt-10 group inline-flex items-center gap-3 bg-gradient-to-r from-pink-600 to-fuchsia-600 hover:from-pink-500 hover:to-fuchsia-500 text-white font-bold text-lg px-8 py-4 rounded-lg border-b-4 border-pink-800 hover:border-pink-700 active:border-b-0 active:mt-[calc(2.5rem+4px)] transition-all duration-150 shadow-lg shadow-pink-900/40"
      >
        <span className="inline-block w-3 h-3 bg-green-400 rounded-sm animate-pulse shadow-sm shadow-green-400/60" />
        Create Your Agent
        <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
      </Link>

      {/* scroll hint */}
      <div className="absolute bottom-8 z-20 flex flex-col items-center gap-2 text-gray-600 text-sm font-mono animate-bounce">
        <span>scroll</span>
        <span>&darr;</span>
      </div>
    </section>
  );
}
