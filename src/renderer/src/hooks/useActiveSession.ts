import { useEffect, useState } from 'react'
import { getActiveSession, onSessionsChanged, type ActiveSession } from '../lib/sessions'

/** The running session (or null), kept live via main-process change events. */
export function useActiveSession(): { active: ActiveSession | null; loaded: boolean } {
  const [active, setActive] = useState<ActiveSession | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const load = (): void => {
      getActiveSession().then((s) => {
        setActive(s)
        setLoaded(true)
      })
    }
    load()
    return onSessionsChanged(load)
  }, [])

  return { active, loaded }
}
