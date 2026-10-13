import { Code, FolderOpen } from 'lucide-react'
import { useRepoStatus } from '../hooks/useGit'
import { openFolder, openInVSCode, prettyPath, type Project } from '../lib/projects'
import { timeAgo } from '../lib/time'
import { RepoBadges } from './RepoBadges'
import { Chip, IconButton } from './ui'

export function ProjectCard({
  project,
  onOpen,
  delay
}: {
  project: Project
  onOpen: () => void
  delay: number
}): React.JSX.Element {
  const { status, error } = useRepoStatus(project.exists ? project.path : null)

  return (
    <article
      onClick={onOpen}
      style={{ animationDelay: `${delay}ms` }}
      className={`group flex animate-rise cursor-pointer flex-col gap-3 rounded-card border border-line/60 bg-surface/55 p-5 backdrop-blur-xl transition duration-500 hover:-translate-y-1 hover:border-glow/30 hover:shadow-[0_12px_40px_-14px_var(--color-glow)] ${
        project.archived ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold transition group-hover:text-accent">
            {project.name}
          </h3>
          <p className="truncate font-mono text-xs text-muted">{prettyPath(project.path)}</p>
        </div>
        <div
          className="flex shrink-0 gap-1.5 opacity-60 transition group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <IconButton
            label="open in vs code"
            disabled={!project.exists}
            onClick={() => openInVSCode(project)}
          >
            <Code size={16} />
          </IconButton>
          <IconButton
            label="open folder"
            disabled={!project.exists}
            onClick={() => openFolder(project)}
          >
            <FolderOpen size={16} />
          </IconButton>
        </div>
      </div>

      {project.stack.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {project.stack.slice(0, 4).map((s) => (
            <Chip key={s}>{s}</Chip>
          ))}
          {project.stack.length > 4 && <Chip>+{project.stack.length - 4}</Chip>}
        </div>
      )}

      <div className="mt-auto flex items-end justify-between gap-3 pt-1">
        {project.exists ? (
          <RepoBadges status={status} error={error} />
        ) : (
          <Chip tone="danger">folder missing</Chip>
        )}
        {project.lastCommitAt && (
          <span className="shrink-0 text-xs text-muted">{timeAgo(project.lastCommitAt)}</span>
        )}
      </div>
    </article>
  )
}
