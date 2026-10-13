import { useSyncExternalStore } from 'react'
import { getTideGoalHours, subscribeTideGoal, tideLevel } from '../lib/tide'
import { useSessionStats } from './useSessionData'

export function useTideGoal(): number {
  return useSyncExternalStore(subscribeTideGoal, getTideGoalHours)
}

/** Today's focus time and how high the tide is (0–1). */
export function useTide(): { todayMs: number; goalHours: number; level: number } {
  const stats = useSessionStats()
  const goalHours = useTideGoal()
  const todayMs = stats?.todayMs ?? 0
  return { todayMs, goalHours, level: tideLevel(todayMs, goalHours) }
}
