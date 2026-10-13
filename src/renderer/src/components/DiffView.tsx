import { X } from 'lucide-react'
import { parseDiff, type FileDiff } from '../lib/gitPanel'

const lineStyles = {
  add: 'bg-success/10 text-success',
  del: 'bg-danger/10 text-danger',
  hunk: 'text-glow/80 mt-1',
  meta: 'text-muted italic',
  context: 'text-fg/70'
}

const gutter = { add: '+', del: '−', hunk: '', meta: '', context: ' ' }

export function DiffView({
  file,
  staged,
  diff,
  onClose
}: {
  file: string
  staged: boolean
  diff: FileDiff | null
  onClose: () => void
}): React.JSX.Element {
  const lines = diff && !diff.binary ? parseDiff(diff.text) : []

  return (
    <div className="mt-3 animate-rise overflow-hidden rounded-2xl border border-line/60 bg-bg/50">
      <div className="flex items-center justify-between gap-3 border-b border-line/50 px-4 py-2">
        <p className="truncate font-mono text-xs">
          {file} <span className="text-muted">· {staged ? 'staged' : 'working copy'}</span>
        </p>
        <button
          aria-label="close diff"
          onClick={onClose}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-fg"
        >
          <X size={13} />
        </button>
      </div>
      <div className="max-h-96 overflow-auto py-2 font-mono text-xs leading-relaxed select-text">
        {diff === null ? (
          <p className="px-4 text-muted italic">reading diff…</p>
        ) : diff.binary ? (
          <p className="px-4 text-muted italic">binary file — no text diff.</p>
        ) : lines.length === 0 ? (
          <p className="px-4 text-muted italic">no text changes (maybe just file mode).</p>
        ) : (
          <>
            {lines.map((l, i) => (
              <div key={i} className={`flex px-4 whitespace-pre ${lineStyles[l.kind]}`}>
                <span className="w-4 shrink-0 opacity-60 select-none">{gutter[l.kind]}</span>
                <span>{l.text || ' '}</span>
              </div>
            ))}
            {diff.truncated && (
              <p className="px-4 pt-2 text-muted italic">…diff too long, cut off here.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
