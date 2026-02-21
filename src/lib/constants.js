// epoch = the date puzzle #1 was published (verified against known puzzle numbers)
export const GAMES = [
  { key: 'framed',     label: 'Framed',     emoji: '🎥', url: 'https://framed.wtf',           epoch: '2022-03-12' },
  { key: 'one-frame',  label: 'One Frame',  emoji: '🎬', url: 'https://framed.wtf/one-frame',  epoch: '2024-12-03' },
  { key: 'title-shot', label: 'Title Shot', emoji: '🎞️', url: 'https://framed.wtf/titleshot',  epoch: '2025-06-05' },
  { key: 'poster',     label: 'Poster',     emoji: '🖼️', url: 'https://framed.wtf/poster',     epoch: '2025-07-25' },
]

export const GAME_COLORS = {
  'framed': 'emerald',
  'one-frame': 'sky',
  'title-shot': 'violet',
  'poster': 'amber',
}

export const MAX_GUESSES = 6
