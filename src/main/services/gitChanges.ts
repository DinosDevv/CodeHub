import { readFile } from 'fs/promises'
import { join } from 'path'
import { simpleGit, type SimpleGit } from 'simple-git'
import { sendToWindows } from '../events'
import type {
  ChangedFile,
  CommitOutcome,
  FileChangeKind,
  FileDiff,
  WorkingTree
} from '../../shared/api'

const MAX_DIFF = 300 * 1024

// simple-git strips git-related environment variables (GIT_*, EDITOR, PAGER, …)
// unless they're allow-listed. We keep only the sign-in helpers from your own
// environment (so SSH-key and askpass setups keep working) plus our prompt switch.
const KEEP_ENV = ['GIT_ASKPASS', 'SSH_ASKPASS', 'GIT_SSH', 'GIT_SSH_COMMAND']
const GUARDED_ENV = new Set(['EDITOR', 'VISUAL', 'PAGER', 'PREFIX', 'SSH_ASKPASS'])

function gitEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [k, v] of Object.entries(process.env)) {
    const key = k.toUpperCase()
    const guarded = key.startsWith('GIT_') || GUARDED_ENV.has(key)
    if (v !== undefined && (!guarded || KEEP_ENV.includes(key))) env[k] = v
  }
  // Never let git wait for a password on a terminal nobody can see. Sign-in
  // still works through Git Credential Manager, which opens its own window.
  env.GIT_TERMINAL_PROMPT = '0'
  return env
}

function repo(path: string): SimpleGit {
  return simpleGit(path, {
    timeout: { block: 120_000 },
    allowEnvironment: [...KEEP_ENV, 'GIT_TERMINAL_PROMPT'],
    unsafe: { allowUnsafeAskPass: true, allowUnsafeSshCommand: true }
  }).env(gitEnv())
}

function changed(path: string): void {
  sendToWindows('git:changed', path)
}

async function hasHead(git: SimpleGit): Promise<boolean> {
  try {
    await git.revparse(['--verify', 'HEAD'])
    return true
  } catch {
    return false
  }
}

/** `git diff --numstat` → path → [insertions, deletions] (null for binary). */
async function numstat(
  git: SimpleGit,
  cached: boolean
): Promise<Map<string, [number | null, number | null]>> {
  const map = new Map<string, [number | null, number | null]>()
  try {
    const out = await git.raw([
      'diff',
      '--numstat',
      '--no-renames',
      ...(cached ? ['--cached'] : [])
    ])
    for (const line of out.split('\n')) {
      const [ins, del, ...rest] = line.split('\t')
      if (!rest.length) continue
      map.set(rest.join('\t'), [ins === '-' ? null : Number(ins), del === '-' ? null : Number(del)])
    }
  } catch {
    // e.g. --cached in a repo without commits on old git versions
  }
  return map
}

function kindOf(code: string): FileChangeKind {
  switch (code) {
    case 'A':
      return 'added'
    case 'D':
      return 'deleted'
    case 'R':
    case 'C':
      return 'renamed'
    case '?':
      return 'untracked'
    case 'U':
      return 'conflicted'
    default:
      return 'modified'
  }
}

const CONFLICT_CODES = new Set(['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU'])

export async function getWorkingTree(path: string): Promise<WorkingTree> {
  const git = repo(path)
  const [status, remotes, hasCommits, stagedStats, unstagedStats] = await Promise.all([
    git.status(['--untracked-files=all']),
    git.getRemotes(),
    hasHead(git),
    numstat(git, true),
    numstat(git, false)
  ])

  const staged: ChangedFile[] = []
  const unstaged: ChangedFile[] = []
  const file = (
    p: string,
    kind: FileChangeKind,
    stats: Map<string, [number | null, number | null]>,
    from?: string
  ): ChangedFile => {
    const [insertions, deletions] = stats.get(p) ?? [null, null]
    return { path: p, from, kind, insertions, deletions }
  }

  for (const f of status.files) {
    const code = f.index + f.working_dir
    if (CONFLICT_CODES.has(code)) {
      unstaged.push(file(f.path, 'conflicted', unstagedStats))
      continue
    }
    if (f.index === '?') {
      unstaged.push(file(f.path, 'untracked', unstagedStats))
      continue
    }
    if (f.index.trim()) staged.push(file(f.path, kindOf(f.index), stagedStats, f.from))
    if (f.working_dir.trim()) unstaged.push(file(f.path, kindOf(f.working_dir), unstagedStats))
  }

  const byPath = (a: ChangedFile, b: ChangedFile): number => a.path.localeCompare(b.path)
  return {
    branch: status.current,
    upstream: status.tracking,
    ahead: status.ahead,
    behind: status.behind,
    hasRemote: remotes.length > 0,
    hasCommits,
    staged: staged.sort(byPath),
    unstaged: unstaged.sort(byPath)
  }
}

export async function getFileDiff(path: string, file: string, staged: boolean): Promise<FileDiff> {
  const git = repo(path)
  let text: string

  const tracked = (await git.raw(['ls-files', '--', file])).trim() !== ''
  if (!tracked && !staged) {
    // Untracked: show the whole file as added.
    const content = await readFile(join(path, file)).catch(() => Buffer.alloc(0))
    if (content.includes(0)) return { text: '', truncated: false, binary: true }
    text = content
      .toString('utf8')
      .split('\n')
      .map((l) => `+${l}`)
      .join('\n')
  } else {
    text = await git.raw(['diff', ...(staged ? ['--cached'] : []), '--', file])
    if (/^Binary files /m.test(text)) return { text: '', truncated: false, binary: true }
  }

  const truncated = text.length > MAX_DIFF
  return { text: truncated ? text.slice(0, MAX_DIFF) : text, truncated, binary: false }
}

function assertFiles(files: string[]): void {
  if (!files.length) throw new Error('No files given.')
  // Paths come straight from `git status`; refuse anything that looks like an option.
  if (files.some((f) => !f || f.startsWith('-'))) throw new Error('Invalid file path.')
}

export async function stageFiles(path: string, files: string[]): Promise<void> {
  assertFiles(files)
  await repo(path).raw(['add', '-A', '--', ...files])
  changed(path)
}

export async function unstageFiles(path: string, files: string[]): Promise<void> {
  assertFiles(files)
  const git = repo(path)
  if (await hasHead(git)) await git.raw(['restore', '--staged', '--', ...files])
  else await git.raw(['rm', '--cached', '-r', '-q', '--', ...files]) // nothing to restore from yet
  changed(path)
}

export async function commitStaged(path: string, message: string): Promise<CommitOutcome> {
  const clean = message.trim()
  if (!clean) throw new Error('Write a commit message first.')
  const git = repo(path)
  const tree = await getWorkingTree(path)
  if (tree.staged.length === 0) throw new Error('Nothing is staged.')
  if (tree.unstaged.some((f) => f.kind === 'conflicted')) {
    throw new Error('Resolve the merge conflicts first.')
  }

  const result = await git.commit(clean)
  changed(path)
  return {
    hash: result.commit,
    files: result.summary.changes,
    insertions: result.summary.insertions,
    deletions: result.summary.deletions
  }
}

/** Turns git's push/pull errors into something readable. */
function friendly(e: unknown, action: 'push' | 'pull' | 'fetch'): Error {
  const msg = e instanceof Error ? e.message : String(e)
  if (/fetch first|non-fast-forward|rejected/i.test(msg)) {
    return new Error('The remote has commits you don’t have yet — pull first.')
  }
  if (/not possible to fast-forward|diverg/i.test(msg)) {
    return new Error(
      'Your branch and the remote have both moved on. Merge or rebase in the terminal.'
    )
  }
  if (/would be overwritten/i.test(msg)) {
    return new Error('Pulling would overwrite your uncommitted changes. Commit them first.')
  }
  if (/authentication|could not read username|permission denied|403/i.test(msg)) {
    return new Error(`Git couldn’t sign in to ${action}. Check your git credentials.`)
  }
  if (/could not resolve host|unable to access|timed out/i.test(msg)) {
    return new Error('Couldn’t reach the remote. Are you online?')
  }
  return new Error(msg.split('\n').find((l) => l.trim()) ?? `git ${action} failed.`)
}

async function defaultRemote(git: SimpleGit): Promise<string> {
  const remotes = await git.getRemotes()
  if (!remotes.length) throw new Error('This repo has no remote to push to.')
  return remotes.find((r) => r.name === 'origin')?.name ?? remotes[0].name
}

export async function pushBranch(path: string): Promise<void> {
  const git = repo(path)
  try {
    const status = await git.status()
    if (!status.current) throw new Error('Not on a branch.')
    if (status.tracking) await git.push()
    else await git.push(['-u', await defaultRemote(git), status.current])
  } catch (e) {
    throw friendly(e, 'push')
  } finally {
    changed(path)
  }
}

export async function pullBranch(path: string): Promise<void> {
  const git = repo(path)
  try {
    await git.pull(['--ff-only'])
  } catch (e) {
    throw friendly(e, 'pull')
  } finally {
    changed(path)
  }
}

export async function fetchRemote(path: string): Promise<void> {
  const git = repo(path)
  try {
    if ((await git.getRemotes()).length) await git.fetch(['--quiet'])
  } catch (e) {
    throw friendly(e, 'fetch')
  } finally {
    changed(path)
  }
}
