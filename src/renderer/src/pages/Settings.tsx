import { RootFolders } from '../components/RootFolders'
import { Card, PageHeader } from '../components/ui'
import { useAppInfo } from '../hooks/useAppInfo'
import { useIdleMinutes } from '../hooks/useIdleMinutes'
import { useRoots } from '../hooks/useRoots'
import { scanProjects } from '../lib/projects'
import { toast } from '../lib/toast'

export function Settings(): React.JSX.Element {
  const { info, error } = useAppInfo()
  const { roots, add, remove } = useRoots()
  const idle = useIdleMinutes()

  const addAndScan = async (): Promise<void> => {
    if (!(await add())) return
    const { added } = await scanProjects()
    toast(`found ${added} new project${added === 1 ? '' : 's'} ✨`, 'success')
  }

  return (
    <>
      <PageHeader title="settings" subtitle="tweak your corner" />
      <div className="flex max-w-3xl flex-col gap-5">
        <Card title="project folders" delay={60}>
          <p className="mb-4 text-sm text-muted">
            i look for git repos inside these folders (up to 4 levels deep).
          </p>
          {roots && <RootFolders roots={roots} onAdd={addAndScan} onRemove={remove} />}
        </Card>
        <Card title="sessions" delay={120}>
          <label className="flex items-center gap-3 text-sm text-muted">
            pause the timer after
            {idle.minutes !== null && (
              <input
                type="number"
                min={1}
                max={120}
                defaultValue={idle.minutes}
                onBlur={(e) => idle.save(Number(e.target.value) || idle.minutes!)}
                className="w-16 rounded-full border border-line/70 bg-surface/50 px-3 py-1 text-center font-mono text-fg outline-none focus:border-glow/50"
              />
            )}
            minutes without keyboard or mouse
          </label>
          <p className="mt-2 text-xs text-muted">
            it picks back up on its own when you return. the idle minutes don&apos;t count.
          </p>
        </Card>
        <Card title="about" delay={180}>
          {error && <p className="text-sm text-danger">{error}</p>}
          {info && (
            <dl className="grid grid-cols-[10rem_1fr] gap-y-2 text-sm">
              <dt className="text-muted">version</dt>
              <dd>{info.version}</dd>
              <dt className="text-muted">database</dt>
              <dd className="font-mono text-xs break-all select-text">{info.dbPath}</dd>
              <dt className="text-muted">schema version</dt>
              <dd>{info.schemaVersion}</dd>
              <dt className="text-muted">tables</dt>
              <dd className="font-mono text-xs">{info.tables.join(', ')}</dd>
            </dl>
          )}
        </Card>
      </div>
    </>
  )
}
