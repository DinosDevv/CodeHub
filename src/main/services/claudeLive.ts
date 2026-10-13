import { BrowserWindow, Notification } from 'electron'
import { getDb } from '../db'
import { listProjects } from '../db/projects'
import { getActiveSession } from '../db/sessions'
import { broadcast, sendToWindows } from '../events'
import type { ClaudeLive, ClaudeState } from '../../shared/api'

/** The subset of a Claude Code hook payload we use. */
export interface HookEvent {
  hook_event_name: string
  session_id?: string
  /** The conversation file Claude writes; its name is the id `claude --resume` takes. */
  transcript_path?: string
  cwd?: string
  prompt?: string
  message?: string
  tool_name?: string
  source?: string
  reason?: string
}

/** Sessions with no events for this long (e.g. Claude was killed) are forgotten. */
const STALE_MS = 6 * 60 * 60 * 1000

const live = new Map<string, ClaudeLive>()

const IDLE_REMINDER = /waiting for your input/i

/** "…/projects/<dir>/04105093-….jsonl" → "04105093-…" */
function resumeIdOf(event?: HookEvent): string | null {
  const match = /([0-9a-f-]{8,64})\.jsonl$/i.exec(event?.transcript_path ?? '')
  return match?.[1] ?? null
}

const norm = (p: string): string => p.replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase()

/** The project whose folder contains `cwd` (the deepest one, for nested repos). */
function projectFor(cwd: string): { id: number; name: string } | null {
  const target = norm(cwd)
  let best: { id: number; name: string; len: number } | null = null
  for (const p of listProjects()) {
    const root = norm(p.path)
    if ((target === root || target.startsWith(`${root}\\`)) && root.length > (best?.len ?? -1)) {
      best = { id: p.id, name: p.name, len: root.length }
    }
  }
  return best && { id: best.id, name: best.name }
}

function clip(text: string | undefined, max = 160): string | null {
  if (!text) return null
  const one = text.replace(/\s+/g, ' ').trim()
  return one.length > max ? `${one.slice(0, max - 1)}…` : one
}

/** Saves an event; it's linked to your coding session when that's on the same project. */
function record(entry: ClaudeLive, type: string, detail: string | null, event?: HookEvent): void {
  const active = getActiveSession()
  const sessionId = active && active.projectId === entry.projectId ? active.id : null
  getDb()
    .prepare(
      'INSERT INTO claude_events (project_id, session_id, type, payload, at) VALUES (?, ?, ?, ?, ?)'
    )
    .run(
      entry.projectId,
      sessionId,
      type,
      JSON.stringify({
        sessionId: entry.sessionId,
        resumeId: resumeIdOf(event),
        cwd: entry.cwd,
        detail
      }),
      Date.now()
    )
}

function notify(entry: ClaudeLive, title: string, body: string): void {
  const windows = BrowserWindow.getAllWindows()
  if (windows.some((w) => w.isFocused()) || !Notification.isSupported()) return
  windows[0]?.flashFrame(true)
  const n = new Notification({ title, body, silent: false })
  n.on('click', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
    sendToWindows('claude:focus', entry)
  })
  n.show()
}

export function handleHookEvent(event: HookEvent, terminalId: number | null): void {
  const sessionId = event.session_id
  if (!sessionId) return
  const now = Date.now()
  const name = event.hook_event_name

  if (name === 'SessionEnd') {
    const ended = live.get(sessionId)
    if (ended) {
      record(ended, 'SessionEnd', event.reason ?? null, event)
      live.delete(sessionId)
      broadcast('claude:changed')
    }
    return
  }

  let entry = live.get(sessionId)
  if (!entry) {
    const cwd = event.cwd ?? ''
    const project = cwd ? projectFor(cwd) : null
    entry = {
      sessionId,
      projectId: project?.id ?? null,
      projectName: project?.name ?? null,
      terminalId,
      cwd,
      state: 'idle',
      message: null,
      startedAt: now,
      updatedAt: now
    }
    live.set(sessionId, entry)
  }
  entry.terminalId ??= terminalId
  const before: ClaudeState = entry.state
  const where = entry.projectName ?? 'a project'

  switch (name) {
    case 'SessionStart':
      record(entry, 'SessionStart', event.source ?? null, event)
      break
    case 'UserPromptSubmit':
      entry.state = 'working'
      entry.message = clip(event.prompt)
      record(entry, 'UserPromptSubmit', entry.message, event)
      break
    case 'PostToolUse':
      // A tool just ran, so Claude is working (e.g. right after you approved it).
      entry.state = 'working'
      break
    case 'Notification':
      // Claude also sends an idle reminder a while after finishing. That's still
      // "your turn", not a request for permission, so it doesn't count as waiting.
      if (IDLE_REMINDER.test(event.message ?? '')) {
        if (before !== 'working') return
      }
      entry.state = 'waiting'
      entry.message = clip(event.message) ?? 'Claude needs you'
      record(entry, 'Notification', entry.message, event)
      notify(entry, `✦ claude needs you in ${where}`, entry.message)
      break
    case 'Stop':
      entry.state = 'idle'
      record(entry, 'Stop', null, event)
      if (before === 'working') notify(entry, `✦ claude finished in ${where}`, 'your turn ☕')
      break
    default:
      return
  }

  entry.updatedAt = now
  // Tool events arrive constantly while Claude works; only broadcast real changes.
  if (name !== 'PostToolUse' || before !== entry.state) broadcast('claude:changed')
}

/** Claude can't outlive the terminal it ran in. */
export function forgetTerminal(terminalId: number): void {
  let changed = false
  for (const [id, entry] of live) {
    if (entry.terminalId === terminalId) {
      live.delete(id)
      changed = true
    }
  }
  if (changed) broadcast('claude:changed')
}

export function listLive(): ClaudeLive[] {
  const cutoff = Date.now() - STALE_MS
  for (const [id, entry] of live) if (entry.updatedAt < cutoff) live.delete(id)
  return [...live.values()].sort((a, b) => b.updatedAt - a.updatedAt)
}
