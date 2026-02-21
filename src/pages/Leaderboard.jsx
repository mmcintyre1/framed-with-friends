import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useUser } from '../context/UserContext'
import { GAMES } from '../lib/constants'
import Avatar from '../components/Avatar'
import { todayET, daysAgoET } from '../lib/dates'

const TODAY = todayET()

function daysAgo(n) {
  return daysAgoET(n)
}

const PERIODS = [
  { key: 'today', label: 'Today', desc: "Today's" },
  { key: '7d',    label: '7 Days', desc: 'Last 7 days' },
  { key: '30d',   label: '30 Days', desc: 'Last 30 days' },
  { key: 'all',   label: 'All Time', desc: 'All-time' },
]

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
          <Avatar avatar={row.avatar} name={row.name} size="xs" />
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
  const [period, setPeriod] = useState('today')
  const [gameFilter, setGameFilter] = useState('all')
  const [scores, setScores] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      let scoresQuery = supabase.from('scores').select('*')
      if (period === 'today') scoresQuery = scoresQuery.eq('date', TODAY)
      else if (period === '7d') scoresQuery = scoresQuery.gte('date', daysAgo(6))
      else if (period === '30d') scoresQuery = scoresQuery.gte('date', daysAgo(29))

      const [{ data: playersData }, { data: scoresData }] = await Promise.all([
        supabase.from('players').select('id, name, avatar'),
        scoresQuery,
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
      // DNF counts as 7 (one worse than max) in the average
      const totalGuesses = playerScores.reduce((acc, s) => acc + (s.solved ? s.score : 7), 0)
      const avg = played > 0 ? (totalGuesses / played).toFixed(2) : null

      return {
        ...p,
        played,
        solved,
        avg,
        displayScore: avg !== null ? avg : '—',
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
      <div className="flex gap-1.5">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
              period === p.key ? 'bg-emerald-500 text-black' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {p.label}
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
            {PERIODS.find(p => p.key === period)?.desc} avg guesses (DNF = 7)
          </p>
          <LeaderboardTable rows={rows} userId={user.id} />
        </div>
      )}
    </div>
  )
}
