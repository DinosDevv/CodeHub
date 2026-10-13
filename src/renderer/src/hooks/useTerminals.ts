import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { getDock, subscribeDock, toggleDock, type DockState } from '../lib/dock'
import {
  getBusy,
  getProjectScripts,
  getShell,
  setShell,
  getTerminalSupport,
  listTerminals,
  onTerminalsChanged,
  subscribeBusy,
  type TerminalInfo,
  type TerminalShell,
  type TerminalSupport
} from '../lib/terminals'

export function useTerminals(): TerminalInfo[] {
  const [terminals, setTerminals] = useState<TerminalInfo[]>([])

  useEffect(() => {
    const load = (): void => {
      listTerminals().then(setTerminals)
    }
    load()
    return onTerminalsChanged(load)
  }, [])

  return terminals
}

/** Ids of terminals that are printing output right now. */
export function useBusyTerminals(): ReadonlySet<number> {
  return useSyncExternalStore(subscribeBusy, getBusy)
}

export function useDock(): DockState {
  return useSyncExternalStore(subscribeDock, getDock)
}

export function useTerminalSupport(): TerminalSupport | null {
  const [support, setSupport] = useState<TerminalSupport | null>(null)
  useEffect(() => {
    getTerminalSupport().then(setSupport)
  }, [])
  return support
}

export function useProjectScripts(projectId: number): string[] {
  const [scripts, setScripts] = useState<string[]>([])
  useEffect(() => {
    getProjectScripts(projectId).then(setScripts)
  }, [projectId])
  return scripts
}

export function useShellSetting(): {
  shell: TerminalShell | null
  save: (shell: TerminalShell) => Promise<void>
} {
  const [shell, setLocal] = useState<TerminalShell | null>(null)
  useEffect(() => {
    getShell().then(setLocal)
  }, [])
  const save = useCallback(async (next: TerminalShell) => {
    await setShell(next)
    setLocal(next)
  }, [])
  return { shell, save }
}

/** Ctrl+` toggles the terminal dock from anywhere. */
export function useDockShortcut(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault()
        toggleDock()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
