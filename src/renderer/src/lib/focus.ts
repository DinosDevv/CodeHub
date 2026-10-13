import type { FocusPhase, FocusSettings, FocusStatus } from '../../../shared/api'
import { errorMessage } from './errors'
import { toast } from './toast'

export type { FocusPhase, FocusSettings, FocusStatus }

export const getFocusStatus = (): Promise<FocusStatus> => window.api.focus.status()
export const getFocusSettings = (): Promise<FocusSettings> => window.api.focus.settings()
export const onFocusChanged = (listener: () => void): (() => void) =>
  window.api.focus.onChanged(listener)

async function attempt(action: () => Promise<unknown>): Promise<void> {
  try {
    await action()
  } catch (e) {
    toast(errorMessage(e), 'error')
  }
}

export const takeBreak = (): Promise<void> => attempt(() => window.api.focus.takeBreak())
export const snoozeBreak = (): Promise<void> => attempt(() => window.api.focus.snooze())
export const endBreak = (): Promise<void> => attempt(() => window.api.focus.endBreak())

export async function saveFocusSettings(settings: FocusSettings): Promise<FocusSettings | null> {
  try {
    return await window.api.focus.setSettings(settings)
  } catch (e) {
    toast(errorMessage(e), 'error')
    return null
  }
}

/** The status moved forward to `now`, so the block advances smoothly between updates. */
export interface LiveFocus {
  phase: FocusPhase
  /** 0–1 through the current focus block. */
  progress: number
  /** Minutes focused in this block. */
  focusedMin: number
  goalMin: number
  /** Break countdown in ms (0 when the break is over). */
  breakLeftMs: number
}

export function liveFocus(status: FocusStatus, now: number): LiveFocus {
  const elapsed = status.phase === 'focus' && status.running ? now - status.at : 0
  const blockMs = status.blockMs + Math.max(0, elapsed)
  const phase: FocusPhase =
    status.phase === 'focus' && blockMs >= status.goalMs ? 'due' : status.phase
  return {
    phase,
    progress: Math.min(1, blockMs / status.goalMs),
    focusedMin: Math.floor(blockMs / 60_000),
    goalMin: Math.round(status.goalMs / 60_000),
    breakLeftMs: status.breakEndsAt ? Math.max(0, status.breakEndsAt - now) : 0
  }
}

/** 452_000 → "7:32" */
export function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
