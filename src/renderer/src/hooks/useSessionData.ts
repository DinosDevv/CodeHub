import { useEffect, useState } from 'react'
import {
  getSessionStats,
  listSessions,
  onSessionsChanged,
  type SessionRecord,
  type SessionStats
} from '../lib/sessions'

/** Dashboard numbers; refreshes on session changes and once a minute for the live session. */
export function useSessionStats(): SessionStats | null {
  const [stats, setStats] = useState<SessionStats | null>(null)

  useEffect(() => {
    const load = (): void => {
      getSessionStats().then(setStats)
    }
    load()
    const id = setInterval(load, 60_000)
    const unsubscribe = onSessionsChanged(load)
    return () => {
      clearInterval(id)
      unsubscribe()
    }
  }, [])

  return stats
}

export function useProjectSessions(projectId: number, limit = 8): SessionRecord[] | null {
  const [sessions, setSessions] = useState<SessionRecord[] | null>(null)

  useEffect(() => {
    const load = (): void => {
      listSessions(projectId, limit).then(setSessions)
    }
    load()
    return onSessionsChanged(load)
  }, [projectId, limit])

  return sessions
}
