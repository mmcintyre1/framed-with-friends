import { Link, useLocation } from 'react-router-dom'
import { useUser } from '../context/UserContext'

const NAV = [
  { to: '/', label: 'Today' },
  { to: '/history', label: 'History' },
  { to: '/leaderboard', label: 'Leaders' },
]

export default function Layout({ children }) {
  const { user, logout } = useUser()
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto px-4">
      <div className="sticky top-0 z-40 bg-zinc-950 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold tracking-tight text-zinc-100">
            Framed<span className="text-emerald-400"> w/ Friends</span>
          </h1>
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">{user.name}</span>
              <button
                onClick={logout}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                switch
              </button>
            </div>
          )}
        </div>

        <div className="flex border-b border-zinc-800">
          {NAV.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`flex-1 text-center py-2.5 text-sm font-medium transition-colors relative ${
                pathname === to
                  ? 'text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {label}
              {pathname === to && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
              )}
            </Link>
          ))}
        </div>
      </div>

      <main className="flex-1 pt-4 pb-8">
        {children}
      </main>
    </div>
  )
}
