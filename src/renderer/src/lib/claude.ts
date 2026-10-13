import type { ClaudeHooksStatus, ClaudeLive, ClaudeState } from '../../../shared/api'
import { openDock, setActiveTerminal } from './dock'
import { errorMessage } from './errors'
import type { Navigate } from './navigation'
import { toast } from './toast'

export type { ClaudeHooksStatus, ClaudeLive, ClaudeState }

export const listClaudeLive = (): Promise<ClaudeLive[]> => window.api.claude.live()
export const getHooksStatus = (): Promise<ClaudeHooksStatus> => window.api.claude.hooks()
export const onClaudeChanged = (listener: () => void): (() => void) =>
  window.api.claude.onChanged(listener)
export const onClaudeFocus = (listener: (live: ClaudeLive) => void): (() => void) =>
  window.api.claude.onFocus(listener)

export async function installHooks(): Promise<ClaudeHooksStatus | null> {
  try {
    const status = await window.api.claude.installHooks()
    toast('claude code connected ✦ new claude sessions will show up live', 'success')
    return status
  } catch (e) {
    toast(errorMessage(e), 'error')
    return null
  }
}

export async function removeHooks(): Promise<ClaudeHooksStatus | null> {
  try {
    const status = await window.api.claude.removeHooks()
    toast('claude code disconnected')
    return status
  } catch (e) {
    toast(errorMessage(e), 'error')
    return null
  }
}

export const claudeStates: Record<
  ClaudeState,
  { label: string; dot: string; text: string; chip: 'glow' | 'warning' | 'success' }
> = {
  working: {
    label: 'working',
    dot: 'bg-glow shadow-[0_0_10px_var(--color-glow)] animate-breathe',
    text: 'text-glow',
    chip: 'glow'
  },
  waiting: {
    label: 'needs you',
    dot: 'bg-warning shadow-[0_0_10px_var(--color-warning)] animate-breathe',
    text: 'text-warning',
    chip: 'warning'
  },
  idle: { label: 'your turn', dot: 'bg-success', text: 'text-success', chip: 'success' }
}

/** Brings a Claude session into view: its terminal tab if it has one, else its project. */
export function focusClaude(live: ClaudeLive, navigate: Navigate): void {
  if (live.terminalId !== null) {
    setActiveTerminal(live.terminalId)
    openDock()
  } else if (live.projectId !== null) {
    navigate({ page: 'project', id: live.projectId })
  }
}
