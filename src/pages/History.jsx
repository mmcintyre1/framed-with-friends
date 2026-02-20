import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useUser } from '../context/UserContext'
import { GAMES } from '../lib/constants'
import ScoreDots from '../components/ScoreDots'

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-zinc-100">{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function History() {
  const { user } = useUser()
  const [gameFilter, setGameFilter] = useState('all')
  const [viewMode, setViewMode] = useState('me') // 'me' | 'all'
  const [scores, setScores] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: playersData }, { data: scoresData }] = await Promise.all([
        supabase.from('players').select('id, name'),
        supabase.from('scores').select('*').order('date', { ascending: false }),
      ])
      setPlayers(playersData || [])
      setScores(scoresData || [])
      setLoading(false)
    }
    load()
  }, [])

  const playerMap = Object.fromEntries((players || []).map(p => [p.id, p.name]))

  const filtered = scores.filter(s => {
    const gameMatch = gameFilter === 'all' || s.game_key === gameFilter
    const playerMatch = viewMode === 'all' || s.player_id === user.id
    return gameMatch && playerMatch
  })

  // Group by date
  const byDate = {}
  filtered.forEach(s => {
    if (!byDate[s.date]) byDate[s.date] = []
    byDate[s.date].push(s)
  })
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  // Stats
  const myScores = scores.filter(s => s.player_id === user.id &&
    (gameFilter === 'all' || s.game_key === gameFilter))
  const solvedScores = myScores.filter(s => s.solved)
  const avgGuesses = solvedScores.length > 0
    ? (solvedScores.reduce((a, s) => a + s.score, 0) / solvedScores.length).toFixed(2)
    : '—'
  const solveRate = myScores.length > 0
    ? Math.round((solvedScores.length / myScores.length) * 100) + '%'
    : '—'

  return (
    <div className="space-y-5 pt-2">
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Played" value={myScores.length} />
        <StatCard label="Solve rate" value={solveRate} />
        <StatCard label="Avg guesses" value={avgGuesses} sub="solved only" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setGameFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            gameFilter === 'all' ? 'bg-zinc-200 text-zinc-900' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          All
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

      <div className="flex gap-2">
        {['me', 'all'].map(v => (
          <button
            key={v}
            onClick={() => setViewMode(v)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              viewMode === v ? 'bg-emerald-500 text-black' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {v === 'me' ? 'My scores' : 'Everyone'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-zinc-600 py-8">Loading…</div>
      ) : dates.length === 0 ? (
        <div className="text-center text-zinc-600 py-8">No scores yet</div>
      ) : (
        <div className="space-y-4">
          {dates.map(date => {
            const dayScores = byDate[date]
            return (
              <div key={date} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-zinc-800">
                  <p className="text-xs text-zinc-400 font-medium">
                    {new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric'
                    })}
                  </p>
                </div>
                <div className="divide-y divide-zinc-800">
                  {dayScores.map(s => {
                    const game = GAMES.find(g => g.key === s.game_key)
                    return (
                      <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                        {viewMode === 'all' && (
                          <span className={`text-xs font-medium w-20 truncate ${s.player_id === user.id ? 'text-emerald-400' : 'text-zinc-400'}`}>
                            {playerMap[s.player_id] || '?'}
                          </span>
                        )}
                        <span className="text-xs text-zinc-500 w-20">{game?.emoji} {game?.label}</span>
                        <div className="flex-1">
                          <ScoreDots score={s.score} solved={s.solved} />
                        </div>
                        <span className="text-sm font-mono text-zinc-300 w-8 text-right">
                          {s.solved ? `${s.score}/6` : 'X'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
