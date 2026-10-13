import { GitCommitHorizontal, Play } from 'lucide-react'
import { useActiveSession } from '../hooks/useActiveSession'
import { useProjectSessions } from '../hooks/useSessionData'
import { openStartDialog } from '../lib/sessionDialogs'
import { formatDuration, sessionDateLabel } from '../lib/sessions'
import { Button, Card, EmptyState } from './ui'

export function ProjectSessions({
  projectId,
  delay
}: {
  projectId: number
  delay: number
}): React.JSX.Element {
  const sessions = useProjectSessions(projectId)
  const { active } = useActiveSession()
  const runningHere = active?.projectId === projectId

  return (
    <Card title="sessions" delay={delay}>
      {!active && (
        <Button className="mb-4" onClick={() => openStartDialog(projectId)}>
          <Play size={16} /> start a session here
        </Button>
      )}
      {runningHere && (
        <p className="mb-4 text-sm text-accent">a session is running here right now ☕</p>
      )}
      {sessions === null ? null : sessions.length === 0 ? (
        <EmptyState>no sessions yet.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {sessions.map((s) => (
            <li key={s.id} className="text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted">{sessionDateLabel(s.startedAt)}</span>
                <span className="font-mono">{formatDuration(s.durationMs)}</span>
              </div>
              {s.commitCount > 0 && (
                <p className="flex items-center gap-1 text-xs text-glow">
                  <GitCommitHorizontal size={12} /> {s.commitCount} commit
                  {s.commitCount === 1 ? '' : 's'}
                </p>
              )}
              {s.note && <p className="mt-0.5 text-xs text-muted italic select-text">{s.note}</p>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
