'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

function DevLoginContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Preparing...')

  useEffect(() => {
    const user = searchParams.get('user')
    if (!user) { setStatus('Missing ?user= param'); return }
    if (process.env.NODE_ENV !== 'development') { setStatus('Not available'); return }

    // The API route sets the dev-user-id cookie and redirects to /world.
    // Navigate directly so the browser receives and stores the cookie.
    setStatus(`Logging in as ${user}...`)
    window.location.href = `/api/dev/login?user=${user}`
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-4xl animate-pulse">🕹️</div>
        <p className="text-gray-400 font-mono text-sm">{status}</p>
      </div>
    </div>
  )
}

export default function DevLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-4xl animate-pulse">🕹️</div>
      </div>
    }>
      <DevLoginContent />
    </Suspense>
  )
}
