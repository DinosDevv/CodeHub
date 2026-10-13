import { useCallback, useEffect, useState } from 'react'
import { getIdleMinutes, setIdleMinutes } from '../lib/sessions'

export function useIdleMinutes(): {
  minutes: number | null
  save: (minutes: number) => Promise<void>
} {
  const [minutes, setMinutes] = useState<number | null>(null)

  useEffect(() => {
    getIdleMinutes().then(setMinutes)
  }, [])

  const save = useCallback(async (value: number) => {
    setMinutes(await setIdleMinutes(value))
  }, [])

  return { minutes, save }
}
