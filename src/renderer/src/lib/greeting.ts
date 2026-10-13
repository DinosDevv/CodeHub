export function greeting(date = new Date()): string {
  const h = date.getHours()
  if (h < 5) return 'burning the midnight oil ☾'
  if (h < 12) return 'good morning ☕'
  if (h < 18) return 'good afternoon ☀'
  return 'good evening ☾'
}
