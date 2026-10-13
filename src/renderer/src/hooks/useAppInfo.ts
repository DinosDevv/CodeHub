import { useEffect, useState } from 'react'
import { getAppInfo, type AppInfo } from '../lib/app'

export function useAppInfo(): { info: AppInfo | null; error: string | null } {
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAppInfo()
      .then(setInfo)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  return { info, error }
}
