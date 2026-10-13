import { useCallback, useEffect, useState } from 'react'
import {
  getFocusSettings,
  getFocusStatus,
  liveFocus,
  onFocusChanged,
  saveFocusSettings,
  type FocusSettings,
  type FocusStatus,
  type LiveFocus
} from '../lib/focus'
import { onSessionsChanged } from '../lib/sessions'
import { useNow } from './useNow'

/** The focus rhythm, ticking every second (null until loaded). */
export function useFocus(): LiveFocus | null {
  const [status, setStatus] = useState<FocusStatus | null>(null)
  const now = useNow(1000)

  useEffect(() => {
    let cancelled = false
    const load = (): void => {
      getFocusStatus().then((s) => !cancelled && setStatus(s))
    }
    load()
    // Resync now and then, and whenever the session or rhythm changes.
    const id = setInterval(load, 30_000)
    const offFocus = onFocusChanged(load)
    const offSessions = onSessionsChanged(load)
    return () => {
      cancelled = true
      clearInterval(id)
      offFocus()
      offSessions()
    }
  }, [])

  return status ? liveFocus(status, now.getTime()) : null
}

export function useFocusSettings(): {
  settings: FocusSettings | null
  save: (patch: Partial<FocusSettings>) => Promise<void>
} {
  const [settings, setSettings] = useState<FocusSettings | null>(null)

  useEffect(() => {
    getFocusSettings().then(setSettings)
  }, [])

  const save = useCallback(
    async (patch: Partial<FocusSettings>) => {
      if (!settings) return
      const saved = await saveFocusSettings({ ...settings, ...patch })
      if (saved) setSettings(saved)
    },
    [settings]
  )

  return { settings, save }
}
