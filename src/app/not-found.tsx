import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-3xl font-bold mb-2">404 - Page Not Found</h2>
      <p className="text-sm text-slate-400 mb-6">The requested page could not be found.</p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-colors"
      >
        Return to Dashboard
      </Link>
    </div>
  )
}
