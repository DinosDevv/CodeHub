import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Terminal, type ITheme } from '@xterm/xterm'
import type { NewTerminal, TerminalInfo, TerminalShell, TerminalSupport } from '../../../shared/api'
import { openDock, setActiveTerminal } from './dock'
import { errorMessage } from './errors'
import { toast } from './toast'

export type { NewTerminal, TerminalInfo, TerminalShell, TerminalSupport }

export const listTerminals = (): Promise<TerminalInfo[]> => window.api.terminals.list()
export const onTerminalsChanged = (listener: () => void): (() => void) =>
  window.api.terminals.onChanged(listener)
export const getTerminalSupport = (): Promise<TerminalSupport> => window.api.terminals.support()
export const getProjectScripts = (projectId: number): Promise<string[]> =>
  window.api.terminals.scripts(projectId)
export const getShell = (): Promise<TerminalShell> => window.api.terminals.getShell()
export const setShell = (shell: TerminalShell): Promise<void> =>
  window.api.terminals.setShell(shell)

/** Opens a new terminal tab and brings the dock up on it. */
export async function openTerminal(opts: NewTerminal): Promise<TerminalInfo | null> {
  try {
    const info = await window.api.terminals.create(opts)
    ensureEntry(info.id, false)
    setActiveTerminal(info.id)
    openDock()
    return info
  } catch (e) {
    toast(errorMessage(e), 'error')
    return null
  }
}

export async function closeTerminal(id: number): Promise<void> {
  await window.api.terminals.close(id)
  disposeEntry(id)
}

// ---------------------------------------------------------------------------
// xterm instances live here, outside React, so they keep their scrollback and
// state while you navigate between pages or switch tabs.

interface Entry {
  term: Terminal
  fit: FitAddon
  element: HTMLDivElement
  opened: boolean
  /** While repainting scrollback after a reload, live output is already in the buffer. */
  hydrating: boolean
}

const entries = new Map<number, Entry>()

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/** Cozy ANSI palette on top of the app's design tokens. */
function theme(): ITheme {
  return {
    background: '#00000000',
    foreground: cssVar('--color-fg'),
    cursor: cssVar('--color-accent'),
    cursorAccent: cssVar('--color-bg'),
    selectionBackground: 'rgba(185, 164, 255, 0.28)',
    black: '#2a2340',
    red: '#f28b8b',
    green: '#8fd6a8',
    yellow: '#f2c46d',
    blue: '#8ea8ff',
    magenta: '#b9a4ff',
    cyan: '#7fd4d4',
    white: '#e4dcd2',
    brightBlack: '#6f6488',
    brightRed: '#ffa8a8',
    brightGreen: '#aee8c2',
    brightYellow: '#f7d58e',
    brightBlue: '#aec0ff',
    brightMagenta: '#d0c2ff',
    brightCyan: '#a3e6e6',
    brightWhite: '#fff8f0'
  }
}

function ensureEntry(id: number, hydrate: boolean): Entry {
  const existing = entries.get(id)
  if (existing) return existing

  const term = new Terminal({
    allowTransparency: true,
    theme: theme(),
    fontFamily: cssVar('--font-mono') || 'monospace',
    fontSize: 13,
    lineHeight: 1.25,
    cursorBlink: true,
    cursorStyle: 'bar',
    scrollback: 5000
  })
  const fit = new FitAddon()
  term.loadAddon(fit)
  term.loadAddon(new WebLinksAddon((_, url) => window.open(url)))

  term.onData((data) => window.api.terminals.write(id, data))
  term.onResize(({ cols, rows }) => window.api.terminals.resize(id, cols, rows))
  term.attachCustomKeyEventHandler((e) => handleKey(term, e))

  const element = document.createElement('div')
  element.className = 'h-full w-full'
  const entry: Entry = { term, fit, element, opened: false, hydrating: hydrate }
  entries.set(id, entry)

  if (hydrate) {
    window.api.terminals.buffer(id).then((buffer) => {
      term.write(buffer)
      entry.hydrating = false
    })
  }
  return entry
}

/** Copy/paste like a normal Windows terminal; let the dock shortcut through. */
function handleKey(term: Terminal, e: KeyboardEvent): boolean {
  if (e.type !== 'keydown') return true
  if (e.ctrlKey && e.key === '`') return false
  if (e.ctrlKey && (e.key === 'c' || e.key === 'C') && term.hasSelection()) {
    navigator.clipboard.writeText(term.getSelection())
    term.clearSelection()
    return false
  }
  if (e.ctrlKey && (e.key === 'v' || e.key === 'V')) {
    navigator.clipboard.readText().then((text) => text && term.paste(text))
    e.preventDefault()
    return false
  }
  return true
}

/** Puts terminal `id` into `host` and sizes it. Returns a detach function. */
export function attachTerminal(id: number, host: HTMLElement): () => void {
  const entry = ensureEntry(id, true)
  host.appendChild(entry.element)
  if (!entry.opened) {
    entry.term.open(entry.element)
    entry.opened = true
  }
  fitTerminal(id)
  entry.term.focus()
  return () => {
    if (entry.element.parentElement === host) host.removeChild(entry.element)
  }
}

export function fitTerminal(id: number): void {
  const entry = entries.get(id)
  if (!entry?.opened || !entry.element.isConnected) return
  try {
    entry.fit.fit()
  } catch {
    // not laid out yet
  }
}

function disposeEntry(id: number): void {
  entries.get(id)?.term.dispose()
  entries.delete(id)
}

// ---------------------------------------------------------------------------
// Live output and "busy" tracking (a tab is busy while output is streaming).

const BUSY_MS = 1200
const busy = new Set<number>()
const busyTimers = new Map<number, ReturnType<typeof setTimeout>>()
const busyListeners = new Set<() => void>()
let busySnapshot: ReadonlySet<number> = new Set()

function setBusy(id: number, value: boolean): void {
  if (busy.has(id) === value) return
  if (value) busy.add(id)
  else busy.delete(id)
  busySnapshot = new Set(busy)
  busyListeners.forEach((l) => l())
}

window.api.terminals.onData((id, data) => {
  const entry = entries.get(id) ?? ensureEntry(id, false)
  if (!entry.hydrating) entry.term.write(data)
  setBusy(id, true)
  clearTimeout(busyTimers.get(id))
  busyTimers.set(
    id,
    setTimeout(() => setBusy(id, false), BUSY_MS)
  )
})

window.api.terminals.onExit((id, code) => {
  entries
    .get(id)
    ?.term.write(`\r\n\x1b[2m— process exited${code ? ` with code ${code}` : ''} —\x1b[0m\r\n`)
  setBusy(id, false)
})

export function subscribeBusy(listener: () => void): () => void {
  busyListeners.add(listener)
  return () => busyListeners.delete(listener)
}

export const getBusy = (): ReadonlySet<number> => busySnapshot
