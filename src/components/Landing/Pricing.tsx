'use client';

import Link from 'next/link';

interface Tier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlight?: boolean;
  badge?: string;
}

const tiers: Tier[] = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Dip your toes into the pixel dating pool.',
    features: [
      '3 matches per week',
      '1 scenario retry',
      '3 gallery photos',
      'Basic soul types',
      'Standard matching',
    ],
    cta: 'Start Free',
  },
  {
    name: 'Wingman',
    price: '$9.99',
    period: '/mo',
    description: 'Serious about finding your pixel soulmate.',
    features: [
      'Unlimited matches',
      '3 scenario retries',
      '6 gallery photos',
      'All soul types',
      'Priority matching queue',
      'Scenario replays',
    ],
    cta: 'Get Wingman',
    highlight: true,
    badge: 'Popular',
  },
  {
    name: 'Rizz Lord',
    price: '$19.99',
    period: '/mo',
    description: 'Maximum rizz. No compromises.',
    features: [
      'Everything unlimited',
      'Unlimited retries',
      'Unlimited photos',
      'Custom soul tuning',
      'Priority matching',
      'Exclusive scenarios',
      'Early access to features',
    ],
    cta: 'Ascend',
    badge: 'Max Rizz',
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="relative py-24 sm:py-32 px-4">
      {/* title */}
      <div className="text-center mb-16">
        <span className="inline-block font-mono text-xs tracking-[0.3em] uppercase text-green-500 mb-4 border border-green-500/30 px-3 py-1 rounded-sm">
          Pricing
        </span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white">
          Invest in your <span className="text-pink-400">pixel love life</span>
        </h2>
      </div>

      {/* tiers */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`relative flex flex-col bg-gray-900/80 rounded-lg p-8 border transition-all duration-300 hover:-translate-y-1 ${
              tier.highlight
                ? 'border-pink-500/60 shadow-lg shadow-pink-900/30 scale-[1.02] md:scale-105'
                : 'border-gray-800 hover:border-gray-700'
            }`}
          >
            {/* badge */}
            {tier.badge && (
              <span
                className={`absolute -top-3 right-6 text-xs font-bold px-3 py-1 rounded-full ${
                  tier.highlight
                    ? 'bg-pink-600 text-white'
                    : 'bg-gray-800 text-purple-300 border border-purple-500/40'
                }`}
              >
                {tier.badge}
              </span>
            )}

            {/* name */}
            <h3 className="text-lg font-bold text-white mb-1">{tier.name}</h3>
            <p className="text-xs text-gray-500 font-mono mb-6">{tier.description}</p>

            {/* price */}
            <div className="flex items-baseline gap-1 mb-8">
              <span className="text-4xl font-black text-white">{tier.price}</span>
              <span className="text-sm text-gray-500 font-mono">{tier.period}</span>
            </div>

            {/* features */}
            <ul className="space-y-3 mb-8 flex-1">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-green-500 mt-0.5 shrink-0">&check;</span>
                  {feature}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Link
              href="/onboarding"
              className={`block text-center font-bold py-3 px-6 rounded-lg transition-all duration-200 border-b-4 active:border-b-0 ${
                tier.highlight
                  ? 'bg-gradient-to-r from-pink-600 to-fuchsia-600 hover:from-pink-500 hover:to-fuchsia-500 text-white border-pink-800 hover:border-pink-700'
                  : 'bg-gray-800 hover:bg-gray-750 text-gray-200 border-gray-900 hover:border-gray-800'
              }`}
            >
              {tier.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
