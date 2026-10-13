// Tiny global toast store. Call `toast(...)` from anywhere; <Toaster/> renders them.

export type ToastKind = 'info' | 'success' | 'error'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
}

let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((l) => l())
}

export function toast(message: string, kind: ToastKind = 'info'): void {
  const id = nextId++
  toasts = [...toasts, { id, kind, message }]
  emit()
  setTimeout(() => dismissToast(id), kind === 'error' ? 6000 : 3500)
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getToasts(): Toast[] {
  return toasts
}
