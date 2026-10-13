import {
  FolderGit2,
  LayoutDashboard,
  Settings,
  SquareTerminal,
  type LucideIcon
} from 'lucide-react'
import { useDock, useTerminals } from '../hooks/useTerminals'
import { toggleDock } from '../lib/dock'
import type { Navigate, Route } from '../lib/navigation'
import { SessionBar } from './SessionBar'

type NavPage = 'dashboard' | 'projects' | 'settings'

const items: { page: NavPage; label: string; icon: LucideIcon }[] = [
  { page: 'dashboard', label: 'home', icon: LayoutDashboard },
  { page: 'projects', label: 'projects', icon: FolderGit2 }
]

function activeSection(route: Route): NavPage {
  return route.page === 'project' ? 'projects' : route.page
}

export function Sidebar({
  route,
  navigate
}: {
  route: Route
  navigate: Navigate
}): React.JSX.Element {
  const current = activeSection(route)
  const dock = useDock()
  const terminals = useTerminals()
  const running = terminals.filter((t) => t.exitCode === null).length

  const navButton = (target: NavPage, label: string, Icon: LucideIcon): React.JSX.Element => {
    const active = current === target
    return (
      <button
        key={target}
        onClick={() => navigate({ page: target })}
        className={`group relative flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition duration-300 ${
          active ? 'bg-surface-2/80 text-fg' : 'text-muted hover:bg-surface-2/40 hover:text-fg'
        }`}
      >
        <span
          className={`absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_12px_var(--color-accent)] transition duration-300 ${
            active ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <Icon
          size={18}
          className={`transition duration-300 ${active ? 'text-accent' : 'group-hover:text-glow'}`}
        />
        {label}
      </button>
    )
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line/50 bg-surface/40 p-4 backdrop-blur-xl">
      <div className="mb-8 flex items-center gap-3 px-2 pt-2">
        <div className="grid h-10 w-10 animate-breathe place-items-center rounded-2xl bg-gradient-to-br from-accent to-glow font-mono text-sm font-bold text-accent-fg shadow-[0_0_24px_-4px_var(--color-accent)]">
          {'</>'}
        </div>
        <div>
          <div className="text-lg leading-tight font-bold">codehub</div>
          <div className="text-xs text-muted">your cozy corner</div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {items.map((i) => navButton(i.page, i.label, i.icon))}
      </nav>
      <SessionBar navigate={navigate} />
      <button
        onClick={toggleDock}
        title="terminal (Ctrl+`)"
        className={`group mb-1 flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition duration-300 ${
          dock.open ? 'bg-surface-2/80 text-fg' : 'text-muted hover:bg-surface-2/40 hover:text-fg'
        }`}
      >
        <SquareTerminal
          size={18}
          className={`transition duration-300 ${dock.open ? 'text-accent' : 'group-hover:text-glow'}`}
        />
        terminal
        {running > 0 && (
          <span className="ml-auto rounded-full bg-accent/15 px-2 py-0.5 font-mono text-xs text-accent">
            {running}
          </span>
        )}
      </button>
      {navButton('settings', 'settings', Settings)}
    </aside>
  )
}
