import { MAX_GUESSES } from '../lib/constants'

export default function ScoreDots({ score, solved }) {
  if (score === undefined && solved === undefined) {
    // Not played
    return (
      <div className="flex gap-1">
        {Array.from({ length: MAX_GUESSES }).map((_, i) => (
          <div key={i} className="w-3 h-3 rounded-full bg-zinc-800" />
        ))}
      </div>
    )
  }

  if (!solved) {
    // DNF
    return (
      <div className="flex gap-1">
        {Array.from({ length: MAX_GUESSES }).map((_, i) => (
          <div key={i} className="w-3 h-3 rounded-full bg-red-700" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-1">
      {Array.from({ length: MAX_GUESSES }).map((_, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full ${
            i < score - 1
              ? 'bg-zinc-600'
              : i === score - 1
              ? 'bg-emerald-400'
              : 'bg-zinc-800'
          }`}
        />
      ))}
    </div>
  )
}
