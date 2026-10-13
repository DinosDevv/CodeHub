import { useEffect, useState } from 'react'
import { errorMessage } from '../lib/errors'
import { onGitChanged } from '../lib/gitPanel'
import { getCommits, getRepoStatus, type Commit, type RepoStatus } from '../lib/projects'

/** Bumps whenever the app changes this repo (commit, push, stage…). */
function useGitVersion(path: string | null): number {
  const [version, setVersion] = useState(0)
  useEffect(() => {
    if (!path) return
    return onGitChanged((p) => p === path && setVersion((v) => v + 1))
  }, [path])
  return version
}

export function useRepoStatus(path: string | null): {
  status: RepoStatus | null
  error: string | null
} {
  const [status, setStatus] = useState<RepoStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const version = useGitVersion(path)

  useEffect(() => {
    if (!path) return
    let cancelled = false
    getRepoStatus(path)
      .then((s) => !cancelled && setStatus(s))
      .catch((e) => !cancelled && setError(errorMessage(e)))
    return () => {
      cancelled = true
    }
  }, [path, version])

  return { status, error }
}

export function useCommits(path: string | null, limit = 10): Commit[] | null {
  const [commits, setCommits] = useState<Commit[] | null>(null)
  const version = useGitVersion(path)

  useEffect(() => {
    if (!path) return
    let cancelled = false
    getCommits(path, limit)
      .then((c) => !cancelled && setCommits(c))
      .catch(() => !cancelled && setCommits([]))
    return () => {
      cancelled = true
    }
  }, [path, limit, version])

  return commits
}
