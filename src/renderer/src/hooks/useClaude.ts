import { useCallback, useEffect, useState } from 'react'
import {
  focusClaude,
  getClaudeHistory,
  getHooksStatus,
  installHooks,
  listClaudeLive,
  onClaudeChanged,
  onClaudeFocus,
  removeHooks,
  type ClaudeHooksStatus,
  type ClaudeLive,
  type ClaudeSessionSummary
} from '../lib/claude'
import type { Navigate } from '../lib/navigation'

/** Claude Code sessions happening right now, kept live by hook events. */
export function useClaudeLive(): ClaudeLive[] {
  const [live, setLive] = useState<ClaudeLive[]>([])

  useEffect(() => {
    const load = (): void => {
      listClaudeLive().then(setLive)
    }
    load()
    return onClaudeChanged(load)
  }, [])

  return live
}

/** A project's earlier Claude conversations; refreshes as new hook events arrive. */
export function useClaudeHistory(projectId: number, limit = 6): ClaudeSessionSummary[] | null {
  const [history, setHistory] = useState<ClaudeSessionSummary[] | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = (): void => {
      getClaudeHistory(projectId, limit).then((h) => !cancelled && setHistory(h))
    }
    load()
    const unsubscribe = onClaudeChanged(load)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [projectId, limit])

  return history
}

export function useHooksStatus(): {
  status: ClaudeHooksStatus | null
  busy: boolean
  install: () => Promise<void>
  remove: () => Promise<void>
} {
  const [status, setStatus] = useState<ClaudeHooksStatus | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getHooksStatus().then(setStatus)
  }, [])

  const run = useCallback(async (action: () => Promise<ClaudeHooksStatus | null>) => {
    setBusy(true)
    const next = await action()
    setBusy(false)
    if (next) setStatus(next)
  }, [])

  return {
    status,
    busy,
    install: () => run(installHooks),
    remove: () => run(removeHooks)
  }
}

/** Clicking a "claude needs you" notification jumps to that session. */
export function useClaudeFocus(navigate: Navigate): void {
  useEffect(() => onClaudeFocus((live) => focusClaude(live, navigate)), [navigate])
}
