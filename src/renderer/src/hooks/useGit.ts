import { useEffect, useState } from 'react'
import { errorMessage } from '../lib/errors'
import { getCommits, getRepoStatus, type Commit, type RepoStatus } from '../lib/projects'

export function useRepoStatus(path: string | null): {
  status: RepoStatus | null
  error: string | null
} {
  const [status, setStatus] = useState<RepoStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!path) return
    let cancelled = false
    getRepoStatus(path)
      .then((s) => !cancelled && setStatus(s))
      .catch((e) => !cancelled && setError(errorMessage(e)))
    return () => {
      cancelled = true
    }
  }, [path])

  return { status, error }
}

export function useCommits(path: string | null, limit = 10): Commit[] | null {
  const [commits, setCommits] = useState<Commit[] | null>(null)

  useEffect(() => {
    if (!path) return
    let cancelled = false
    getCommits(path, limit)
      .then((c) => !cancelled && setCommits(c))
      .catch(() => !cancelled && setCommits([]))
    return () => {
      cancelled = true
    }
  }, [path, limit])

  return commits
}
