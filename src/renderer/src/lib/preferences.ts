// Small per-machine UI conveniences. Storage may be unavailable; never rely on it.

export function readPref<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`lowtide:${key}`)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writePref<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`lowtide:${key}`, JSON.stringify(value))
  } catch {
    // ignore
  }
}
