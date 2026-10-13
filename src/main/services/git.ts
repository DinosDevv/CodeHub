import { simpleGit } from 'simple-git'
import type { Commit, RepoStatus } from '../../shared/api'

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

export async function getLastCommitAt(path: string): Promise<number | null> {
  const [last] = await getRecentCommits(path, 1)
  return last?.date ?? null
}
