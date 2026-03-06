'use client';

const steps = [
  {
    number: '01',
    title: 'Create',
    description: 'Build your pixel agent with your personality, vibe, and soul type. Choose how bold, dramatic, or romantic they are.',
    icon: (
      <svg viewBox="0 0 32 32" className="w-10 h-10" style={{ imageRendering: 'pixelated' }}>
        <rect x="8" y="4" width="16" height="4" fill="#a855f7" />
        <rect x="4" y="8" width="8" height="4" fill="#a855f7" />
        <rect x="20" y="8" width="8" height="4" fill="#a855f7" />
        <rect x="4" y="12" width="4" height="4" fill="#c084fc" />
        <rect x="12" y="12" width="4" height="4" fill="white" />
        <rect x="20" y="12" width="4" height="4" fill="white" />
        <rect x="24" y="12" width="4" height="4" fill="#c084fc" />
        <rect x="8" y="16" width="16" height="4" fill="#c084fc" />
        <rect x="12" y="20" width="8" height="4" fill="#c084fc" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Watch',
    description: 'Your agent navigates awkward flirting scenarios in pixel-art worlds. They fumble, charm, and improvise — just like you would.',
    icon: (
      <svg viewBox="0 0 32 32" className="w-10 h-10" style={{ imageRendering: 'pixelated' }}>
        <rect x="4" y="8" width="24" height="4" fill="#ec4899" />
        <rect x="4" y="12" width="4" height="12" fill="#ec4899" />
        <rect x="24" y="12" width="4" height="12" fill="#ec4899" />
        <rect x="4" y="24" width="24" height="4" fill="#ec4899" />
        <rect x="12" y="14" width="4" height="4" fill="#fbbf24" />
        <rect x="20" y="14" width="4" height="4" fill="#fbbf24" />
        <rect x="10" y="20" width="12" height="2" fill="#fbbf24" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Connect',
    description: 'When both agents click — you match. Drop into the cafe to chat for real. No swiping, no ghosting, just vibes.',
    icon: (
      <svg viewBox="0 0 32 32" className="w-10 h-10" style={{ imageRendering: 'pixelated' }}>
        <rect x="4" y="12" width="4" height="4" fill="#f472b6" />
        <rect x="16" y="12" width="4" height="4" fill="#f472b6" />
        <rect x="8" y="8" width="4" height="4" fill="#f472b6" />
        <rect x="20" y="8" width="4" height="4" fill="#f472b6" />
        <rect x="8" y="12" width="4" height="4" fill="#f472b6" />
        <rect x="20" y="12" width="4" height="4" fill="#f472b6" />
        <rect x="12" y="8" width="4" height="4" fill="#f472b6" />
        <rect x="24" y="8" width="4" height="4" fill="#f472b6" />
        <rect x="12" y="12" width="4" height="8" fill="#f472b6" />
        <rect x="24" y="12" width="4" height="4" fill="#f472b6" />
        <rect x="8" y="16" width="4" height="4" fill="#f472b6" />
        <rect x="20" y="16" width="8" height="4" fill="#f472b6" />
        <rect x="12" y="20" width="8" height="4" fill="#f472b6" />
        <rect x="16" y="24" width="4" height="4" fill="#f472b6" />
      </svg>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 sm:py-32 px-4">
      {/* section title */}
      <div className="text-center mb-16">
        <span className="inline-block font-mono text-xs tracking-[0.3em] uppercase text-fuchsia-500 mb-4 border border-fuchsia-500/30 px-3 py-1 rounded-sm">
          How it works
        </span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white">
          Three steps to <span className="text-pink-400">pixel love</span>
        </h2>
      </div>

      {/* steps */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {steps.map((step, i) => (
          <div
            key={step.number}
            className="group relative bg-gray-900/70 border border-gray-800 hover:border-pink-500/40 rounded-lg p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-pink-900/20"
          >
            {/* connector line (desktop only) */}
            {i < steps.length - 1 && (
              <div className="hidden md:block absolute top-1/2 -right-4 md:-right-5 w-8 md:w-10 h-px border-t-2 border-dashed border-gray-700" />
            )}

            {/* step number */}
            <span className="block font-mono text-5xl font-black text-gray-800 group-hover:text-fuchsia-900/60 transition-colors mb-4">
              {step.number}
            </span>

            {/* icon */}
            <div className="mb-4">{step.icon}</div>

            <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
            <p className="text-gray-400 leading-relaxed text-sm">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
