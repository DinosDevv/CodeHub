import { useCallback, useEffect, useState } from 'react'
import { errorMessage } from '../lib/errors'
import { addRoot, getRoots, removeRoot } from '../lib/projects'
import { toast } from '../lib/toast'

export function useRoots(): {
  roots: string[] | null
  add: () => Promise<boolean>
  remove: (root: string) => Promise<void>
} {
  const [roots, setRoots] = useState<string[] | null>(null)

  useEffect(() => {
    getRoots()
      .then(setRoots)
      .catch((e) => toast(errorMessage(e), 'error'))
  }, [])

  /** Resolves true when a new folder was actually added. */
  const add = useCallback(async () => {
    const before = roots?.length ?? 0
    const next = await addRoot()
    setRoots(next)
    return next.length > before
  }, [roots])

  const remove = useCallback(async (root: string) => {
    setRoots(await removeRoot(root))
  }, [])

  return { roots, add, remove }
}
