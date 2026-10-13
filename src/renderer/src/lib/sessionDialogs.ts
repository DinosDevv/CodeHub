// Global state for the start / wrap-up dialogs, so any page can open them.

export type SessionDialog =
  { kind: 'none' } | { kind: 'start'; projectId: number | null } | { kind: 'wrapUp' }

let state: SessionDialog = { kind: 'none' }
const listeners = new Set<() => void>()

function set(next: SessionDialog): void {
  state = next
  listeners.forEach((l) => l())
}

export const openStartDialog = (projectId: number | null = null): void =>
  set({ kind: 'start', projectId })
export const openWrapUpDialog = (): void => set({ kind: 'wrapUp' })
export const closeSessionDialog = (): void => set({ kind: 'none' })

export function subscribeSessionDialog(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getSessionDialog = (): SessionDialog => state
