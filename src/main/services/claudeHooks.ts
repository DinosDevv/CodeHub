import { execFileSync } from 'child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { dirname, join } from 'path'
import { envWithCurrentPath } from './envPath'
import type { ClaudeHooksStatus } from '../../shared/api'

// Lowtide learns what Claude Code is doing through Claude Code hooks: small
// commands Claude runs on events like "user sent a prompt" or "finished". Our
// hook is a tiny Node script that forwards the event to Lowtide's local server.

/** The port the installed hook script uses unless its environment says otherwise. */
const DEFAULT_PORT = 47821
/** The port this Lowtide listens on (a test instance can override it). */
export const HOOK_PORT = Number(process.env['LOWTIDE_HOOK_PORT']) || DEFAULT_PORT

const SETTINGS_PATH = join(homedir(), '.claude', 'settings.json')
const SCRIPT_PATH = join(homedir(), '.lowtide', 'claude-hook.js')
/** Forward slashes work in every shell Claude may use to run hooks on Windows. */
const COMMAND = `node "${SCRIPT_PATH.replace(/\\/g, '/')}"`

const EVENTS = [
  'SessionStart',
  'UserPromptSubmit',
  'PostToolUse',
  'Notification',
  'Stop',
  'SessionEnd'
] as const

/**
 * Never prints anything (some hook output becomes part of Claude's context),
 * never fails, and gives up after a moment if Lowtide isn't running.
 */
const SCRIPT = `// Lowtide: forwards Claude Code hook events to the Lowtide app.
// Installed by Lowtide; safe to delete (then remove the hooks in Lowtide's settings).
const http = require('http')
const done = () => process.exit(0)
// Lowtide's own helper runs (e.g. writing a commit message) stay out of the live list.
if (process.env.LOWTIDE_QUIET) done()
setTimeout(done, 2000)
let input = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => (input += chunk))
process.stdin.on('end', () => {
  let event
  try {
    event = JSON.parse(input)
  } catch {
    return done()
  }
  const body = JSON.stringify({ event, terminalId: Number(process.env.LOWTIDE_TERMINAL_ID) || null })
  const req = http.request(
    {
      host: '127.0.0.1',
      port: Number(process.env.LOWTIDE_HOOK_PORT) || ${DEFAULT_PORT},
      path: '/claude-event',
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) },
      timeout: 1500
    },
    (res) => {
      res.resume()
      res.on('end', done)
    }
  )
  req.on('error', done)
  req.on('timeout', () => req.destroy())
  req.end(body)
})
`

interface HookEntry {
  type: string
  command: string
}
interface HookGroup {
  matcher?: string
  hooks: HookEntry[]
}
type Settings = { hooks?: Record<string, HookGroup[]> } & Record<string, unknown>

const isOurs = (group: HookGroup): boolean =>
  group.hooks?.some((h) => h.command?.includes('.lowtide/claude-hook.js')) ?? false

function readSettings(): Settings {
  if (!existsSync(SETTINGS_PATH)) return {}
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, 'utf8')) as Settings
  } catch {
    throw new Error(`Couldn’t read ${SETTINGS_PATH} (is it valid JSON?). Nothing was changed.`)
  }
}

function writeSettings(settings: Settings): void {
  mkdirSync(dirname(SETTINGS_PATH), { recursive: true })
  // One backup of the file as it was before Lowtide ever touched it.
  const backup = `${SETTINGS_PATH}.lowtide-backup`
  if (existsSync(SETTINGS_PATH) && !existsSync(backup)) copyFileSync(SETTINGS_PATH, backup)
  writeFileSync(SETTINGS_PATH, `${JSON.stringify(settings, null, 2)}\n`)
}

function nodeAvailable(): boolean {
  try {
    execFileSync(process.platform === 'win32' ? 'where.exe' : 'which', ['node'], {
      windowsHide: true,
      env: envWithCurrentPath(),
      stdio: 'ignore'
    })
    return true
  } catch {
    return false
  }
}

export function hooksStatus(): ClaudeHooksStatus {
  let installed = false
  try {
    const hooks = readSettings().hooks ?? {}
    installed = EVENTS.every((e) => hooks[e]?.some(isOurs)) && existsSync(SCRIPT_PATH)
  } catch {
    // unreadable settings: report as not installed
  }
  return { installed, nodeAvailable: nodeAvailable(), settingsPath: SETTINGS_PATH }
}

/** Keeps the script current when Lowtide updates (only if hooks are installed). */
export function refreshHookScript(): void {
  if (existsSync(SCRIPT_PATH)) writeFileSync(SCRIPT_PATH, SCRIPT)
}

export function installHooks(): ClaudeHooksStatus {
  if (!nodeAvailable()) throw new Error('Node.js isn’t on your PATH, and the hook needs it.')
  const settings = readSettings()

  mkdirSync(dirname(SCRIPT_PATH), { recursive: true })
  writeFileSync(SCRIPT_PATH, SCRIPT)

  const hooks = settings.hooks ?? {}
  for (const event of EVENTS) {
    const groups = (hooks[event] ?? []).filter((g) => !isOurs(g))
    const ours: HookGroup = { hooks: [{ type: 'command', command: COMMAND }] }
    if (event === 'PostToolUse') ours.matcher = '*'
    hooks[event] = [...groups, ours]
  }
  writeSettings({ ...settings, hooks })
  return hooksStatus()
}

export function removeHooks(): ClaudeHooksStatus {
  const settings = readSettings()
  if (settings.hooks) {
    for (const [event, groups] of Object.entries(settings.hooks)) {
      const kept = groups.filter((g) => !isOurs(g))
      if (kept.length) settings.hooks[event] = kept
      else delete settings.hooks[event]
    }
    if (Object.keys(settings.hooks).length === 0) delete settings.hooks
    writeSettings(settings)
  }
  return hooksStatus()
}
