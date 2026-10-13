import { ChevronDown, Sparkles, SquareTerminal, X } from 'lucide-react'
import { useBusyTerminals, useDock, useTerminals } from '../hooks/useTerminals'
import { closeDock, setActiveTerminal, setDockHeight } from '../lib/dock'
import { closeTerminal, type TerminalInfo } from '../lib/terminals'
import { NewTerminalMenu } from './NewTerminalMenu'
import { TerminalView } from './TerminalView'

/** The bottom panel holding every terminal tab. Toggle with Ctrl+`. */
export function TerminalDock({
  contextProjectId
}: {
  contextProjectId: number | null
}): React.JSX.Element | null {
  const dock = useDock()
  const terminals = useTerminals()
  const busy = useBusyTerminals()

  if (!dock.open) return null
  const active =
    terminals.find((t) => t.id === dock.activeId) ?? terminals[terminals.length - 1] ?? null

  const startResize = (e: React.PointerEvent): void => {
    e.preventDefault()
    const move = (ev: PointerEvent): void => setDockHeight(window.innerHeight - ev.clientY)
    const up = (): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <section
      style={{ height: dock.height }}
      className="relative flex shrink-0 animate-rise flex-col border-t border-line/60 bg-surface/70 shadow-[0_-20px_60px_-30px_var(--color-glow)] backdrop-blur-2xl"
    >
      <div
        onPointerDown={startResize}
        className="absolute -top-1 right-0 left-0 h-2 cursor-row-resize transition hover:bg-glow/20"
      />
      <header className="flex items-center gap-1 px-3 pt-2 pb-1.5">
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
          {terminals.map((t) => (
            <Tab key={t.id} terminal={t} active={t.id === active?.id} busy={busy.has(t.id)} />
          ))}
        </div>
        <NewTerminalMenu contextProjectId={contextProjectId} />
        <div className="flex-1" />
        <button
          aria-label="hide terminal"
          title="hide (Ctrl+`)"
          onClick={closeDock}
          className="grid h-7 w-7 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg"
        >
          <ChevronDown size={16} />
        </button>
      </header>
      <div className="min-h-0 flex-1 px-3 pb-3">
        {active ? (
          <TerminalView key={active.id} id={active.id} />
        ) : (
          <div className="grid h-full place-items-center rounded-xl bg-bg/40 text-sm text-muted italic">
            no terminals yet — open one with +
          </div>
        )}
      </div>
    </section>
  )
}

function Tab({
  terminal,
  active,
  busy
}: {
  terminal: TerminalInfo
  active: boolean
  busy: boolean
}): React.JSX.Element {
  const exited = terminal.exitCode !== null
  const Icon = terminal.kind === 'claude' ? Sparkles : SquareTerminal

  const dot = exited
    ? terminal.exitCode === 0
      ? 'bg-success'
      : 'bg-danger'
    : busy
      ? 'bg-accent shadow-[0_0_8px_var(--color-accent)] animate-breathe'
      : 'bg-muted/50'

  return (
    <div
      onClick={() => setActiveTerminal(terminal.id)}
      onAuxClick={(e) => e.button === 1 && closeTerminal(terminal.id)}
      className={`group flex shrink-0 cursor-pointer items-center gap-2 rounded-full py-1 pr-1 pl-3 text-xs transition duration-300 ${
        active
          ? 'bg-surface-2 text-fg shadow-[inset_0_0_0_1px_var(--color-line)]'
          : 'text-muted hover:bg-surface-2/50 hover:text-fg'
      }`}
      title={`${terminal.projectName} · ${terminal.title}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <Icon size={13} className={terminal.kind === 'claude' ? 'text-accent' : ''} />
      <span className="max-w-48 truncate">
        <span className="font-semibold">{terminal.projectName}</span>
        <span className="opacity-60"> · {terminal.title}</span>
      </span>
      <button
        aria-label="close terminal"
        onClick={(e) => {
          e.stopPropagation()
          closeTerminal(terminal.id)
        }}
        className="grid h-5 w-5 place-items-center rounded-full opacity-0 transition group-hover:opacity-100 hover:bg-danger/20 hover:text-danger"
      >
        <X size={12} />
      </button>
    </div>
  )
}
