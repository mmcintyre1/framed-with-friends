// All dates use Eastern Time so the day rolls over at midnight ET,
// not midnight UTC (which would be 7pm/8pm ET).

export function todayET() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

export function daysAgoET(n) {
  return new Date(Date.now() - n * 86400000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

// Calculate puzzle number for a game on a given ET date string (YYYY-MM-DD).
// Uses each game's epoch (the date of puzzle #1) stored in GAMES constants.
export function getPuzzleNumber(epoch, dateStr) {
  if (!epoch) return null
  const epochMs = new Date(epoch + 'T12:00:00').getTime()
  const dateMs = new Date((dateStr || todayET()) + 'T12:00:00').getTime()
  const days = Math.round((dateMs - epochMs) / 86400000)
  return days >= 0 ? days + 1 : null
}
