import type {
  ClaudeHooksStatus,
  ClaudeLive,
  ClaudeSessionSummary,
  ClaudeState
} from '../../../shared/api'
import { openDock, setActiveTerminal, showClaudeHint } from './dock'
import { errorMessage } from './errors'
import type { Navigate } from './navigation'
import { moveTask, type Task } from './tasks'
import { getTerminalSupport, openTerminal } from './terminals'
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

export const getClaudeHistory = (
  projectId: number,
  limit: number
): Promise<ClaudeSessionSummary[]> => window.api.claude.history(projectId, limit)

export type { ClaudeSessionSummary }

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/** The first message Claude gets when you hand it a task. */
export function taskPrompt(task: Task): string {
  return [
    `Let's work on this task: ${task.title}`,
    task.notes ? `Notes: ${task.notes}` : '',
    'Start by looking at the relevant code, then tell me your plan before changing anything.'
  ]
    .filter(Boolean)
    .join('\n\n')
}

/** Opens a Claude tab with the task as its first message and marks the task in progress. */
export async function workOnTask(task: Task): Promise<void> {
  const support = await getTerminalSupport()
  if (!support.claude) {
    showClaudeHint(true)
    return
  }
  if (task.status === 'todo') await moveTask(task.id, 'doing')
  await openTerminal({
    projectId: task.projectId,
    kind: 'claude',
    prompt: taskPrompt(task),
    title: clip(task.title, 28)
  })
}

/** Reopens an earlier Claude conversation in a new tab. */
export async function resumeClaude(projectId: number, sessionId: string): Promise<void> {
  const support = await getTerminalSupport()
  if (!support.claude) {
    showClaudeHint(true)
    return
  }
  await openTerminal({ projectId, kind: 'claude', resumeSessionId: sessionId, title: 'resumed' })
}

/** Opens a fresh Claude tab in a project (or the install hint if Claude is missing). */
export async function openClaudeTab(projectId: number): Promise<void> {
  const support = await getTerminalSupport()
  if (!support.claude) {
    showClaudeHint(true)
    return
  }
  await openTerminal({ projectId, kind: 'claude' })
}
