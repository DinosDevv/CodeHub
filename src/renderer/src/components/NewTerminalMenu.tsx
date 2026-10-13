import { Plus, Sparkles, SquareTerminal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useProjects } from '../hooks/useProjects'
import { useTerminalSupport } from '../hooks/useTerminals'
import { showClaudeHint } from '../lib/dock'
import { filterProjects, type Project } from '../lib/projects'
import { openTerminal } from '../lib/terminals'
import { SearchInput } from './ui'

/** The "+" in the dock: pick a project, then a shell or Claude. */
export function NewTerminalMenu({
  contextProjectId
}: {
  contextProjectId: number | null
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        aria-label="new terminal"
        title="new terminal"
        onClick={() => setOpen((v) => !v)}
        className={`grid h-7 w-7 place-items-center rounded-full text-muted transition hover:bg-glow/15 hover:text-glow ${
          open ? 'bg-glow/15 text-glow' : ''
        }`}
      >
        <Plus size={15} />
      </button>
      {open && <MenuBody contextProjectId={contextProjectId} onDone={() => setOpen(false)} />}
    </div>
  )
}

function MenuBody({
  contextProjectId,
  onDone
}: {
  contextProjectId: number | null
  onDone: () => void
}): React.JSX.Element {
  const { projects } = useProjects()
  const support = useTerminalSupport()
  const [query, setQuery] = useState('')

  const usable = projects.filter((p) => p.exists && !p.archived)
  const context = usable.find((p) => p.id === contextProjectId) ?? null
  const others = filterProjects(usable, query, false).filter((p) => p.id !== context?.id)

  const open = (project: Project, kind: 'shell' | 'claude'): void => {
    onDone()
    if (kind === 'claude' && support && !support.claude) {
      showClaudeHint(true)
      return
    }
    openTerminal({ projectId: project.id, kind })
  }

  const row = (p: Project, highlight = false): React.JSX.Element => (
    <li
      key={p.id}
      className={`flex items-center gap-2 rounded-xl px-3 py-1.5 ${
        highlight ? 'bg-accent/10' : 'hover:bg-surface-2/60'
      }`}
    >
      <span className="flex-1 truncate text-sm">{p.name}</span>
      <button
        onClick={() => open(p, 'shell')}
        title="shell"
        className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-muted transition hover:bg-glow/15 hover:text-glow"
      >
        <SquareTerminal size={13} /> shell
      </button>
      <button
        onClick={() => open(p, 'claude')}
        title="claude code"
        className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-muted transition hover:bg-accent/15 hover:text-accent"
      >
        <Sparkles size={13} /> claude
      </button>
    </li>
  )

  return (
    <div className="absolute bottom-full left-0 z-30 mb-2 w-80 animate-rise rounded-2xl border border-line/70 bg-surface/95 p-3 shadow-[0_-12px_50px_-16px_rgb(0_0_0/0.8)] backdrop-blur-2xl">
      {context && (
        <>
          <p className="mb-1 px-3 text-xs font-semibold text-muted">here</p>
          <ul className="mb-3">{row(context, true)}</ul>
        </>
      )}
      <SearchInput value={query} onChange={setQuery} placeholder="another project…" />
      <ul className="mt-2 max-h-56 overflow-auto">{others.map((p) => row(p))}</ul>
    </div>
  )
}
