import { Pause, Play, Square } from 'lucide-react'
import { useActiveSession } from '../hooks/useActiveSession'
import { useNow } from '../hooks/useNow'
import { useTasks } from '../hooks/useTasks'
import type { Navigate } from '../lib/navigation'
import { openStartDialog, openWrapUpDialog } from '../lib/sessionDialogs'
import {
  activeElapsedMs,
  formatClock,
  pauseLabels,
  pauseSession,
  resumeSession
} from '../lib/sessions'
import { FocusStrip } from './FocusStrip'
import { IconButton } from './ui'

/** Lives in the sidebar: the session clock and its controls. */
export function SessionBar({ navigate }: { navigate: Navigate }): React.JSX.Element | null {
  const { active, loaded } = useActiveSession()
  const now = useNow(1000)
  const doing = useTasks(
    active ? { projectId: active.projectId, statuses: ['doing'], limit: 1 } : null
  )
  const focusTask = doing?.[0] ?? null

  if (!loaded) return null

  if (!active) {
    return (
      <button
        onClick={() => openStartDialog()}
        className="group mb-3 flex w-full items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-3 text-sm font-semibold text-muted transition duration-300 hover:border-accent/60 hover:text-accent"
      >
        <Play size={16} className="transition group-hover:scale-110" />
        start a session
      </button>
    )
  }

  const paused = active.pausedAt !== null
  return (
    <div
      className={`mb-3 animate-rise rounded-2xl border p-4 transition duration-500 ${
        paused
          ? 'border-line/70 bg-surface-2/40'
          : 'border-accent/30 bg-accent/5 shadow-[0_0_30px_-12px_var(--color-accent)]'
      }`}
    >
      <button
        onClick={() => navigate({ page: 'project', id: active.projectId })}
        className="flex w-full items-center gap-2 text-left"
      >
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            paused ? 'bg-muted' : 'animate-breathe bg-accent shadow-[0_0_10px_var(--color-accent)]'
          }`}
        />
        <span className="truncate text-sm font-semibold hover:text-accent">
          {active.projectName}
        </span>
      </button>
      {focusTask && (
        <p className="mt-1 truncate pl-4 text-xs text-muted" title={focusTask.title}>
          ↳ {focusTask.title}
        </p>
      )}
      <p
        className={`mt-1 font-display text-3xl font-light tabular-nums ${paused ? 'text-muted' : ''}`}
      >
        {formatClock(activeElapsedMs(active, now.getTime()))}
      </p>
      {paused && active.pauseReason && active.pauseReason !== 'break' && (
        <p className="mt-0.5 text-xs text-muted italic">{pauseLabels[active.pauseReason]}</p>
      )}
      <FocusStrip compact />
      <div className="mt-3 flex gap-2">
        {paused ? (
          <IconButton label="resume" onClick={() => resumeSession()}>
            <Play size={14} />
          </IconButton>
        ) : (
          <IconButton label="pause" onClick={() => pauseSession()}>
            <Pause size={14} />
          </IconButton>
        )}
        <IconButton label="wrap up session" onClick={() => openWrapUpDialog()}>
          <Square size={13} />
        </IconButton>
      </div>
    </div>
  )
}
