import { RootFolders } from '../components/RootFolders'
import { Card, PageHeader } from '../components/ui'
import { useAppInfo } from '../hooks/useAppInfo'
import { useRoots } from '../hooks/useRoots'
import { scanProjects } from '../lib/projects'
import { toast } from '../lib/toast'

export function Settings(): React.JSX.Element {
  const { info, error } = useAppInfo()
  const { roots, add, remove } = useRoots()

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
        <Card title="about" delay={120}>
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
