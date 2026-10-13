import {
  ArrowLeft,
  Code,
  Eye,
  EyeOff,
  FolderOpen,
  GitCommitHorizontal,
  ListTodo,
  Sparkles,
  GitPullRequestArrow
} from 'lucide-react'
import { ChangesPanel } from '../components/ChangesPanel'
import { ClaudeHistory } from '../components/ClaudeHistory'
import { ProjectSessions } from '../components/ProjectSessions'
import { ProjectTerminals } from '../components/ProjectTerminals'
import { RepoBadges } from '../components/RepoBadges'
import { Tabs, type TabItem } from '../components/Tabs'
import { TaskList } from '../components/TaskList'
import { Button, Card, Chip, EmptyState } from '../components/ui'
import { useClaudeLive } from '../hooks/useClaude'
import { useCommits, useRepoStatus } from '../hooks/useGit'
import { usePref } from '../hooks/usePref'
import { useProject } from '../hooks/useProject'
import { claudeStates } from '../lib/claude'
import type { Navigate } from '../lib/navigation'
import { openFolder, openInVSCode, prettyPath } from '../lib/projects'
import { timeAgo } from '../lib/time'

type ProjectTab = 'overview' | 'changes' | 'claude'

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
  const claude = useClaudeLive().find((c) => c.projectId === id) ?? null
  const [tab, setTab] = usePref<ProjectTab>(`project.${id}.tab`, 'overview')

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

  const tabs: TabItem<ProjectTab>[] = [
    { id: 'overview', label: 'overview', icon: <ListTodo size={15} /> },
    {
      id: 'changes',
      label: 'changes',
      icon: <GitPullRequestArrow size={15} />,
      badge: status?.changed
    },
    {
      id: 'claude',
      label: 'claude',
      icon: <Sparkles size={15} />,
      dot: claude ? claudeStates[claude.state].dot : undefined
    }
  ]

  return (
    <>
      {back}

      {/* calm header: who this project is, at a glance */}
      <header className="mb-6 flex animate-rise flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 flex-1 basis-80">
          <h1 className="font-display text-4xl font-semibold tracking-tight">{project.name}</h1>
          <p className="mt-1 truncate text-sm text-muted" title={project.path}>
            {prettyPath(project.path)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {project.stack.map((s) => (
              <Chip key={s}>{s}</Chip>
            ))}
            {project.stack.length > 0 && <span className="mx-1 h-4 w-px bg-line/60" />}
            {project.exists ? (
              <RepoBadges status={status} error={error} />
            ) : (
              <Chip tone="danger">folder missing</Chip>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
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
        </div>
      </header>

      <Tabs items={tabs} value={tab} onChange={setTab} />

      {/* key replays the gentle entrance when switching tabs */}
      <div key={tab}>
        {tab === 'overview' && (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
            <Card title="tasks" className="lg:col-span-2" delay={0}>
              <TaskList projectId={project.id} />
            </Card>
            <div className="flex flex-col gap-6">
              {project.exists && <ProjectTerminals projectId={project.id} delay={60} />}
              <ProjectSessions projectId={project.id} delay={120} />
            </div>
          </div>
        )}

        {tab === 'changes' && (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {project.exists ? (
                <ChangesPanel path={project.path} delay={0} />
              ) : (
                <Card>
                  <EmptyState>the folder is missing, so there&apos;s nothing to commit.</EmptyState>
                </Card>
              )}
            </div>
            <Card title="recent commits" delay={60}>
              {commits === null ? (
                <EmptyState>reading history…</EmptyState>
              ) : commits.length === 0 ? (
                <EmptyState>no commits yet — a blank page.</EmptyState>
              ) : (
                <ol className="-mx-2 flex flex-col">
                  {commits.map((c) => (
                    <li
                      key={c.hash}
                      className="flex items-start gap-2.5 rounded-xl px-2 py-1.5 transition hover:bg-surface-2/40"
                    >
                      <GitCommitHorizontal size={15} className="mt-0.5 shrink-0 text-glow" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm select-text" title={c.message}>
                          {c.message}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {timeAgo(c.date)} ·{' '}
                          <span className="font-mono">{c.hash.slice(0, 7)}</span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        )}

        {tab === 'claude' && <ClaudeHistory projectId={project.id} delay={0} limit={20} />}
      </div>
    </>
  )
}
