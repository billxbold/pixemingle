'use client'

import { useState } from 'react'
import { DateProposalCard } from '@/components/DateProposal/DateProposalCard'
import { DateInvitationCard } from '@/components/DateProposal/DateInvitationCard'
import type { VenueName } from '@/types/database'

type TestView = 'chaser-pending' | 'chaser-proposed' | 'gatekeeper-invited' | 'accepted' | 'countered' | 'declined'

const MOCK_MATCH_ID = 'dev-test-match-001'

export default function DateProposalTestPage() {
  const [view, setView] = useState<TestView>('chaser-pending')
  const [log, setLog] = useState<string[]>([])
  const [lastProposedVenue, setLastProposedVenue] = useState<VenueName>('lounge')

  const addLog = (msg: string) => setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev])

  const mockPropose = async (_matchId: string, venue: VenueName): Promise<{ text: string; venue: string }> => {
    addLog(`CHASER: Proposed venue "${venue}"`)
    setLastProposedVenue(venue)
    await new Promise(r => setTimeout(r, 800)) // simulate API delay
    const mockText = `Hey! I'd love to take you to the ${venue} — it's going to be magical. Trust me on this one 💫`
    addLog(`API: Generated invite text for ${venue}`)
    setView('chaser-proposed')
    return { text: mockText, venue }
  }

  const mockAccept = () => {
    addLog('GATEKEEPER: Accepted the date!')
    setView('accepted')
  }

  const mockCounter = (venue: VenueName) => {
    addLog(`GATEKEEPER: Countered with "${venue}"`)
    setView('countered')
  }

  const mockDecline = () => {
    addLog('GATEKEEPER: Declined the date')
    setView('declined')
  }

  const views: { key: TestView; label: string }[] = [
    { key: 'chaser-pending', label: 'Chaser: Pick Venue' },
    { key: 'chaser-proposed', label: 'Chaser: Waiting' },
    { key: 'gatekeeper-invited', label: 'Gatekeeper: Invitation' },
    { key: 'accepted', label: 'Result: Accepted' },
    { key: 'countered', label: 'Result: Countered' },
    { key: 'declined', label: 'Result: Declined' },
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-2xl font-bold font-mono mb-2 text-pink-400">Date Proposal — Dev Test</h1>
      <p className="text-gray-500 text-sm font-mono mb-6">Testing DateProposalCard (chaser) and DateInvitationCard (gatekeeper)</p>

      {/* View switcher */}
      <div className="flex flex-wrap gap-2 mb-8">
        {views.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`px-3 py-1.5 rounded text-xs font-mono ${
              view === key ? 'bg-pink-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Component preview */}
        <div>
          <p className="text-xs text-gray-500 font-mono mb-3">PREVIEW</p>
          <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">

            {view === 'chaser-pending' && (
              <DateProposalCard matchId={MOCK_MATCH_ID} onPropose={mockPropose} />
            )}

            {view === 'chaser-proposed' && (
              <div className="p-6 text-center font-mono">
                <div className="text-sm text-pink-300 animate-pulse">Waiting for their response...</div>
                <div className="text-xs text-gray-500 mt-2">Proposed: {lastProposedVenue}</div>
              </div>
            )}

            {view === 'gatekeeper-invited' && (
              <DateInvitationCard
                chaserName="Alex"
                venue={lastProposedVenue}
                inviteText={`Hey! I'd love to take you to the ${lastProposedVenue} — it's going to be magical. Trust me on this one 💫`}
                onAccept={mockAccept}
                onCounter={mockCounter}
                onDecline={mockDecline}
              />
            )}

            {view === 'accepted' && (
              <div className="p-6 text-center font-mono">
                <div className="text-green-400 text-lg mb-2">✓ Date Confirmed!</div>
                <div className="text-gray-400 text-sm">Scene transition to {lastProposedVenue} would play</div>
              </div>
            )}

            {view === 'countered' && (
              <div className="p-6 text-center font-mono">
                <div className="text-amber-400 text-lg mb-2">↺ Counter Proposed</div>
                <div className="text-gray-400 text-sm">Wardrobe reaction sequence would play</div>
              </div>
            )}

            {view === 'declined' && (
              <div className="p-6 text-center font-mono">
                <div className="text-red-400 text-lg mb-2">✕ Date Declined</div>
                <div className="text-gray-400 text-sm">Can kick + sad walkoff sequence would play</div>
              </div>
            )}
          </div>
        </div>

        {/* Event log */}
        <div>
          <p className="text-xs text-gray-500 font-mono mb-3">EVENT LOG</p>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 h-64 overflow-y-auto font-mono text-xs space-y-1">
            {log.length === 0 && (
              <p className="text-gray-600">Interact with the component to see events...</p>
            )}
            {log.map((entry, i) => (
              <div key={i} className="text-green-400">{entry}</div>
            ))}
          </div>
          <button
            onClick={() => setLog([])}
            className="mt-2 text-xs text-gray-600 hover:text-gray-400 font-mono"
          >
            Clear log
          </button>
        </div>
      </div>

      {/* Flow guide */}
      <div className="mt-8 bg-gray-900 border border-gray-700 rounded-xl p-4 font-mono text-xs">
        <p className="text-gray-400 mb-2 font-bold">FLOW GUIDE</p>
        <div className="space-y-1 text-gray-500">
          <p>1. <span className="text-pink-300">Chaser: Pick Venue</span> → select a venue card → click &quot;Propose This Date&quot; → auto-advances to Waiting state</p>
          <p>2. <span className="text-pink-300">Gatekeeper: Invitation</span> → shows invite with 3 options: accept / counter / decline</p>
          <p>3. Counter → shows venue picker (excludes proposed venue) → pick one → countered state</p>
          <p>4. Decline → shows declined state (triggers can kick + sad walkoff in real app)</p>
        </div>
      </div>
    </div>
  )
}
