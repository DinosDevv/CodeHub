import { ArrowLeft, Code, Eye, EyeOff, FolderOpen, GitCommitHorizontal } from 'lucide-react'
import { ChangesPanel } from '../components/ChangesPanel'
import { ProjectSessions } from '../components/ProjectSessions'
import { ProjectTerminals } from '../components/ProjectTerminals'
import { RepoBadges } from '../components/RepoBadges'
import { TaskList } from '../components/TaskList'
import { Button, Card, Chip, EmptyState, PageHeader } from '../components/ui'
import { useCommits, useRepoStatus } from '../hooks/useGit'
import { useProject } from '../hooks/useProject'
import type { Navigate } from '../lib/navigation'
import { openFolder, openInVSCode, prettyPath } from '../lib/projects'
import { timeAgo } from '../lib/time'

export function ProjectDetail({
  id,
  navigate
}: {
  id: number
  navigate: Navigate
}): React.JSX.Element {
  const { project, loading, toggleArchived } = useProject(id)
  const path = project?.exists ? project.path : null
  const { status, error } = useRepoStatus(path)
  const commits = useCommits(path, 12)

  const back = (
    <button
      onClick={() => navigate({ page: 'projects' })}
      className="mb-4 flex animate-rise items-center gap-1.5 text-sm text-muted transition hover:text-accent"
    >
      <ArrowLeft size={16} /> all projects
    </button>
  )

  if (loading) return back
  if (!project) {
    return (
      <>
        {back}
        <Card>
          <EmptyState>this project wandered off.</EmptyState>
        </Card>
      </>
    )
  }

  return (
    <>
      {back}
      <PageHeader
        title={project.name}
        subtitle={prettyPath(project.path)}
        actions={
          <>
            <Button variant="ghost" onClick={toggleArchived}>
              {project.archived ? <Eye size={16} /> : <EyeOff size={16} />}
              {project.archived ? 'bring back' : 'tuck away'}
            </Button>
            <Button variant="ghost" disabled={!project.exists} onClick={() => openFolder(project)}>
              <FolderOpen size={16} /> folder
            </Button>
            <Button disabled={!project.exists} onClick={() => openInVSCode(project)}>
              <Code size={16} /> open in vs code
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5">
          <Card title="stack" delay={60}>
            {project.stack.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {project.stack.map((s) => (
                  <Chip key={s}>{s}</Chip>
                ))}
              </div>
            ) : (
              <EmptyState>couldn&apos;t tell what this one is made of.</EmptyState>
            )}
          </Card>
          {project.exists && <ProjectTerminals projectId={project.id} delay={90} />}
          <Card title="git" delay={120}>
            {project.exists ? (
              <div className="flex flex-col gap-3">
                <RepoBadges status={status} error={error} />
                {status && !status.hasRemote && (
                  <p className="text-xs text-muted">no remote yet — this one lives only here.</p>
                )}
              </div>
            ) : (
              <Chip tone="danger">folder missing</Chip>
            )}
          </Card>
          <ProjectSessions projectId={project.id} delay={180} />
        </div>

        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card title="tasks" delay={120}>
            <TaskList projectId={project.id} />
          </Card>
          {project.exists && <ChangesPanel path={project.path} delay={150} />}
          <Card title="recent commits" delay={180}>
            {commits === null ? (
              <EmptyState>reading history…</EmptyState>
            ) : commits.length === 0 ? (
              <EmptyState>no commits yet — a blank page.</EmptyState>
            ) : (
              <ol className="relative flex flex-col">
                {commits.map((c, i) => (
                  <li
                    key={c.hash}
                    style={{ animationDelay: `${150 + i * 40}ms` }}
                    className="flex animate-rise items-start gap-3 rounded-xl px-2 py-2 transition hover:bg-surface-2/40"
                  >
                    <GitCommitHorizontal size={16} className="mt-0.5 shrink-0 text-glow" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm select-text">{c.message}</p>
                      <p className="text-xs text-muted">
                        {c.author} · {timeAgo(c.date)} ·{' '}
                        <span className="font-mono">{c.hash.slice(0, 7)}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
