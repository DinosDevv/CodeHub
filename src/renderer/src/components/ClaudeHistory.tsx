import { History, Sparkles } from 'lucide-react'
import { useClaudeHistory, useClaudeLive } from '../hooks/useClaude'
import { claudeStates, resumeClaude } from '../lib/claude'
import { formatDuration } from '../lib/sessions'
import { timeAgo } from '../lib/time'
import { Card, EmptyState } from './ui'

/** Project page card: earlier Claude conversations here, with a way back into them. */
export function ClaudeHistory({
  projectId,
  delay
}: {
  projectId: number
  delay: number
}): React.JSX.Element {
  const history = useClaudeHistory(projectId)
  const live = useClaudeLive()

  return (
    <Card title="claude history" delay={delay}>
      {history === null ? null : history.length === 0 ? (
        <EmptyState>
          no claude conversations here yet — they show up once claude code is connected.
        </EmptyState>
      ) : (
        <ul className="-mx-2 flex flex-col gap-1">
          {history.map((s) => {
            const now = live.find((l) => l.sessionId === s.sessionId)
            const state = now ? claudeStates[now.state] : null
            return (
              <li key={s.sessionId} className="group rounded-2xl px-2 py-2 hover:bg-surface-2/40">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs whitespace-nowrap text-muted">
                  {state ? (
                    <span className={`h-1.5 w-1.5 rounded-full ${state.dot}`} />
                  ) : (
                    <Sparkles size={12} className="text-accent/70" />
                  )}
                  <span>{timeAgo(s.lastAt)}</span>
                  <span>· {formatDuration(s.lastAt - s.startedAt)}</span>
                  {s.waits > 0 && <span>· needed you {s.waits}×</span>}
                  {state && <span className={`font-semibold ${state.text}`}>· {state.label}</span>}
                  <div className="flex-1" />
                  {!now && s.resumeId && (
                    <button
                      onClick={() => resumeClaude(projectId, s.resumeId!)}
                      title="reopen this conversation in a new claude tab"
                      className="flex items-center gap-1 rounded-full px-2 py-0.5 opacity-0 transition group-hover:opacity-100 hover:bg-accent/15 hover:text-accent"
                    >
                      <History size={12} /> resume
                    </button>
                  )}
                </div>
                <ul className="mt-1 flex flex-col gap-0.5 pl-4">
                  {s.prompts.slice(0, 3).map((p, i) => (
                    <li key={i} className="truncate text-sm select-text" title={p}>
                      {p}
                    </li>
                  ))}
                  {s.prompts.length > 3 && (
                    <li className="text-xs text-muted">+{s.prompts.length - 3} more</li>
                  )}
                </ul>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
