import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useUser } from '../context/UserContext'
import { hashPin } from '../lib/hash'
import Avatar from './Avatar'

const REMEMBERED_KEY = 'fwf_remembered'

function getRemembered() {
  try { return JSON.parse(localStorage.getItem(REMEMBERED_KEY) || '{}') } catch { return {} }
}

function saveRemembered(playerId, hashedPin) {
  const current = getRemembered()
  localStorage.setItem(REMEMBERED_KEY, JSON.stringify({ ...current, [playerId]: hashedPin }))
}

export default function LoginScreen() {
  const { login } = useUser()
  const [step, setStep] = useState('pick') // 'pick' | 'pin'
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [showNew, setShowNew] = useState(false)

  useEffect(() => {
    supabase.from('players').select('id, name, avatar').order('name').then(({ data }) => {
      setPlayers(data || [])
    })
  }, [])

  const handleSelect = async (player) => {
    setSelected(player)
    setPin('')
    setError('')

    const remembered = getRemembered()
    if (remembered[player.id]) {
      setLoading(true)
      const { data } = await supabase
        .from('players')
        .select('id, name, avatar')
        .eq('id', player.id)
        .eq('pin', remembered[player.id])
        .single()
      setLoading(false)
      if (data) {
        login({ id: data.id, name: data.name, avatar: data.avatar })
        return
      }
      // Remembered token stale — fall through to PIN
    }

    setStep('pin')
  }

  const handlePinSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const hashed = await hashPin(pin)
    const { data, error: err } = await supabase
      .from('players')
      .select('id, name, avatar')
      .eq('id', selected.id)
      .eq('pin', hashed)
      .single()

    setLoading(false)

    if (err || !data) {
      setError('Wrong PIN. Try again.')
      setPin('')
      return
    }

    saveRemembered(data.id, hashed)
    login({ id: data.id, name: data.name, avatar: data.avatar })
  }

  const handleCreatePlayer = async (e) => {
    e.preventDefault()
    if (!newName.trim() || !pin) return
    setLoading(true)
    setError('')

    const hashed = await hashPin(pin)
    const { data, error: err } = await supabase
      .from('players')
      .insert({ name: newName.trim(), pin: hashed })
      .select('id, name, avatar')
      .single()

    setLoading(false)

    if (err) {
      setError(err.message || 'Could not create player.')
      return
    }

    saveRemembered(data.id, hashed)
    login({ id: data.id, name: data.name, avatar: data.avatar })
  }

  const remembered = getRemembered()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-1 text-zinc-100">
          Framed<span className="text-emerald-400"> w/ Friends</span>
        </h1>
        <p className="text-center text-zinc-500 text-sm mb-8">track your daily scores</p>

        {step === 'pick' && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Who are you?</p>

            {loading && (
              <div className="text-center text-zinc-600 py-4 text-sm">Signing in…</div>
            )}

            {!loading && players.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelect(p)}
                className="w-full text-left px-4 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all flex items-center gap-3"
              >
                <Avatar avatar={p.avatar} name={p.name} size="sm" />
                <span className="flex-1 text-zinc-100 font-medium">{p.name}</span>
                {remembered[p.id] && (
                  <span className="text-xs text-zinc-600">remembered</span>
                )}
              </button>
            ))}

            <div className="pt-2">
              {!showNew ? (
                <button
                  onClick={() => setShowNew(true)}
                  className="w-full py-3 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  + new player
                </button>
              ) : (
                <form onSubmit={handleCreatePlayer} className="space-y-3 pt-2">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-emerald-500 outline-none text-zinc-100 placeholder-zinc-600"
                    autoFocus
                  />
                  <input
                    type="password"
                    placeholder="Choose a PIN"
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-emerald-500 outline-none text-zinc-100 placeholder-zinc-600"
                  />
                  {error && <p className="text-red-400 text-sm">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading || !newName.trim() || !pin}
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold transition-colors"
                  >
                    {loading ? 'Creating…' : 'Join'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {step === 'pin' && (
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Avatar avatar={selected?.avatar} name={selected?.name} size="md" />
              <p className="text-zinc-400 text-sm">
                Hey <span className="text-zinc-100 font-medium">{selected?.name}</span>, enter your PIN
              </p>
            </div>
            <input
              type="password"
              placeholder="PIN"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-emerald-500 outline-none text-zinc-100 placeholder-zinc-600 text-center text-xl tracking-widest"
              autoFocus
            />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading || !pin}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold transition-colors"
            >
              {loading ? 'Checking…' : 'Go'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('pick'); setError('') }}
              className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ← back
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
