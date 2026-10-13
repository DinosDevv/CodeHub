import { readPref, writePref } from './preferences'

// State of the bottom terminal dock, shared by every component that opens it.

export interface DockState {
  open: boolean
  height: number
  activeId: number | null
  claudeHintOpen: boolean
}

export const MIN_DOCK_HEIGHT = 160
const HEIGHT_PREF = 'dock.height'

let state: DockState = {
  open: false,
  height: readPref(HEIGHT_PREF, 320),
  activeId: null,
  claudeHintOpen: false
}
const listeners = new Set<() => void>()

function set(patch: Partial<DockState>): void {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export const openDock = (): void => set({ open: true })
export const closeDock = (): void => set({ open: false })
export const toggleDock = (): void => set({ open: !state.open })
export const setActiveTerminal = (activeId: number | null): void => set({ activeId })
export const showClaudeHint = (claudeHintOpen: boolean): void => set({ claudeHintOpen })

export function setDockHeight(height: number): void {
  const max = Math.max(MIN_DOCK_HEIGHT, window.innerHeight - 160)
  const clamped = Math.round(Math.min(max, Math.max(MIN_DOCK_HEIGHT, height)))
  writePref(HEIGHT_PREF, clamped)
  set({ height: clamped })
}

export function subscribeDock(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getDock = (): DockState => state
