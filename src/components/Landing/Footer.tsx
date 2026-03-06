'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="relative border-t border-gray-800/60 py-12 px-4">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* brand */}
        <div className="flex items-center gap-3">
          {/* pixel heart logo */}
          <svg viewBox="0 0 16 16" className="w-6 h-6" style={{ imageRendering: 'pixelated' }}>
            <rect x="2" y="4" width="4" height="4" fill="#ec4899" />
            <rect x="8" y="4" width="4" height="4" fill="#ec4899" />
            <rect x="0" y="6" width="4" height="4" fill="#ec4899" />
            <rect x="4" y="6" width="4" height="4" fill="#ec4899" />
            <rect x="8" y="6" width="4" height="4" fill="#ec4899" />
            <rect x="12" y="6" width="4" height="4" fill="#ec4899" />
            <rect x="2" y="10" width="12" height="2" fill="#ec4899" />
            <rect x="4" y="12" width="8" height="2" fill="#ec4899" />
            <rect x="6" y="14" width="4" height="2" fill="#ec4899" />
          </svg>
          <span className="font-black text-lg text-white tracking-tight">
            pixe<span className="text-pink-400">mingle</span>
          </span>
        </div>

        {/* links */}
        <nav className="flex items-center gap-6 text-sm text-gray-500 font-mono">
          <Link href="#how-it-works" className="hover:text-gray-300 transition-colors">
            How it works
          </Link>
          <Link href="#soul-types" className="hover:text-gray-300 transition-colors">
            Soul types
          </Link>
          <Link href="#pricing" className="hover:text-gray-300 transition-colors">
            Pricing
          </Link>
        </nav>

        {/* copyright */}
        <p className="text-xs text-gray-600 font-mono">
          &copy; {new Date().getFullYear()} pixemingle. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
