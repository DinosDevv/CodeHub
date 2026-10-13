import { Eye, EyeOff, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { ProjectCard } from '../components/ProjectCard'
import { RootFolders } from '../components/RootFolders'
import { Button, Card, EmptyState, IconButton, PageHeader, SearchInput } from '../components/ui'
import { useProjects } from '../hooks/useProjects'
import { useRoots } from '../hooks/useRoots'
import type { Navigate } from '../lib/navigation'
import { filterProjects } from '../lib/projects'

export function Projects({ navigate }: { navigate: Navigate }): React.JSX.Element {
  const { projects, loading, scanning, scan } = useProjects()
  const { roots, add, remove } = useRoots()
  const [query, setQuery] = useState('')
  const [showHidden, setShowHidden] = useState(false)

  const visible = filterProjects(projects, query, showHidden)
  const hiddenCount = projects.filter((p) => p.archived).length

  const addAndScan = async (): Promise<void> => {
    if (await add()) await scan()
  }

  if (roots && roots.length === 0) {
    return (
      <>
        <PageHeader title="projects" subtitle="all the little worlds you're building" />
        <Card title="where do your projects live?" delay={60} className="max-w-xl">
          <p className="mb-4 text-sm text-muted">
            pick one or more folders (like your Desktop) and i&apos;ll find every git repo inside
            them.
          </p>
          <RootFolders roots={roots} onAdd={addAndScan} onRemove={remove} />
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="projects"
        subtitle={
          loading
            ? 'gathering your projects…'
            : `${projects.length - hiddenCount} little worlds you're building`
        }
        actions={
          <>
            <SearchInput value={query} onChange={setQuery} placeholder="search name or stack…" />
            {hiddenCount > 0 && (
              <IconButton
                label={showHidden ? 'hide tucked-away projects' : 'show tucked-away projects'}
                onClick={() => setShowHidden((v) => !v)}
              >
                {showHidden ? <EyeOff size={16} /> : <Eye size={16} />}
              </IconButton>
            )}
            <Button variant="ghost" onClick={() => scan()} disabled={scanning}>
              <RefreshCw size={16} className={scanning ? 'animate-spin' : ''} />
              {scanning ? 'scanning…' : 'rescan'}
            </Button>
          </>
        }
      />

      {!loading && visible.length === 0 ? (
        <Card delay={60}>
          <EmptyState>
            {projects.length === 0
              ? scanning
                ? 'looking around for repos…'
                : 'no git repos found in your folders yet.'
              : 'nothing matches that search.'}
          </EmptyState>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {visible.map((p, i) => (
            <ProjectCard
              key={p.id}
              project={p}
              delay={Math.min(i, 12) * 50}
              onOpen={() => navigate({ page: 'project', id: p.id })}
            />
          ))}
        </div>
      )}
    </>
  )
}
