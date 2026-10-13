import { useCallback, useState } from 'react'
import { readPref, writePref } from '../lib/preferences'

/** useState that remembers its value on this machine (falls back quietly if storage fails). */
export function usePref<T>(key: string, fallback: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => readPref(key, fallback))
  const update = useCallback(
    (next: T) => {
      setValue(next)
      writePref(key, next)
    },
    [key]
  )
  return [value, update]
}
