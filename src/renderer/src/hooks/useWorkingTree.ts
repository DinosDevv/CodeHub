import { useCallback, useEffect, useState } from 'react'
import { errorMessage } from '../lib/errors'
import {
  getFileDiff,
  getWorkingTree,
  onGitChanged,
  type FileDiff,
  type WorkingTree
} from '../lib/gitPanel'

/**
 * Live working tree for a repo: reloads after actions in the app, and when the
 * window regains focus (you may have committed from VS Code or the terminal).
 */
export function useWorkingTree(path: string | null): {
  tree: WorkingTree | null
  error: string | null
  reload: () => void
} {
  const [tree, setTree] = useState<WorkingTree | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    if (!path) return
    let cancelled = false
    getWorkingTree(path)
      .then((t) => {
        if (cancelled) return
        setTree(t)
        setError(null)
      })
      .catch((e) => !cancelled && setError(errorMessage(e)))
    return () => {
      cancelled = true
    }
  }, [path, version])

  useEffect(() => {
    if (!path) return
    const unsubscribe = onGitChanged((p) => p === path && reload())
    window.addEventListener('focus', reload)
    return () => {
      unsubscribe()
      window.removeEventListener('focus', reload)
    }
  }, [path, reload])

  return { tree, error, reload }
}

export interface DiffTarget {
  file: string
  staged: boolean
}

export function useFileDiff(
  path: string,
  target: DiffTarget | null,
  version: unknown
): FileDiff | null {
  const [diff, setDiff] = useState<{ key: string; diff: FileDiff } | null>(null)
  const key = target ? `${target.staged}:${target.file}` : null

  useEffect(() => {
    if (!target) return
    let cancelled = false
    const k = `${target.staged}:${target.file}`
    getFileDiff(path, target.file, target.staged)
      .then((d) => !cancelled && setDiff({ key: k, diff: d }))
      .catch(
        () => !cancelled && setDiff({ key: k, diff: { text: '', truncated: false, binary: false } })
      )
    return () => {
      cancelled = true
    }
    // `version` makes the diff refresh when the working tree reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key, version])

  return diff && diff.key === key ? diff.diff : null
}
