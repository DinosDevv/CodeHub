import { Sparkles } from 'lucide-react'
import { useClaudeLive, useHooksStatus } from '../hooks/useClaude'
import { useNow } from '../hooks/useNow'
import { claudeStates, focusClaude } from '../lib/claude'
import type { Navigate } from '../lib/navigation'
import { timeAgo } from '../lib/time'
import { Card, EmptyState } from './ui'

/** Dashboard card: every Claude Code session running right now, and what it's doing. */
export function ClaudeNow({
  navigate,
  className = '',
  delay
}: {
  navigate: Navigate
  className?: string
  delay: number
}): React.JSX.Element | null {
  const live = useClaudeLive()
  const { status } = useHooksStatus()
  const now = useNow(15_000)

  if (!status) return null

  return (
    <Card title="claude right now" className={className} delay={delay}>
      {!status.installed ? (
        <div className="flex items-center justify-between gap-3">
          <EmptyState>connect claude code to see what it&apos;s up to, live.</EmptyState>
          <button
            onClick={() => navigate({ page: 'settings' })}
            className="shrink-0 text-sm font-semibold text-accent transition hover:brightness-110"
          >
            connect →
          </button>
        </div>
      ) : live.length === 0 ? (
        <EmptyState>no claude sessions right now — the tide is out.</EmptyState>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {live.map((l) => {
            const s = claudeStates[l.state]
            return (
              <li key={l.sessionId}>
                <button
                  onClick={() => focusClaude(l, navigate)}
                  className="flex w-full items-start gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-surface-2/50"
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm">
                      <Sparkles size={13} className="shrink-0 text-accent" />
                      <span className="truncate font-semibold">
                        {l.projectName ?? l.cwd.split(/[\\/]/).pop()}
                      </span>
                      <span className={`shrink-0 text-xs font-semibold ${s.text}`}>{s.label}</span>
                    </span>
                    {l.message && (
                      <span className="block truncate text-xs text-muted">{l.message}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {timeAgo(l.updatedAt, now.getTime())}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
