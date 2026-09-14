'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="bg-[#090a0f] text-slate-100 flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 text-xl font-bold">
          !
        </div>
        <h2 className="text-xl font-semibold mb-2">Application Error</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">{error?.message || 'Fatal system error.'}</p>
        <button
          onClick={() => reset()}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-colors"
        >
          Reload App
        </button>
      </body>
    </html>
  )
}
