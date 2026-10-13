import { readPref, writePref } from './preferences'

// "The tide": today's focus time as a fraction of a daily goal.

const GOAL_PREF = 'tide.goalHours'
export const DEFAULT_GOAL_HOURS = 4

function read(): number {
  const hours = readPref(GOAL_PREF, DEFAULT_GOAL_HOURS)
  return Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_GOAL_HOURS
}

let goal = read()
const listeners = new Set<() => void>()

export const getTideGoalHours = (): number => goal

export function setTideGoalHours(hours: number): number {
  goal = Math.min(16, Math.max(0.5, Math.round(hours * 2) / 2))
  writePref(GOAL_PREF, goal)
  listeners.forEach((l) => l())
  return goal
}

export function subscribeTideGoal(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** 0 = low tide, 1 = goal reached (it doesn't go past high tide). */
export function tideLevel(todayMs: number, goalHours = goal): number {
  return Math.min(1, todayMs / (goalHours * 3_600_000))
}
