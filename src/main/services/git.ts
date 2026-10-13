import { simpleGit } from 'simple-git'
import type { Commit, RepoStatus, SessionCommit } from '../../shared/api'

export async function getRepoStatus(path: string): Promise<RepoStatus> {
  const git = simpleGit(path)
  const [status, remotes] = await Promise.all([git.status(), git.getRemotes()])
  return {
    branch: status.current,
    ahead: status.ahead,
    behind: status.behind,
    changed: status.files.length,
    hasRemote: remotes.length > 0
  }
}

export async function getRecentCommits(path: string, limit: number): Promise<Commit[]> {
  try {
    const log = await simpleGit(path).log({ maxCount: limit })
    return log.all.map((c) => ({
      hash: c.hash,
      message: c.message,
      author: c.author_name,
      date: new Date(c.date).getTime()
    }))
  } catch {
    return [] // e.g. a fresh repo with no commits yet
  }
}

/** Commits made since `since` (ms), with line/file counts. */
export async function getCommitsSince(path: string, since: number): Promise<SessionCommit[]> {
  try {
    const log = await simpleGit(path).log({
      '--since': new Date(since).toISOString(),
      '--stat': null
    })
    return log.all.map((c) => ({
      hash: c.hash,
      message: c.message,
      author: c.author_name,
      date: new Date(c.date).getTime(),
      insertions: c.diff?.insertions ?? 0,
      deletions: c.diff?.deletions ?? 0,
      files: c.diff?.changed ?? 0
    }))
  } catch {
    return []
  }
}

export async function getLastCommitAt(path: string): Promise<number | null> {
  const [last] = await getRecentCommits(path, 1)
  return last?.date ?? null
}
