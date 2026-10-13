import { ArrowDown, ArrowUp, CircleDot, GitBranch } from 'lucide-react'
import type { RepoStatus } from '../lib/projects'
import { Chip } from './ui'

export function RepoBadges({
  status,
  error
}: {
  status: RepoStatus | null
  error?: string | null
}): React.JSX.Element {
  if (error) return <Chip tone="danger">git unavailable</Chip>
  if (!status) return <span className="h-5 w-24 animate-breathe rounded-full bg-surface-2/70" />

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Chip tone="glow">
        <GitBranch size={12} /> {status.branch ?? 'detached'}
      </Chip>
      {status.changed > 0 && (
        <Chip tone="warning">
          <CircleDot size={12} /> {status.changed} changed
        </Chip>
      )}
      {status.ahead > 0 && (
        <Chip tone="accent">
          <ArrowUp size={12} /> {status.ahead} to push
        </Chip>
      )}
      {status.behind > 0 && (
        <Chip tone="accent">
          <ArrowDown size={12} /> {status.behind} to pull
        </Chip>
      )}
      {status.changed === 0 && status.ahead === 0 && status.behind === 0 && (
        <Chip tone="success">clean</Chip>
      )}
    </div>
  )
}
