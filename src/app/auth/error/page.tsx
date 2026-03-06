import Link from 'next/link'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-4xl font-mono text-pink-400">Auth Error</h1>
        <p className="text-gray-400">
          Something went wrong during sign-in. This could happen if the link
          expired or the session was already used.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-pink-600 hover:bg-pink-500 text-white font-mono rounded-lg transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
