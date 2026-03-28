// All dates use Eastern Time so the day rolls over at midnight ET,
// not midnight UTC (which would be 7pm/8pm ET).

export function todayET() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

export function daysAgoET(n) {
  return new Date(Date.now() - n * 86400000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

// Returns the Sunday (week start) of the week containing the given date string.
export function weekStartET(dateStr) {
  const [y, m, d] = (dateStr || todayET()).split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() - date.getDay())
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

// Adds n days to a date string (YYYY-MM-DD), handles month/year overflow.
export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d + n)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
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
