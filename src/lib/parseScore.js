// Framed share text formats:
// Framed #842
// 🎥 🎥 🎥 🎥 🎥 🟩
//
// One Frame #123
// 🎬 🟩
//
// Title Shot #456
// 🎬 🎬 🎬 🟩
//
// Poster #789
// 🖼️ 🖼️ 🟩

const GAME_PATTERNS = [
  { key: 'framed', label: 'Framed', pattern: /^Framed\s+#(\d+)/i },
  { key: 'one-frame', label: 'One Frame', pattern: /^One\s+Frame\s+#(\d+)/i },
  { key: 'title-shot', label: 'Title Shot', pattern: /^Title\s+Shot\s+#(\d+)/i },
  { key: 'poster', label: 'Poster', pattern: /^Poster\s+#(\d+)/i },
]

const SUCCESS_EMOJI = ['🟩', '🟢']
const FAIL_EMOJI_PATTERN = /[\u{1F3A5}\u{1F3AC}\u{1F5BC}\uD83C\uDFA5\uD83C\uDFAC\uD83D\uDDBCu2B1B\u2B1Cu26AB\u26AA\u{1F7E5}\u{1F7E6}\u{1F7E7}\u{1F7E8}]/u

export function parseShareText(text) {
  if (!text || typeof text !== 'string') return null

  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return null

  // Detect game type and puzzle number
  let gameKey = null
  let gameLabel = null
  let puzzleNumber = null

  for (const { key, label, pattern } of GAME_PATTERNS) {
    const match = lines[0].match(pattern)
    if (match) {
      gameKey = key
      gameLabel = label
      puzzleNumber = parseInt(match[1], 10)
      break
    }
  }

  if (!gameKey) return null

  // Find the emoji line (last non-empty line or any line with emojis)
  const emojiLine = lines[lines.length - 1]

  // Split by spaces and filter emoji segments
  const segments = emojiLine.split(/\s+/).filter(Boolean)

  // Count guesses: find position of success emoji
  let score = null
  let solved = false

  for (let i = 0; i < segments.length; i++) {
    if (SUCCESS_EMOJI.some(e => segments[i].includes(e))) {
      score = i + 1
      solved = true
      break
    }
  }

  // If no success emoji found, it's a DNF
  if (!solved) {
    score = null // DNF
  }

  return {
    gameKey,
    gameLabel,
    puzzleNumber,
    score,       // 1-6, or null for DNF
    solved,
    rawText: text.trim(),
  }
}
