import { GitCommitHorizontal, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useActiveSession } from '../hooks/useActiveSession'
import { useNow } from '../hooks/useNow'
import { errorMessage } from '../lib/errors'
import { closeSessionDialog } from '../lib/sessionDialogs'
import { activeElapsedMs, formatDuration, stopSession, type SessionSummary } from '../lib/sessions'
import { toast } from '../lib/toast'
import { Modal } from './Modal'
import { Button, Chip, EmptyState } from './ui'

export function WrapUpDialog(): React.JSX.Element | null {
  const { active, loaded } = useActiveSession()
  const now = useNow(1000)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState<SessionSummary | null>(null)

  // Session ended elsewhere (or never existed): nothing to wrap up.
  const nothingToWrap = loaded && !active && !summary
  useEffect(() => {
    if (nothingToWrap) closeSessionDialog()
  }, [nothingToWrap])

  if (summary) return <SummaryView summary={summary} />
  if (!active) return null

  const wrapUp = async (): Promise<void> => {
    setSaving(true)
    try {
      setSummary(await stopSession(note))
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="wrapping up?" onClose={closeSessionDialog}>
      <p className="text-sm text-muted">
        {formatDuration(activeElapsedMs(active, now.getTime()))} on{' '}
        <span className="font-semibold text-fg">{active.projectName}</span>
      </p>
      <label className="mt-4 block text-sm font-semibold text-muted">
        a note for future you
        <textarea
          autoFocus
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          placeholder="where you left off, what's next, what was weird…"
          className="mt-2 w-full resize-none rounded-2xl border border-line/70 bg-bg/40 px-4 py-3 text-sm font-normal text-fg transition duration-300 outline-none select-text placeholder:text-muted/60 focus:border-glow/50 focus:shadow-[0_0_20px_-8px_var(--color-glow)]"
        />
      </label>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={closeSessionDialog}>
          keep going
        </Button>
        <Button onClick={wrapUp} disabled={saving}>
          <Moon size={16} /> {saving ? 'saving…' : 'wrap up'}
        </Button>
      </div>
    </Modal>
  )
}

function SummaryView({ summary }: { summary: SessionSummary }): React.JSX.Element {
  const insertions = summary.commits.reduce((n, c) => n + c.insertions, 0)
  const deletions = summary.commits.reduce((n, c) => n + c.deletions, 0)

  return (
    <Modal title="nice session ✨" onClose={closeSessionDialog}>
      <div className="flex items-end gap-3">
        <p className="font-mono text-4xl font-light">{formatDuration(summary.durationMs)}</p>
        <p className="pb-1 text-sm text-muted">on {summary.projectName}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <Chip tone="glow">
          {summary.commits.length} commit{summary.commits.length === 1 ? '' : 's'}
        </Chip>
        {insertions > 0 && <Chip tone="success">+{insertions}</Chip>}
        {deletions > 0 && <Chip tone="danger">−{deletions}</Chip>}
      </div>

      <div className="mt-4 max-h-56 overflow-auto">
        {summary.commits.length === 0 ? (
          <EmptyState>no commits this time — thinking counts too.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-1">
            {summary.commits.map((c) => (
              <li key={c.hash} className="flex items-start gap-2 text-sm">
                <GitCommitHorizontal size={16} className="mt-0.5 shrink-0 text-glow" />
                <span className="flex-1 truncate">{c.message}</span>
                <span className="shrink-0 font-mono text-xs text-muted">
                  +{c.insertions} −{c.deletions}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {summary.note && (
        <p className="mt-4 rounded-2xl border border-line/50 bg-bg/30 px-4 py-3 text-sm text-muted italic">
          “{summary.note}”
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <Button onClick={closeSessionDialog}>rest well</Button>
      </div>
    </Modal>
  )
}
