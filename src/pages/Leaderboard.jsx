import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useUser } from '../context/UserContext'
import { GAMES } from '../lib/constants'

const TODAY = new Date().toISOString().slice(0, 10)

function Medal({ rank }) {
  if (rank === 1) return <span className="text-base">🥇</span>
  if (rank === 2) return <span className="text-base">🥈</span>
  if (rank === 3) return <span className="text-base">🥉</span>
  return <span className="text-sm text-zinc-500 w-5 text-center">{rank}</span>
}

function LeaderboardTable({ rows, userId }) {
  return (
    <div className="space-y-1">
      {rows.map((row, i) => (
        <div
          key={row.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
            row.id === userId ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-zinc-900'
          }`}
        >
          <div className="w-6 flex justify-center">
            <Medal rank={i + 1} />
          </div>
          <span className={`flex-1 text-sm font-medium ${row.id === userId ? 'text-emerald-400' : 'text-zinc-200'}`}>
            {row.name}
          </span>
          <span className="text-sm font-mono text-zinc-300">{row.displayScore}</span>
          <span className="text-xs text-zinc-600 w-16 text-right">{row.subtitle}</span>
        </div>
      ))}
    </div>
  )
}

export default function Leaderboard() {
  const { user } = useUser()
  const [period, setPeriod] = useState('today') // 'today' | 'alltime'
  const [gameFilter, setGameFilter] = useState('all')
  const [scores, setScores] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: playersData }, { data: scoresData }] = await Promise.all([
        supabase.from('players').select('id, name'),
        period === 'today'
          ? supabase.from('scores').select('*').eq('date', TODAY)
          : supabase.from('scores').select('*'),
      ])
      setPlayers(playersData || [])
      setScores(scoresData || [])
      setLoading(false)
    }
    load()
  }, [period])

  const filteredScores = gameFilter === 'all'
    ? scores
    : scores.filter(s => s.game_key === gameFilter)

  const computeRows = () => {
    return players.map(p => {
      const playerScores = filteredScores.filter(s => s.player_id === p.id)
      const played = playerScores.length
      const solved = playerScores.filter(s => s.solved).length
      const totalGuesses = playerScores.filter(s => s.solved).reduce((acc, s) => acc + s.score, 0)
      const avg = solved > 0 ? (totalGuesses / solved).toFixed(2) : null

      return {
        ...p,
        played,
        solved,
        avg,
        displayScore: avg !== null ? avg : played === 0 ? '—' : 'X',
        subtitle: played > 0 ? `${solved}/${played} solved` : 'no scores',
        sortKey: avg !== null ? parseFloat(avg) : 999,
      }
    })
    .filter(r => r.played > 0)
    .sort((a, b) => a.sortKey - b.sortKey)
  }

  const rows = computeRows()

  return (
    <div className="space-y-5 pt-2">
      <div className="flex gap-2">
        {['today', 'alltime'].map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              period === p ? 'bg-emerald-500 text-black' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {p === 'today' ? 'Today' : 'All Time'}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setGameFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            gameFilter === 'all' ? 'bg-zinc-200 text-zinc-900' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          All games
        </button>
        {GAMES.map(g => (
          <button
            key={g.key}
            onClick={() => setGameFilter(g.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              gameFilter === g.key ? 'bg-zinc-200 text-zinc-900' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {g.emoji} {g.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-zinc-600 py-8">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-zinc-600 py-8">No scores yet</div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">
            {period === 'today' ? "Today's" : 'All-time'} avg guesses (solved only)
          </p>
          <LeaderboardTable rows={rows} userId={user.id} />
        </div>
      )}
    </div>
  )
}
