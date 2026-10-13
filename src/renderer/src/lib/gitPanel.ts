import type {
  ChangedFile,
  CommitOutcome,
  FileChangeKind,
  FileDiff,
  WorkingTree
} from '../../../shared/api'
import { errorMessage } from './errors'
import { toast } from './toast'

export type { ChangedFile, CommitOutcome, FileChangeKind, FileDiff, WorkingTree }

export const getWorkingTree = (path: string): Promise<WorkingTree> =>
  window.api.git.workingTree(path)
export const getFileDiff = (path: string, file: string, staged: boolean): Promise<FileDiff> =>
  window.api.git.diff(path, file, staged)
export const onGitChanged = (listener: (path: string) => void): (() => void) =>
  window.api.git.onChanged(listener)

/** Runs a git action, toasting failures. Resolves the result, or null on failure. */
async function attempt<T>(action: () => Promise<T>): Promise<T | null> {
  try {
    return await action()
  } catch (e) {
    toast(errorMessage(e), 'error')
    return null
  }
}

export const stage = (path: string, files: string[]): Promise<void | null> =>
  attempt(() => window.api.git.stage(path, files))

export const unstage = (path: string, files: string[]): Promise<void | null> =>
  attempt(() => window.api.git.unstage(path, files))

export async function commit(path: string, message: string): Promise<CommitOutcome | null> {
  const result = await attempt(() => window.api.git.commit(path, message))
  if (result) {
    toast(
      `committed ${result.hash.slice(0, 7)} · ${result.files} file${result.files === 1 ? '' : 's'} ✓`,
      'success'
    )
  }
  return result
}

export async function push(path: string): Promise<boolean> {
  const ok = (await attempt(() => window.api.git.push(path))) !== null
  if (ok) toast('pushed ↑ off it goes', 'success')
  return ok
}

export async function pull(path: string): Promise<boolean> {
  const ok = (await attempt(() => window.api.git.pull(path))) !== null
  if (ok) toast('pulled ↓ all caught up', 'success')
  return ok
}

export const fetchRemote = (path: string): Promise<void | null> =>
  attempt(() => window.api.git.fetch(path))

export const kindLabels: Record<FileChangeKind, { letter: string; tone: string; label: string }> = {
  modified: { letter: 'M', tone: 'text-warning', label: 'modified' },
  added: { letter: 'A', tone: 'text-success', label: 'added' },
  deleted: { letter: 'D', tone: 'text-danger', label: 'deleted' },
  renamed: { letter: 'R', tone: 'text-glow', label: 'renamed' },
  untracked: { letter: 'U', tone: 'text-success', label: 'new file' },
  conflicted: { letter: '!', tone: 'text-danger', label: 'conflict' }
}

/** "src/main/ipc.ts" → { dir: "src/main/", name: "ipc.ts" } */
export function splitPath(path: string): { dir: string; name: string } {
  const i = path.lastIndexOf('/')
  return i === -1 ? { dir: '', name: path } : { dir: path.slice(0, i + 1), name: path.slice(i + 1) }
}

export type DiffLineKind = 'add' | 'del' | 'hunk' | 'meta' | 'context'

export interface DiffLine {
  kind: DiffLineKind
  text: string
}

export function parseDiff(text: string): DiffLine[] {
  const lines: DiffLine[] = []
  for (const line of text.split('\n')) {
    if (/^(diff --git|index |--- |\+\+\+ |new file|deleted file|similarity|rename )/.test(line)) {
      continue // file headers: the panel already shows which file this is
    }
    if (line.startsWith('@@')) lines.push({ kind: 'hunk', text: line })
    else if (line.startsWith('+')) lines.push({ kind: 'add', text: line.slice(1) })
    else if (line.startsWith('-')) lines.push({ kind: 'del', text: line.slice(1) })
    else if (line.startsWith('\\')) lines.push({ kind: 'meta', text: line })
    else lines.push({ kind: 'context', text: line.slice(1) })
  }
  while (
    lines.length &&
    lines[lines.length - 1].kind === 'context' &&
    !lines[lines.length - 1].text
  )
    lines.pop()
  return lines
}
