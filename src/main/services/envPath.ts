import { execFileSync } from 'child_process'
import { existsSync, statSync } from 'fs'
import { dirname } from 'path'

// A running app keeps the PATH it was started with, so a tool installed later
// (like Claude Code) stays invisible until a restart. On Windows we re-read the
// real PATH from the registry instead.

const CACHE_MS = 10_000
let cache: { at: number; path: string } | null = null

function readRegistryPath(key: string): string {
  try {
    const out = execFileSync('reg', ['query', key, '/v', 'Path'], {
      encoding: 'utf8',
      windowsHide: true
    })
    const match = /^\s*Path\s+REG_(?:EXPAND_)?SZ\s+(.*)$/im.exec(out)
    return match?.[1].trim() ?? ''
  } catch {
    return ''
  }
}

/** Expands %VAR% references the way Windows does for REG_EXPAND_SZ values. */
function expand(value: string): string {
  return value.replace(/%([^%]+)%/g, (whole, name: string) => {
    const key = Object.keys(process.env).find((k) => k.toUpperCase() === name.toUpperCase())
    return key ? (process.env[key] ?? whole) : whole
  })
}

/**
 * PATH entries must be folders. A common slip is adding the program itself
 * (`...\bin\claude.exe`); treat such an entry as the folder it lives in.
 */
function normalizeEntry(entry: string): string {
  try {
    if (/\.(exe|cmd|bat)$/i.test(entry) && existsSync(entry) && statSync(entry).isFile()) {
      return dirname(entry)
    }
  } catch {
    // keep as is
  }
  return entry
}

/** The PATH a freshly opened terminal would get right now. */
export function currentPath(): string {
  const fallback = process.env.PATH ?? ''
  if (process.platform !== 'win32') return fallback
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.path

  const machine = readRegistryPath(
    'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment'
  )
  const user = readRegistryPath('HKCU\\Environment')
  const entries = [...`${machine};${user}`.split(';'), ...fallback.split(';')]
    .map((e) => normalizeEntry(expand(e.trim())))
    .filter(Boolean)
  const seen = new Set<string>()
  const path = entries
    .filter((e) => {
      const k = e.toLowerCase().replace(/\\+$/, '')
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    .join(';')

  cache = { at: Date.now(), path }
  return path
}

/** process.env with PATH replaced by the current one (Windows env keys are case-insensitive). */
export function envWithCurrentPath(base: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [k, v] of Object.entries(base)) {
    if (v !== undefined && k.toUpperCase() !== 'PATH') env[k] = v
  }
  env[process.platform === 'win32' ? 'Path' : 'PATH'] = currentPath()
  return env
}
