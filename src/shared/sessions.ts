import type { ActiveSession } from './api'

/** Focused time: wall time minus pauses (including a pause still running). */
export function activeElapsedMs(s: ActiveSession, now: number): number {
  const runningPause = s.pausedAt ? now - s.pausedAt : 0
  return Math.max(0, now - s.startedAt - s.pausedMs - runningPause)
}
