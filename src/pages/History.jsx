import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useUser } from '../context/UserContext'
import { GAMES } from '../lib/constants'
import ScoreDots from '../components/ScoreDots'
import Avatar from '../components/Avatar'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { todayET, daysAgoET, getPuzzleNumber } from '../lib/dates'

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-zinc-900 rounded-2xl p-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-zinc-100">{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  )
}

function computeStreaks(allScores, userId) {
  const myDates = [...new Set(
    allScores.filter(s => s.player_id === userId).map(s => s.date)
  )].sort()

  if (myDates.length === 0) return { current: 0, best: 0 }

  // Best streak
  let best = 1, run = 1
  for (let i = 1; i < myDates.length; i++) {
    const diff = Math.round(
      (new Date(myDates[i] + 'T12:00:00') - new Date(myDates[i - 1] + 'T12:00:00')) / 86400000
    )
    if (diff === 1) { run++; best = Math.max(best, run) }
    else run = 1
  }

  // Current streak (working back from today or yesterday)
  const today = todayET()
  const yesterday = daysAgoET(1)
  const lastDate = myDates[myDates.length - 1]
  if (lastDate !== today && lastDate !== yesterday) return { current: 0, best }

  let current = 1
  for (let i = myDates.length - 2; i >= 0; i--) {
    const diff = Math.round(
      (new Date(myDates[i + 1] + 'T12:00:00') - new Date(myDates[i] + 'T12:00:00')) / 86400000
    )
    if (diff === 1) current++
    else break
  }

  return { current, best }
}

function ScoreDistribution({ scores, userId, gameFilter }) {
  const relevant = scores.filter(s =>
    s.player_id === userId && (gameFilter === 'all' || s.game_key === gameFilter)
  )
  if (relevant.length === 0) return null

  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, X: 0 }
  relevant.forEach(s => {
    if (s.solved) counts[s.score]++
    else counts['X']++
  })

  const max = Math.max(...Object.values(counts), 1)

  return (
    <div className="bg-zinc-900 rounded-2xl p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Score distribution</p>
      <div className="space-y-1.5">
        {['1', '2', '3', '4', '5', '6', 'X'].map(label => {
          const count = counts[label]
          const pct = (count / max) * 100
          return (
            <div key={label} className="flex items-center gap-2">
              <span className="text-xs text-zinc-500 w-4 text-right">{label}</span>
              <div className="flex-1 bg-zinc-800 rounded-full h-5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${label === 'X' ? 'bg-red-600' : 'bg-emerald-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-zinc-400 w-4 text-right">{count || ''}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ScoreChart({ scores, userId, gameFilter }) {
  if (gameFilter === 'all') return null

  const chartData = scores
    .filter(s => s.player_id === userId && s.game_key === gameFilter && s.solved)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(s => ({
      date: new Date(s.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: s.score,
    }))

  if (chartData.length < 2) return null

  return (
    <div className="bg-zinc-900 rounded-2xl p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Score trend</p>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="date"
            tick={{ fill: '#52525b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[1, 6]}
            reversed
            tick={{ fill: '#52525b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={16}
          />
          <Tooltip
            contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#a1a1aa' }}
            itemStyle={{ color: '#34d399' }}
          />
          <ReferenceLine y={3.5} stroke="#3f3f46" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#34d399"
            strokeWidth={2}
            dot={{ fill: '#34d399', r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

const DATES_PER_PAGE = 10

export default function History() {
  const { user } = useUser()
  const [gameFilter, setGameFilter] = useState('all')
  const [viewMode, setViewMode] = useState('me')
  const [scores, setScores] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(DATES_PER_PAGE)

  useEffect(() => {
    async function load() {
      const [{ data: playersData }, { data: scoresData }] = await Promise.all([
        supabase.from('players').select('id, name, avatar'),
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

  const byDate = {}
  filtered.forEach(s => {
    if (!byDate[s.date]) byDate[s.date] = []
    byDate[s.date].push(s)
  })
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))
  const visibleDates = dates.slice(0, visibleCount)
  const hasMore = dates.length > visibleCount

  // Reset pagination when filters change
  useEffect(() => { setVisibleCount(DATES_PER_PAGE) }, [gameFilter, viewMode])

  // Stats (always based on my scores)
  const myScores = scores.filter(s => s.player_id === user.id &&
    (gameFilter === 'all' || s.game_key === gameFilter))
  const solvedScores = myScores.filter(s => s.solved)
  const avgGuesses = solvedScores.length > 0
    ? (solvedScores.reduce((a, s) => a + s.score, 0) / solvedScores.length).toFixed(2)
    : '—'
  const solveRate = myScores.length > 0
    ? Math.round((solvedScores.length / myScores.length) * 100) + '%'
    : '—'
  const { current: currentStreak, best: bestStreak } = computeStreaks(scores, user.id)

  return (
    <div className="space-y-5 pt-2">
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Played" value={myScores.length} />
        <StatCard label="Solve rate" value={solveRate} />
        <StatCard label="Avg guesses" value={avgGuesses} sub="solved only" />
        <StatCard label="Streak" value={`${currentStreak} 🔥`} sub={`best: ${bestStreak}`} />
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

      <ScoreDistribution scores={scores} userId={user.id} gameFilter={gameFilter} />
      <ScoreChart scores={scores} userId={user.id} gameFilter={gameFilter} />

      <div className="flex gap-2">
        {['me', 'all', 'h2h'].map(v => (
          <button
            key={v}
            onClick={() => setViewMode(v)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              viewMode === v ? 'bg-emerald-500 text-black' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {v === 'me' ? 'Mine' : v === 'all' ? 'Everyone' : 'vs Friends'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-zinc-600 py-8">Loading…</div>
      ) : viewMode === 'h2h' ? (
        <HeadToHead scores={scores} players={players} userId={user.id} gameFilter={gameFilter} />
      ) : dates.length === 0 ? (
        <div className="text-center text-zinc-600 py-8">No scores yet</div>
      ) : (
        <div className="space-y-4">
          {visibleDates.map(date => {
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
                        <span className="text-xs text-zinc-500 w-28 shrink-0">
                          {game?.emoji} {game?.label}
                          <span className="text-zinc-600 ml-1">#{s.puzzle_number || getPuzzleNumber(game?.epoch, s.date)}</span>
                        </span>
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
          {hasMore && (
            <button
              onClick={() => setVisibleCount(c => c + DATES_PER_PAGE)}
              className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Show {Math.min(DATES_PER_PAGE, dates.length - visibleCount)} more days
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function HeadToHead({ scores, players, userId, gameFilter }) {
  const others = players.filter(p => p.id !== userId)

  if (others.length === 0) {
    return <div className="text-center text-zinc-600 py-8">No other players yet</div>
  }

  const myScores = scores.filter(s =>
    s.player_id === userId && (gameFilter === 'all' || s.game_key === gameFilter)
  )

  return (
    <div className="space-y-3">
      {others.map(opponent => {
        const theirScores = scores.filter(s =>
          s.player_id === opponent.id && (gameFilter === 'all' || s.game_key === gameFilter)
        )

        // Find shared (date, game_key) pairs
        let wins = 0, losses = 0, ties = 0
        let totalDiff = 0, compared = 0

        myScores.forEach(mine => {
          const theirs = theirScores.find(t => t.date === mine.date && t.game_key === mine.game_key)
          if (!theirs) return
          compared++

          // DNF is treated as score 7
          const myVal = mine.solved ? mine.score : 7
          const theirVal = theirs.solved ? theirs.score : 7

          if (myVal < theirVal) wins++
          else if (myVal > theirVal) losses++
          else ties++

          totalDiff += myVal - theirVal
        })

        const winPct = compared > 0 ? Math.round((wins / compared) * 100) : null
        const avgDiff = compared > 0 ? (totalDiff / compared).toFixed(1) : null

        return (
          <div key={opponent.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Avatar avatar={opponent.avatar} name={opponent.name} size="sm" />
                <span className="font-medium text-zinc-100">{opponent.name}</span>
              </div>
              <span className="text-xs text-zinc-500">{compared} games</span>
            </div>
            {compared === 0 ? (
              <p className="text-sm text-zinc-600">No shared scores yet</p>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-3 text-sm">
                  <span className="text-emerald-400 font-medium">{wins}W</span>
                  <span className="text-zinc-500">{ties}T</span>
                  <span className="text-red-400 font-medium">{losses}L</span>
                  <span className="text-zinc-500 ml-auto">{winPct}% win rate</span>
                </div>
                {/* Win bar */}
                <div className="flex h-1.5 rounded-full overflow-hidden bg-zinc-800">
                  <div className="bg-emerald-500" style={{ width: `${(wins / compared) * 100}%` }} />
                  <div className="bg-zinc-600" style={{ width: `${(ties / compared) * 100}%` }} />
                  <div className="bg-red-600" style={{ width: `${(losses / compared) * 100}%` }} />
                </div>
                <p className="text-xs text-zinc-500">
                  avg {avgDiff > 0 ? `+${avgDiff}` : avgDiff} guesses vs them
                  {avgDiff < 0 ? ' (you\'re better)' : avgDiff > 0 ? ' (they\'re better)' : ' (even)'}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
