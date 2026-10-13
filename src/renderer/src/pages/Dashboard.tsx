import { Waves } from 'lucide-react'
import { ClaudeNow } from '../components/ClaudeNow'
import { OpenTasks } from '../components/OpenTasks'
import { TodayHero } from '../components/TodayHero'
import { Card, Collapsible, EmptyState, PageHeader } from '../components/ui'
import { useActiveSession } from '../hooks/useActiveSession'
import { useClaudeLive, useHooksStatus } from '../hooks/useClaude'
import { useNow } from '../hooks/useNow'
import { usePref } from '../hooks/usePref'
import { useSessionStats } from '../hooks/useSessionData'
import { greeting } from '../lib/greeting'
import type { Navigate } from '../lib/navigation'
import { formatDuration, sessionDateLabel } from '../lib/sessions'

export function Dashboard({ navigate }: { navigate: Navigate }): React.JSX.Element {
  const now = useNow()
  const stats = useSessionStats()
  const { active } = useActiveSession()
  const hooks = useHooksStatus()
  const liveClaude = useClaudeLive()
  const [weekOpen, setWeekOpen] = usePref('home.weekOpen', false)

  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const maxProjectMs = stats?.byProject[0]?.ms ?? 0
  // Claude only earns space when it's doing something (or still needs connecting).
  const showClaude = hooks.status !== null && (!hooks.status.installed || liveClaude.length > 0)

  return (
    <>
      <PageHeader
        title={greeting(now)}
        subtitle={
          !active
            ? `it's ${time} — the water's calm, settle in`
            : active.pausedAt
              ? `it's ${time} — ${active.projectName} is waiting for you`
              : `it's ${time} — you're deep in ${active.projectName}`
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <TodayHero navigate={navigate} />

        <OpenTasks
          navigate={navigate}
          className={showClaude ? 'lg:col-span-2' : 'lg:col-span-3'}
          delay={120}
        />
        {showClaude && <ClaudeNow navigate={navigate} delay={160} />}

        <div className="lg:col-span-3">
          <Collapsible
            title="this week"
            open={weekOpen}
            onToggle={() => setWeekOpen(!weekOpen)}
            summary={
              stats &&
              `${formatDuration(stats.weekMs)} · ${stats.streakDays} day${
                stats.streakDays === 1 ? '' : 's'
              } streak`
            }
          >
            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
              <Card title="by project" className="lg:col-span-2">
                {!stats || stats.byProject.length === 0 ? (
                  <EmptyState>
                    no sessions this week yet — the first one&apos;s the coziest.
                  </EmptyState>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {stats.byProject.map((p) => (
                      <li key={p.projectId}>
                        <button
                          onClick={() => navigate({ page: 'project', id: p.projectId })}
                          className="group w-full text-left"
                        >
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="font-semibold transition group-hover:text-accent">
                              {p.projectName}
                            </span>
                            <span className="font-display text-muted">{formatDuration(p.ms)}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-surface-2/70">
                            <div
                              style={{ width: `${Math.max(2, (p.ms / maxProjectMs) * 100)}%` }}
                              className="h-full rounded-full bg-gradient-to-r from-deep to-accent"
                            />
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card title="recent sessions">
                <div className="mb-4 flex gap-6 border-b border-line/40 pb-4">
                  <div>
                    <p className="text-xs text-muted">this week</p>
                    <p className="font-display text-2xl">{formatDuration(stats?.weekMs ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">streak</p>
                    <p className="font-display text-2xl">
                      {stats?.streakDays ?? 0}
                      <span className="text-sm text-muted">
                        {' '}
                        {stats?.streakDays === 1 ? 'day' : 'days'}
                      </span>
                    </p>
                  </div>
                </div>
                {!stats || stats.recent.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <Waves size={16} className="text-accent" /> nothing yet.
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2.5">
                    {stats.recent.map((s) => (
                      <li key={s.id} className="text-sm">
                        <div className="flex justify-between gap-2">
                          <span className="truncate font-semibold">{s.projectName}</span>
                          <span className="shrink-0 font-display text-muted">
                            {formatDuration(s.durationMs)}
                          </span>
                        </div>
                        <p className="truncate text-xs text-muted">
                          {sessionDateLabel(s.startedAt)}
                          {s.note && ` · ${s.note}`}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </Collapsible>
        </div>
      </div>
    </>
  )
}
