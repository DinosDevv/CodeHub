import {
  ArrowDown,
  ArrowUp,
  GitBranch,
  GitCommitHorizontal,
  Minus,
  Plus,
  RefreshCw,
  Sparkles
} from 'lucide-react'
import { useState } from 'react'
import { useFileDiff, useWorkingTree, type DiffTarget } from '../hooks/useWorkingTree'
import {
  commit,
  draftCommitMessage,
  fetchRemote,
  kindLabels,
  pull,
  push,
  splitPath,
  stage,
  unstage,
  type ChangedFile
} from '../lib/gitPanel'
import { DiffView } from './DiffView'
import { Button, Card, Chip, EmptyState, IconButton } from './ui'

type Busy = 'stage' | 'commit' | 'push' | 'pull' | 'fetch' | 'draft' | null

/** Stage files, commit, push and pull — without leaving the project page. */
export function ChangesPanel({ path, delay }: { path: string; delay: number }): React.JSX.Element {
  const { tree, error } = useWorkingTree(path)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState<Busy>(null)
  const [target, setTarget] = useState<DiffTarget | null>(null)
  const diff = useFileDiff(path, target, tree)

  const run = async <T,>(kind: Busy, action: () => Promise<T>): Promise<T> => {
    setBusy(kind)
    try {
      return await action()
    } finally {
      setBusy(null)
    }
  }

  const draft = async (): Promise<void> => {
    const suggestion = await run('draft', () => draftCommitMessage(path))
    if (suggestion) setMessage(suggestion)
  }

  const doCommit = async (): Promise<void> => {
    if (!message.trim() || !tree?.staged.length) return
    const result = await run('commit', () => commit(path, message))
    if (result) {
      setMessage('')
      setTarget(null)
    }
  }

  if (error) {
    return (
      <Card title="changes" delay={delay}>
        <Chip tone="danger">git unavailable</Chip>
        <p className="mt-2 text-xs text-muted">{error}</p>
      </Card>
    )
  }

  if (!tree) {
    return (
      <Card title="changes" delay={delay}>
        <EmptyState>looking at your working tree…</EmptyState>
      </Card>
    )
  }

  const canPush = tree.hasRemote && tree.hasCommits && (tree.ahead > 0 || !tree.upstream)
  const nothingChanged = tree.staged.length === 0 && tree.unstaged.length === 0

  return (
    <Card title="changes" delay={delay}>
      {/* branch + remote */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chip tone="glow">
          <GitBranch size={12} /> {tree.branch ?? 'detached'}
        </Chip>
        {tree.upstream ? (
          <span className="text-xs text-muted">↔ {tree.upstream}</span>
        ) : tree.hasRemote ? (
          <span className="text-xs text-muted">not pushed yet</span>
        ) : (
          <span className="text-xs text-muted">no remote</span>
        )}
        <div className="flex-1" />
        {tree.hasRemote && (
          <>
            <IconButton
              label="check the remote for new commits"
              disabled={busy !== null}
              onClick={() => run('fetch', () => fetchRemote(path))}
            >
              <RefreshCw size={14} className={busy === 'fetch' ? 'animate-spin' : ''} />
            </IconButton>
            <Button
              variant="ghost"
              disabled={busy !== null || !tree.upstream}
              onClick={() => run('pull', () => pull(path))}
            >
              <ArrowDown size={15} /> pull{tree.behind > 0 && ` ${tree.behind}`}
            </Button>
            <Button
              variant={canPush ? 'primary' : 'ghost'}
              disabled={busy !== null || !canPush}
              onClick={() => run('push', () => push(path))}
            >
              <ArrowUp size={15} />
              {busy === 'push' ? 'pushing…' : `push${tree.ahead > 0 ? ` ${tree.ahead}` : ''}`}
            </Button>
          </>
        )}
      </div>

      {nothingChanged ? (
        <EmptyState>working tree clean — nothing to commit ✨</EmptyState>
      ) : (
        <>
          <FileGroup
            title="staged"
            files={tree.staged}
            staged
            target={target}
            disabled={busy !== null}
            onSelect={setTarget}
            onToggle={(files) => run('stage', () => unstage(path, files))}
            bulkLabel="unstage all"
          />
          <FileGroup
            title="changes"
            files={tree.unstaged}
            staged={false}
            target={target}
            disabled={busy !== null}
            onSelect={setTarget}
            onToggle={(files) => run('stage', () => stage(path, files))}
            bulkLabel="stage all"
          />

          {target && (
            <DiffView
              file={target.file}
              staged={target.staged}
              diff={diff}
              onClose={() => setTarget(null)}
            />
          )}

          {/* commit box */}
          <div className="mt-4 rounded-2xl border border-line/40 bg-bg/30 p-2 transition duration-300 focus-within:border-glow/50 focus-within:shadow-[0_0_20px_-8px_var(--color-glow)]">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  e.preventDefault()
                  doCommit()
                }
              }}
              rows={message.includes('\n') ? 5 : 2}
              disabled={busy === 'draft'}
              placeholder={
                busy === 'draft'
                  ? 'claude is reading your changes…'
                  : 'what did you change? (Ctrl+Enter to commit)'
              }
              className="w-full resize-none bg-transparent px-2 py-1 text-sm text-fg outline-none select-text placeholder:text-muted/60"
            />
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-xs text-muted">
                {tree.staged.length === 0
                  ? 'stage some files first'
                  : `${tree.staged.length} file${tree.staged.length === 1 ? '' : 's'} staged`}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  disabled={busy !== null || tree.staged.length === 0}
                  onClick={draft}
                  title="claude drafts a message from your staged changes"
                >
                  <Sparkles
                    size={15}
                    className={`text-accent ${busy === 'draft' ? 'animate-spin' : ''}`}
                  />
                  {busy === 'draft' ? 'writing…' : 'write it'}
                </Button>
                <Button
                  disabled={busy !== null || !message.trim() || tree.staged.length === 0}
                  onClick={doCommit}
                >
                  <GitCommitHorizontal size={15} />
                  {busy === 'commit' ? 'committing…' : 'commit'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}

function FileGroup({
  title,
  files,
  staged,
  target,
  disabled,
  onSelect,
  onToggle,
  bulkLabel
}: {
  title: string
  files: ChangedFile[]
  staged: boolean
  target: DiffTarget | null
  disabled: boolean
  onSelect: (target: DiffTarget) => void
  onToggle: (files: string[]) => void
  bulkLabel: string
}): React.JSX.Element | null {
  if (files.length === 0) return null

  return (
    <section className="mb-3">
      <div className="mb-1 flex items-center justify-between px-2">
        <h3 className="text-xs font-semibold text-muted">
          {title} <span className="opacity-60">· {files.length}</span>
        </h3>
        <button
          disabled={disabled}
          onClick={() => onToggle(files.map((f) => f.path))}
          className="text-xs text-muted transition hover:text-glow disabled:opacity-40"
        >
          {bulkLabel}
        </button>
      </div>
      <ul className="flex max-h-64 flex-col overflow-auto">
        {files.map((f) => {
          const { dir, name } = splitPath(f.path)
          const kind = kindLabels[f.kind]
          const selected = target?.file === f.path && target.staged === staged
          return (
            <li
              key={f.path}
              onClick={() => onSelect({ file: f.path, staged })}
              className={`group flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1 transition duration-200 ${
                selected ? 'bg-glow/10' : 'hover:bg-surface-2/50'
              }`}
              title={`${kind.label}: ${f.path}${f.from ? ` (from ${f.from})` : ''}`}
            >
              <span className={`w-4 shrink-0 text-center font-mono text-xs font-bold ${kind.tone}`}>
                {kind.letter}
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-xs">
                <span className="text-muted">{dir}</span>
                <span className={f.kind === 'deleted' ? 'line-through opacity-70' : ''}>
                  {name}
                </span>
              </span>
              {(f.insertions !== null || f.deletions !== null) && (
                <span className="shrink-0 font-mono text-[11px]">
                  {!!f.insertions && <span className="text-success">+{f.insertions}</span>}{' '}
                  {!!f.deletions && <span className="text-danger">−{f.deletions}</span>}
                </span>
              )}
              <button
                aria-label={staged ? `unstage ${f.path}` : `stage ${f.path}`}
                title={staged ? 'unstage' : 'stage'}
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggle([f.path])
                }}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-muted opacity-0 transition group-hover:opacity-100 hover:bg-glow/15 hover:text-glow disabled:opacity-30"
              >
                {staged ? <Minus size={13} /> : <Plus size={13} />}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
