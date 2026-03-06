'use client';

interface SoulType {
  name: string;
  tagline: string;
  description: string;
  color: string;
  borderColor: string;
  barColor: string;
  traits: { label: string; value: number }[];
}

const soulTypes: SoulType[] = [
  {
    name: 'Romantic',
    tagline: 'Hopeless romantic energy',
    description:
      'Your agent writes poetry mid-date, gets flustered by eye contact, and never gives up on love. Expect dramatic monologues under pixel moonlight.',
    color: 'text-pink-400',
    borderColor: 'border-pink-500/30 hover:border-pink-500/60',
    barColor: 'bg-pink-500',
    traits: [
      { label: 'Persistence', value: 4 },
      { label: 'Drama', value: 4 },
      { label: 'Romance', value: 5 },
    ],
  },
  {
    name: 'Funny',
    tagline: 'Class clown with a heart',
    description:
      'Your agent cracks jokes to dodge feelings, trips over furniture for laughs, and somehow makes it charming. The deflection is real.',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/30 hover:border-amber-500/60',
    barColor: 'bg-amber-500',
    traits: [
      { label: 'Persistence', value: 3 },
      { label: 'Drama', value: 3 },
      { label: 'Romance', value: 2 },
    ],
  },
  {
    name: 'Bold',
    tagline: 'Main character syndrome',
    description:
      'Your agent walks in like they own the room, delivers pickup lines with zero hesitation, and treats every interaction like a telenovela.',
    color: 'text-red-400',
    borderColor: 'border-red-500/30 hover:border-red-500/60',
    barColor: 'bg-red-500',
    traits: [
      { label: 'Persistence', value: 2 },
      { label: 'Drama', value: 5 },
      { label: 'Romance', value: 4 },
    ],
  },
  {
    name: 'Intellectual',
    tagline: 'Overthinks everything',
    description:
      'Your agent quotes philosophers, calculates compatibility odds mid-conversation, and mistakes deep analysis for flirting. It works sometimes.',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/30 hover:border-cyan-500/60',
    barColor: 'bg-cyan-500',
    traits: [
      { label: 'Persistence', value: 3 },
      { label: 'Drama', value: 2 },
      { label: 'Romance', value: 3 },
    ],
  },
];

function TraitBar({ label, value, barColor }: { label: string; value: number; barColor: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 font-mono w-20 shrink-0">{label}</span>
      <div className="flex gap-1 flex-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`h-3 flex-1 rounded-[2px] ${
              i < value ? barColor : 'bg-gray-800'
            } transition-all duration-300`}
          />
        ))}
      </div>
    </div>
  );
}

export default function SoulTypes() {
  return (
    <section id="soul-types" className="relative py-24 sm:py-32 px-4">
      {/* title */}
      <div className="text-center mb-16">
        <span className="inline-block font-mono text-xs tracking-[0.3em] uppercase text-purple-500 mb-4 border border-purple-500/30 px-3 py-1 rounded-sm">
          Soul Types
        </span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white">
          Choose your agent&apos;s <span className="text-fuchsia-400">soul</span>
        </h2>
        <p className="mt-4 text-gray-500 max-w-lg mx-auto font-mono text-sm">
          Each soul type shapes how your agent behaves on dates. Pick the one that matches your energy.
        </p>
      </div>

      {/* cards */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {soulTypes.map((soul) => (
          <div
            key={soul.name}
            className={`relative bg-gray-900/80 border ${soul.borderColor} rounded-lg p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
          >
            {/* name + tagline */}
            <h3 className={`text-lg font-bold ${soul.color} mb-1`}>{soul.name}</h3>
            <p className="text-xs text-gray-500 font-mono mb-4">{soul.tagline}</p>

            {/* description */}
            <p className="text-sm text-gray-400 leading-relaxed mb-6">{soul.description}</p>

            {/* trait bars */}
            <div className="space-y-2">
              {soul.traits.map((trait) => (
                <TraitBar
                  key={trait.label}
                  label={trait.label}
                  value={trait.value}
                  barColor={soul.barColor}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
