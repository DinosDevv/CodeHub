import { Play } from 'lucide-react'
import { useState } from 'react'
import { useProjects } from '../hooks/useProjects'
import { readPref, writePref } from '../lib/preferences'
import { filterProjects, openInVSCode, prettyPath } from '../lib/projects'
import { closeSessionDialog } from '../lib/sessionDialogs'
import { startSession } from '../lib/sessions'
import { toast } from '../lib/toast'
import { Modal } from './Modal'
import { Button, EmptyState, SearchInput } from './ui'

const OPEN_VSCODE_PREF = 'startSession.openVSCode'

export function StartSessionDialog({
  initialProjectId
}: {
  initialProjectId: number | null
}): React.JSX.Element {
  const { projects, loading } = useProjects()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(initialProjectId)
  const [openVSCode, setOpenVSCode] = useState(() => readPref(OPEN_VSCODE_PREF, true))
  const [starting, setStarting] = useState(false)

  const choices = filterProjects(projects, query, false).filter((p) => p.exists)
  const selected = projects.find((p) => p.id === selectedId) ?? null

  const start = async (): Promise<void> => {
    if (!selected) return
    setStarting(true)
    writePref(OPEN_VSCODE_PREF, openVSCode)
    const session = await startSession(selected.id)
    setStarting(false)
    if (!session) return
    closeSessionDialog()
    toast(`session started on ${selected.name} — have a good one ☕`, 'success')
    if (openVSCode) await openInVSCode(selected)
  }

  return (
    <Modal title="what are we working on?" onClose={closeSessionDialog}>
      <SearchInput value={query} onChange={setQuery} placeholder="find a project…" />
      <ul className="mt-4 flex max-h-72 flex-col gap-1 overflow-auto pr-1">
        {loading ? (
          <EmptyState>gathering your projects…</EmptyState>
        ) : choices.length === 0 ? (
          <EmptyState>no projects match.</EmptyState>
        ) : (
          choices.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => setSelectedId(p.id)}
                onDoubleClick={() => {
                  setSelectedId(p.id)
                  start()
                }}
                className={`flex w-full flex-col rounded-2xl border px-4 py-2.5 text-left transition duration-300 ${
                  p.id === selectedId
                    ? 'border-accent/50 bg-accent/10 shadow-[0_0_20px_-8px_var(--color-accent)]'
                    : 'border-transparent hover:bg-surface-2/60'
                }`}
              >
                <span className="text-sm font-semibold">{p.name}</span>
                <span className="font-mono text-xs text-muted">{prettyPath(p.path)}</span>
              </button>
            </li>
          ))
        )}
      </ul>
      <div className="mt-5 flex items-center justify-between gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={openVSCode}
            onChange={(e) => setOpenVSCode(e.target.checked)}
            className="accent-(--color-accent)"
          />
          open in vs code too
        </label>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={closeSessionDialog}>
            not yet
          </Button>
          <Button onClick={start} disabled={!selected || starting}>
            <Play size={16} /> start
          </Button>
        </div>
      </div>
    </Modal>
  )
}
