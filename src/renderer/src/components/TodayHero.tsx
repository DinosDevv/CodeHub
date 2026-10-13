import { FolderOpen, Pause, Play, Sparkles, Square } from 'lucide-react'
import { useActiveSession } from '../hooks/useActiveSession'
import { useClaudeLive } from '../hooks/useClaude'
import { useNow } from '../hooks/useNow'
import { useSessionStats } from '../hooks/useSessionData'
import { useTasks } from '../hooks/useTasks'
import { useTide } from '../hooks/useTide'
import { claudeStates } from '../lib/claude'
import type { Navigate } from '../lib/navigation'
import { openStartDialog, openWrapUpDialog } from '../lib/sessionDialogs'
import {
  activeElapsedMs,
  formatClock,
  formatDuration,
  pauseLabels,
  pauseSession,
  resumeSession
} from '../lib/sessions'
import { timeAgo } from '../lib/time'
import { Button } from './ui'

/** The big card on the home page: what you're doing now, or where you left off. */
export function TodayHero({ navigate }: { navigate: Navigate }): React.JSX.Element {
  const { active } = useActiveSession()
  const stats = useSessionStats()
  const now = useNow(1000)
  const last = stats?.recent[0] ?? null
  const projectId = active?.projectId ?? last?.projectId ?? null

  const nextTasks = useTasks(
    projectId !== null ? { projectId, statuses: ['doing', 'todo'], limit: 1 } : null
  )
  const nextTask = nextTasks?.[0] ?? null
  const claude = useClaudeLive().find((c) => c.projectId === projectId) ?? null

  return (
    <section className="relative animate-rise overflow-hidden rounded-[1.75rem] border border-line/50 bg-surface/45 p-8 shadow-[0_20px_70px_-30px_rgb(0_0_0/0.8)] backdrop-blur-xl lg:col-span-3">
      <div className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-accent/10 blur-[80px]" />

      {active ? (
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <p className="text-sm text-muted">
              {active.pausedAt && active.pauseReason
                ? pauseLabels[active.pauseReason]
                : 'out on the water with'}
            </p>
            <button
              onClick={() => navigate({ page: 'project', id: active.projectId })}
              className="font-display block truncate text-left text-4xl font-semibold transition hover:text-accent"
            >
              {active.projectName}
            </button>
            {nextTask && <p className="mt-2 truncate text-sm text-muted">↳ {nextTask.title}</p>}
            {claude && (
              <p
                className={`mt-1 flex items-center gap-1.5 text-sm ${claudeStates[claude.state].text}`}
              >
                <Sparkles size={14} /> claude · {claudeStates[claude.state].label}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-3">
            <p
              className={`font-display text-6xl leading-none font-light tabular-nums ${
                active.pausedAt ? 'text-muted' : 'text-fg'
              }`}
            >
              {formatClock(activeElapsedMs(active, now.getTime()))}
            </p>
            <div className="flex gap-2">
              {active.pausedAt ? (
                <Button onClick={() => resumeSession()}>
                  <Play size={16} /> resume
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => pauseSession()}>
                  <Pause size={16} /> pause
                </Button>
              )}
              <Button variant="ghost" onClick={() => openWrapUpDialog()}>
                <Square size={14} /> wrap up
              </Button>
            </div>
          </div>
        </div>
      ) : last ? (
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <p className="text-sm text-muted">pick up where you left off</p>
            <button
              onClick={() => navigate({ page: 'project', id: last.projectId })}
              className="font-display block truncate text-left text-4xl font-semibold transition hover:text-accent"
            >
              {last.projectName}
            </button>
            <p className="mt-1 text-sm text-muted">
              {timeAgo(last.endedAt)} · {formatDuration(last.durationMs)}
            </p>
            {last.note && (
              <p className="font-display mt-3 max-w-xl text-lg text-fg/85 italic">“{last.note}”</p>
            )}
            {nextTask && (
              <p className="mt-2 truncate text-sm text-muted">next up · {nextTask.title}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => openStartDialog()}>
              something else
            </Button>
            <Button onClick={() => openStartDialog(last.projectId)}>
              <Play size={16} /> continue
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm text-muted">the tide is out</p>
            <p className="font-display text-4xl font-semibold">ready when you are</p>
            <p className="mt-2 text-sm text-muted">
              start a session and watch the water rise as you work.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate({ page: 'projects' })}>
              <FolderOpen size={16} /> projects
            </Button>
            <Button onClick={() => openStartDialog()}>
              <Play size={16} /> start a session
            </Button>
          </div>
        </div>
      )}

      <TideMeter />
    </section>
  )
}

function TideMeter(): React.JSX.Element {
  const { todayMs, goalHours, level } = useTide()
  return (
    <div className="relative mt-7">
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="text-muted">today&apos;s tide</span>
        <span>
          <span className="font-display text-lg">{formatDuration(todayMs)}</span>
          <span className="text-muted"> of {goalHours}h</span>
          {level >= 1 && <span className="ml-2 text-glow">high tide ☾</span>}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-bg/60">
        <div
          className="h-full rounded-full bg-gradient-to-r from-deep via-accent/80 to-accent shadow-[0_0_14px_var(--color-accent)] transition-[width] duration-[2000ms] ease-out"
          style={{ width: `${Math.max(level * 100, 1.5)}%` }}
        />
      </div>
    </div>
  )
}
