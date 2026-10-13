import { BrowserWindow, Notification } from 'electron'
import { getActiveSession, listPauses, type PauseSpan } from '../db/sessions'
import { getSetting, setSetting } from '../db/settings'
import { broadcast } from '../events'
import { pauseSession, resumeSession } from './sessions'
import type { ActiveSession, FocusSettings, FocusStatus } from '../../shared/api'

// The focus rhythm rides on the session clock: blocks of focused (active, not
// paused) time, then a suggested break. Everything is derived from the session's
// pause history, so it survives reloads and restarts.

const SETTINGS_KEY = 'focus'
const DEFAULTS: FocusSettings = { enabled: true, focusMinutes: 50, breakMinutes: 10 }
const SNOOZE_MS = 5 * 60_000
const TICK_MS = 5_000

export function getFocusSettings(): FocusSettings {
  return { ...DEFAULTS, ...getSetting<Partial<FocusSettings>>(SETTINGS_KEY, {}) }
}

export function setFocusSettings(next: FocusSettings): FocusSettings {
  const clean: FocusSettings = {
    enabled: next.enabled !== false,
    focusMinutes: Math.min(
      180,
      Math.max(10, Math.round(next.focusMinutes) || DEFAULTS.focusMinutes)
    ),
    breakMinutes: Math.min(60, Math.max(1, Math.round(next.breakMinutes) || DEFAULTS.breakMinutes))
  }
  setSetting(SETTINGS_KEY, clean)
  broadcast('focus:changed')
  return clean
}

/** Focused time from the session start up to `t` (pauses before `t` subtracted). */
function activeUntil(session: ActiveSession, pauses: PauseSpan[], t: number): number {
  let paused = 0
  for (const p of pauses) {
    const end = Math.min(p.ended_at ?? t, t)
    if (end > p.started_at) paused += end - p.started_at
  }
  return Math.max(0, t - session.startedAt - paused)
}

/** A block starts at the session start, or after the last pause long enough to be a break. */
function blockStart(session: ActiveSession, pauses: PauseSpan[], breakMs: number): number {
  let start = session.startedAt
  for (const p of pauses) {
    if (p.ended_at !== null && (p.reason === 'break' || p.ended_at - p.started_at >= breakMs)) {
      start = p.ended_at
    }
  }
  return start
}

/** "5 more minutes" for one specific block. */
let snooze: { block: number; extraMs: number } | null = null

export function focusStatus(now = Date.now()): FocusStatus {
  const settings = getFocusSettings()
  const session = getActiveSession()
  const off: FocusStatus = {
    phase: 'off',
    running: false,
    blockMs: 0,
    goalMs: settings.focusMinutes * 60_000,
    breakEndsAt: null,
    at: now
  }
  if (!settings.enabled || !session) return off

  const breakMs = settings.breakMinutes * 60_000
  if (session.pauseReason === 'break' && session.pausedAt) {
    return { ...off, phase: 'break', breakEndsAt: session.pausedAt + breakMs }
  }

  const pauses = listPauses(session.id)
  const block = blockStart(session, pauses, breakMs)
  const blockMs = activeUntil(session, pauses, now) - activeUntil(session, pauses, block)
  const extra = snooze?.block === block ? snooze.extraMs : 0
  const goalMs = settings.focusMinutes * 60_000 + extra
  return {
    phase: blockMs >= goalMs ? 'due' : 'focus',
    running: session.pausedAt === null,
    blockMs,
    goalMs,
    breakEndsAt: null,
    at: now
  }
}

export function takeBreak(): void {
  pauseSession('break')
  broadcast('focus:changed')
}

export function endBreak(): void {
  resumeSession('break')
  broadcast('focus:changed')
}

export function snoozeBreak(): void {
  const session = getActiveSession()
  if (!session) return
  const settings = getFocusSettings()
  const block = blockStart(session, listPauses(session.id), settings.breakMinutes * 60_000)
  snooze = { block, extraMs: (snooze?.block === block ? snooze.extraMs : 0) + SNOOZE_MS }
  broadcast('focus:changed')
}

function notify(title: string, body: string): void {
  const windows = BrowserWindow.getAllWindows()
  if (windows.some((w) => w.isFocused()) || !Notification.isSupported()) return
  windows[0]?.flashFrame(true)
  const n = new Notification({ title, body })
  n.on('click', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  })
  n.show()
}

// Remember what we've already announced so each nudge happens once.
let lastPhase: FocusStatus['phase'] = 'off'
let breakEndAnnounced: number | null = null

function tick(): void {
  const status = focusStatus()
  if (status.phase !== lastPhase) {
    if (status.phase === 'due') {
      notify(
        'time for a breather ☕',
        'you’ve been focused for a while — stretch, sip, look outside.'
      )
    }
    lastPhase = status.phase
    broadcast('focus:changed')
  }
  if (status.phase === 'break' && status.breakEndsAt && Date.now() >= status.breakEndsAt) {
    if (breakEndAnnounced !== status.breakEndsAt) {
      breakEndAnnounced = status.breakEndsAt
      notify('the tide’s coming back in 🌊', 'break’s over — back to it when you’re ready.')
      broadcast('focus:changed')
    }
  }
}

export function startFocusWatch(): void {
  setInterval(tick, TICK_MS)
}
