import { getDb } from '.'

// Small JSON key/value store for app preferences.

export function getSetting<T>(key: string, fallback: T): T {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    { value: string } | undefined
  return row ? (JSON.parse(row.value) as T) : fallback
}

export function setSetting<T>(key: string, value: T): void {
  getDb()
    .prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    )
    .run(key, JSON.stringify(value))
}
