const units: [limit: number, ms: number, name: string][] = [
  [60_000, 1000, 'second'],
  [3_600_000, 60_000, 'minute'],
  [86_400_000, 3_600_000, 'hour'],
  [604_800_000, 86_400_000, 'day'],
  [2_629_800_000, 604_800_000, 'week'],
  [31_557_600_000, 2_629_800_000, 'month'],
  [Infinity, 31_557_600_000, 'year']
]

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export function timeAgo(ms: number, now = Date.now()): string {
  // Never in the future: the caller's clock may lag a few seconds behind the event.
  const diff = Math.min(0, ms - now)
  const [, unitMs, name] = units.find(([limit]) => Math.abs(diff) < limit)!
  return rtf.format(Math.round(diff / unitMs), name as Intl.RelativeTimeFormatUnit)
}
