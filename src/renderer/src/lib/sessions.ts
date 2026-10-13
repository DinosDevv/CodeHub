import type {
  ActiveSession,
  PauseReason,
  SessionRecord,
  SessionStats,
  SessionSummary
} from '../../../shared/api'
import { errorMessage } from './errors'
import { toast } from './toast'

export type { ActiveSession, PauseReason, SessionRecord, SessionStats, SessionSummary }
export { activeElapsedMs } from '../../../shared/sessions'

export const getActiveSession = (): Promise<ActiveSession | null> => window.api.sessions.getActive()
export const listSessions = (projectId: number | null, limit: number): Promise<SessionRecord[]> =>
  window.api.sessions.list(projectId, limit)
export const getSessionStats = (): Promise<SessionStats> => window.api.sessions.stats()
export const onSessionsChanged = (listener: () => void): (() => void) =>
  window.api.sessions.onChanged(listener)
export const stopSession = (note: string | null): Promise<SessionSummary> =>
  window.api.sessions.stop(note)

export async function startSession(projectId: number): Promise<ActiveSession | null> {
  try {
    return await window.api.sessions.start(projectId)
  } catch (e) {
    toast(errorMessage(e), 'error')
    return null
  }
}

export const pauseSession = (): Promise<void> => window.api.sessions.pause()
export const resumeSession = (): Promise<void> => window.api.sessions.resume()

export const getIdleMinutes = (): Promise<number> => window.api.settings.getIdleMinutes()
export const setIdleMinutes = (minutes: number): Promise<number> =>
  window.api.settings.setIdleMinutes(minutes)

export const pauseLabels: Record<PauseReason, string> = {
  manual: 'taking a breather',
  idle: 'paused — you stepped away',
  closed: 'paused while codehub was closed'
}

/** 3_900_000 → "1h 05m" */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h}h ${String(m).padStart(2, '0')}m`
}

/** 3_933_000 → "1:05:33" */
export function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function sessionDateLabel(ms: number): string {
  return new Date(ms).toLocaleString([], {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}
