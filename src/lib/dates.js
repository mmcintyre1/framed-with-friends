// All dates use Eastern Time so the day rolls over at midnight ET,
// not midnight UTC (which would be 7pm/8pm ET).

export function todayET() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

export function daysAgoET(n) {
  return new Date(Date.now() - n * 86400000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}
