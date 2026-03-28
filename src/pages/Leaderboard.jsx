import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useUser } from '../context/UserContext'
import { GAMES } from '../lib/constants'
import Avatar from '../components/Avatar'
import { todayET, weekStartET, addDays } from '../lib/dates'

const TODAY = todayET()
const CURRENT_WEEK_START = weekStartET(TODAY)

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatWeekLabel(start) {
  const end = addDays(start, 6)
  const s = new Date(start + 'T12:00:00')
  const e = new Date(end + 'T12:00:00')
  if (s.getMonth() === e.getMonth()) {
    return `${MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}`
  }
  return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}`
}

function computeStandings(scores, players, gameFilter) {
  const filtered = gameFilter === 'all' ? scores : scores.filter(s => s.game_key === gameFilter)
  return players
    .map(p => {
      const ps = filtered.filter(s => s.player_id === p.id)
      const played = ps.length
      const solved = ps.filter(s => s.solved).length
      const totalGuesses = ps.reduce((acc, s) => acc + (s.solved ? s.score : 7), 0)
      const avg = played > 0 ? (totalGuesses / played).toFixed(2) : null
      return {
        ...p, played, solved, avg,
        displayScore: played > 0 ? `${solved}/${played}` : '—',
        subtitle: avg !== null ? `avg ${avg}` : '',
      }
    })
    .filter(r => r.played > 0)
    .sort((a, b) => {
      if (b.solved !== a.solved) return b.solved - a.solved
      return (a.avg ? parseFloat(a.avg) : 999) - (b.avg ? parseFloat(b.avg) : 999)
    })
}

function Medal({ rank }) {
  if (rank === 1) return <span className="text-base">🥇</span>
  if (rank === 2) return <span className="text-base">🥈</span>
  if (rank === 3) return <span className="text-base">🥉</span>
  return <span className="text-sm text-zinc-500 w-5 text-center">{rank}</span>
}

function PlayerRow({ row, rank, userId, right, sub }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
      row.id === userId ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-zinc-900'
    }`}>
      <div className="w-6 flex justify-center"><Medal rank={rank} /></div>
      <Avatar avatar={row.avatar} name={row.name} size="xs" />
      <span className={`flex-1 text-sm font-medium ${row.id === userId ? 'text-emerald-400' : 'text-zinc-200'}`}>
        {row.name}
      </span>
      <span className="text-sm font-mono text-zinc-300">{right}</span>
      <span className="text-xs text-zinc-600 w-16 text-right">{sub}</span>
    </div>
  )
}

export default function Leaderboard() {
  const { user } = useUser()
  const [view, setView] = useState('week')
  const [weekOffset, setWeekOffset] = useState(0)
  const [gameFilter, setGameFilter] = useState('all')
  const [scores, setScores] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: playersData }, { data: scoresData }] = await Promise.all([
        supabase.from('players').select('id, name, avatar'),
        supabase.from('scores').select('*'),
      ])
      setPlayers(playersData || [])
      setScores(scoresData || [])
      setLoading(false)
    }
    load()
  }, [])

  const weekStart = addDays(CURRENT_WEEK_START, weekOffset * 7)
  const weekEnd = addDays(weekStart, 6)

  const weekScores = useMemo(
    () => scores.filter(s => s.date >= weekStart && s.date <= weekEnd),
    [scores, weekStart, weekEnd]
  )

  const weekRows = useMemo(
    () => computeStandings(weekScores, players, gameFilter),
    [weekScores, players, gameFilter]
  )

  const winsRows = useMemo(() => {
    const pastWeekStarts = [...new Set(scores.map(s => weekStartET(s.date)))]
      .filter(ws => ws < CURRENT_WEEK_START)
      .sort()

    const winCounts = Object.fromEntries(players.map(p => [p.id, 0]))
    pastWeekStarts.forEach(ws => {
      const we = addDays(ws, 6)
      const wScores = scores.filter(s => s.date >= ws && s.date <= we)
      const standings = computeStandings(wScores, players, 'all')
      if (standings.length > 0) winCounts[standings[0].id]++
    })

    return players
      .map(p => ({ ...p, wins: winCounts[p.id] || 0 }))
      .filter(p => p.wins > 0)
      .sort((a, b) => b.wins - a.wins)
  }, [scores, players])

  const weekLabel = formatWeekLabel(weekStart)
  const weekSublabel = weekOffset === 0 ? 'current week' : weekOffset === -1 ? 'last week' : ''

  return (
    <div className="space-y-5 pt-2">
      <div className="flex gap-2">
        {[['week', 'This Week'], ['wins', 'Weeks Won']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
              view === key ? 'bg-emerald-500 text-black' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-zinc-600 py-8">Loading…</div>
      ) : view === 'week' ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setWeekOffset(o => o - 1)}
              className="px-3 py-2 text-xl text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              ‹
            </button>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-200">{weekLabel}</p>
              {weekSublabel && <p className="text-xs text-zinc-600">{weekSublabel}</p>}
            </div>
            <button
              onClick={() => setWeekOffset(o => o + 1)}
              disabled={weekOffset >= 0}
              className="px-3 py-2 text-xl text-zinc-400 hover:text-zinc-200 disabled:opacity-30 transition-colors"
            >
              ›
            </button>
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

          {weekRows.length === 0 ? (
            <div className="text-center text-zinc-600 py-8">No scores yet this week</div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">
                Puzzles solved · avg as tiebreaker
              </p>
              <div className="space-y-1">
                {weekRows.map((row, i) => (
                  <PlayerRow
                    key={row.id}
                    row={row}
                    rank={i + 1}
                    userId={user.id}
                    right={row.displayScore}
                    sub={row.subtitle}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">
            Weeks won · all time
          </p>
          {winsRows.length === 0 ? (
            <div className="text-center text-zinc-600 py-8">No completed weeks yet</div>
          ) : (
            <div className="space-y-1">
              {winsRows.map((row, i) => (
                <PlayerRow
                  key={row.id}
                  row={row}
                  rank={i + 1}
                  userId={user.id}
                  right={String(row.wins)}
                  sub={row.wins === 1 ? 'week' : 'weeks'}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
