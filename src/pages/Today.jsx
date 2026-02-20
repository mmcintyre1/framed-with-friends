import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useUser } from '../context/UserContext'
import { GAMES } from '../lib/constants'
import { parseShareText } from '../lib/parseScore'
import ScoreDots from '../components/ScoreDots'
import Avatar from '../components/Avatar'

const TODAY = new Date().toISOString().slice(0, 10)

function ScoreEntryModal({ game, onClose, onSave, existingScore }) {
  const [mode, setMode] = useState('manual')
  const [pasteText, setPasteText] = useState('')
  const [manualScore, setManualScore] = useState('')
  const [dnf, setDnf] = useState(false)
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handlePaste = (text) => {
    setPasteText(text)
    setError('')
    const result = parseShareText(text)
    if (result) {
      setParsed(result)
    } else {
      setParsed(null)
      if (text.length > 10) setError('Could not parse score. Try manual entry.')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    let score, solved, puzzleNumber

    if (mode === 'paste') {
      if (!parsed) { setError('Paste a valid score first.'); setSaving(false); return }
      score = parsed.score
      solved = parsed.solved
      puzzleNumber = parsed.puzzleNumber
    } else {
      if (dnf) {
        score = null
        solved = false
      } else {
        const n = parseInt(manualScore, 10)
        if (!n || n < 1 || n > 6) { setError('Enter a score between 1 and 6.'); setSaving(false); return }
        score = n
        solved = true
      }
      puzzleNumber = null
    }

    await onSave({ score, solved, puzzleNumber })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-zinc-900 rounded-2xl p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-zinc-100">
            {game.emoji} {game.label}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-lg">✕</button>
        </div>

        {existingScore && (
          <p className="text-xs text-amber-400 bg-amber-400/10 rounded-lg px-3 py-2">
            You already have a score for today. Saving will overwrite it.
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setMode('paste')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'paste' ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
          >
            Paste result
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'manual' ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
          >
            Enter score
          </button>
        </div>

        {mode === 'paste' && (
          <div className="space-y-3">
            <textarea
              placeholder={`Paste your ${game.label} result here…`}
              value={pasteText}
              onChange={e => handlePaste(e.target.value)}
              className="w-full h-24 px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 focus:border-emerald-500 outline-none text-zinc-100 placeholder-zinc-600 text-sm resize-none"
              autoFocus
            />
            {parsed && (
              <div className="bg-zinc-800 rounded-xl px-4 py-3 space-y-1">
                <p className="text-xs text-zinc-500">Detected</p>
                <p className="text-sm text-zinc-100">
                  {parsed.gameLabel} #{parsed.puzzleNumber} —{' '}
                  {parsed.solved ? <span className="text-emerald-400 font-medium">{parsed.score}/6</span> : <span className="text-red-400 font-medium">DNF</span>}
                </p>
              </div>
            )}
          </div>
        )}

        {mode === 'manual' && (
          <div className="space-y-3">
            <a
              href={game.url}
              target="_blank"
              rel="noreferrer"
              className="block text-center text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Open {game.label} ↗
            </a>
            <div className="flex gap-2 justify-center">
              {[1,2,3,4,5,6].map(n => (
                <button
                  key={n}
                  onClick={() => { setManualScore(String(n)); setDnf(false) }}
                  className={`w-10 h-10 rounded-xl font-bold text-sm transition-colors ${
                    manualScore === String(n) && !dnf
                      ? 'bg-emerald-500 text-black'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setDnf(!dnf); setManualScore('') }}
              className={`w-full py-2 rounded-xl text-sm font-medium transition-colors ${
                dnf ? 'bg-red-700 text-red-100' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              DNF (didn't get it)
            </button>
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-semibold transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

export default function Today() {
  const { user } = useUser()
  const [scores, setScores] = useState([])
  const [players, setPlayers] = useState([])
  const [activeModal, setActiveModal] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const [{ data: playersData }, { data: scoresData }] = await Promise.all([
      supabase.from('players').select('id, name, avatar').order('name'),
      supabase.from('scores').select('*').eq('date', TODAY),
    ])
    setPlayers(playersData || [])
    setScores(scoresData || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Real-time: refetch whenever any score for today changes
  useEffect(() => {
    const channel = supabase
      .channel('today-scores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, fetchData)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchData])

  const getScore = (playerId, gameKey) =>
    scores.find(s => s.player_id === playerId && s.game_key === gameKey)

  const buildShareText = () => {
    const date = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    const lines = [`Framed w/ Friends — ${date}`]

    GAMES.forEach(game => {
      const s = getScore(user.id, game.key)
      if (!s) return
      const result = s.solved ? `${s.score}/6` : 'X/6'
      const boxes = Array.from({ length: 6 }, (_, i) => {
        if (!s.solved) return '🟥'
        if (i < s.score - 1) return '⬛'
        if (i === s.score - 1) return '🟩'
        return '⬜'
      }).join('')
      lines.push(`${boxes}  ${result} ${game.label}`)
    })

    return lines.join('\n')
  }

  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const text = buildShareText()
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = async ({ score, solved, puzzleNumber }) => {
    const existing = getScore(user.id, activeModal.key)
    if (existing) {
      await supabase.from('scores').update({ score, solved, puzzle_number: puzzleNumber }).eq('id', existing.id)
    } else {
      await supabase.from('scores').insert({
        player_id: user.id,
        game_key: activeModal.key,
        score,
        solved,
        puzzle_number: puzzleNumber,
        date: TODAY,
      })
    }
    setActiveModal(null)
    fetchData()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-zinc-600">Loading…</div>
  }

  return (
    <div className="space-y-6 pt-2">
      <div className="space-y-1">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">Your scores today</p>
        <div className="grid grid-cols-2 gap-2">
          {GAMES.map(game => {
            const myScore = getScore(user.id, game.key)
            return (
              <button
                key={game.key}
                onClick={() => setActiveModal(game)}
                className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 text-left transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-zinc-400">{game.label}</span>
                  {myScore?.puzzle_number
                    ? <span className="text-xs text-zinc-600">#{myScore.puzzle_number}</span>
                    : <span className="text-lg">{game.emoji}</span>
                  }
                </div>
                {myScore ? (
                  <>
                    <div className="text-2xl font-bold text-zinc-100 mb-1">
                      {myScore.solved ? `${myScore.score}/6` : 'X/6'}
                    </div>
                    <ScoreDots score={myScore.score} solved={myScore.solved} />
                  </>
                ) : (
                  <div className="text-sm text-zinc-600">tap to add</div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Everyone today</p>
          <button
            onClick={handleCopy}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {copied ? '✓ copied' : 'copy my scores'}
          </button>
        </div>
        <div className="space-y-2">
          {GAMES.map(game => {
            const gameScores = scores.filter(s => s.game_key === game.key)
            if (gameScores.length === 0) return null
            const puzzleNum = gameScores.find(s => s.puzzle_number)?.puzzle_number
            return (
              <div key={game.key} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>{game.emoji}</span>
                    <span className="font-medium text-sm text-zinc-200">{game.label}</span>
                  </div>
                  {puzzleNum && <span className="text-xs text-zinc-600">#{puzzleNum}</span>}
                </div>
                <div className="divide-y divide-zinc-800">
                  {players.map(p => {
                    const s = getScore(p.id, game.key)
                    return (
                      <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar avatar={p.avatar} name={p.name} size="xs" />
                          <span className={`text-sm ${p.id === user.id ? 'text-emerald-400 font-medium' : 'text-zinc-300'}`}>
                            {p.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <ScoreDots score={s?.score} solved={s?.solved} />
                          <span className="text-sm text-zinc-400 w-8 text-right font-mono">
                            {s ? (s.solved ? `${s.score}/6` : 'X') : '—'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {activeModal && (
        <ScoreEntryModal
          game={activeModal}
          onClose={() => setActiveModal(null)}
          onSave={handleSave}
          existingScore={getScore(user.id, activeModal.key)}
        />
      )}
    </div>
  )
}
