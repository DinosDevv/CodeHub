import { powerMonitor } from 'electron'
import { getActiveSession } from '../db/sessions'
import { getSetting, setSetting } from '../db/settings'
import { pauseSession, resumeSession } from './sessions'

export const IDLE_MINUTES_KEY = 'idleMinutes'
export const DEFAULT_IDLE_MINUTES = 5
const HEARTBEAT_KEY = 'heartbeat'
const TICK_MS = 15_000
/** Input within this many seconds counts as "you're back". */
const BACK_SECONDS = 30

function tick(): void {
  setSetting(HEARTBEAT_KEY, Date.now())

  const active = getActiveSession()
  if (!active) return

  const idleSeconds = powerMonitor.getSystemIdleTime()
  const threshold = getSetting(IDLE_MINUTES_KEY, DEFAULT_IDLE_MINUTES) * 60

  if (!active.pausedAt && idleSeconds >= threshold) {
    // Backdate so the idle minutes themselves don't count as focus time.
    pauseSession('idle', Date.now() - idleSeconds * 1000)
  } else if (active.pauseReason === 'idle' && idleSeconds < BACK_SECONDS) {
    resumeSession('idle')
  }
}

/**
 * If the app quit or crashed mid-session, pause it from the last moment we
 * know the app was alive, so the time it was closed isn't counted.
 */
function recoverAfterRestart(): void {
  const active = getActiveSession()
  if (!active || active.pausedAt) return
  pauseSession('closed', getSetting<number>(HEARTBEAT_KEY, Date.now()))
}

export function startIdleWatch(): void {
  recoverAfterRestart()
  setInterval(tick, TICK_MS)
  tick()

  const awayNow = (): void => pauseSession('idle')
  powerMonitor.on('lock-screen', awayNow)
  powerMonitor.on('suspend', awayNow)
}

export function pauseForQuit(): void {
  pauseSession('closed')
}
