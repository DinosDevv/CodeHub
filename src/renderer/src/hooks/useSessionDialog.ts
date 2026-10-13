import { useSyncExternalStore } from 'react'
import { getSessionDialog, subscribeSessionDialog, type SessionDialog } from '../lib/sessionDialogs'

export function useSessionDialog(): SessionDialog {
  return useSyncExternalStore(subscribeSessionDialog, getSessionDialog)
}
