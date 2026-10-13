import { useCallback, useEffect, useState } from 'react'
import { errorMessage } from '../lib/errors'
import { listProjects, scanProjects, type Project } from '../lib/projects'
import { toast } from '../lib/toast'

// Rescan once per app launch so the list stays fresh without manual clicks.
let scannedThisLaunch = false

export function useProjects(): {
  projects: Project[]
  loading: boolean
  scanning: boolean
  refresh: () => Promise<void>
  scan: () => Promise<void>
} {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(() => !scannedThisLaunch)

  const refresh = useCallback(
    () =>
      listProjects()
        .then(setProjects)
        .catch((e) => toast(errorMessage(e), 'error'))
        .finally(() => setLoading(false)),
    []
  )

  // Assumes `scanning` is already true; clears it when done.
  const runScan = useCallback(
    (quiet: boolean) =>
      scanProjects()
        .then(async ({ found, added }) => {
          await refresh()
          if (quiet && added === 0) return
          toast(
            added > 0
              ? `found ${added} new project${added === 1 ? '' : 's'} ✨`
              : `all ${found} projects up to date`,
            'success'
          )
        })
        .catch((e) => toast(errorMessage(e), 'error'))
        .finally(() => setScanning(false)),
    [refresh]
  )

  const scan = useCallback(() => {
    setScanning(true)
    return runScan(false)
  }, [runScan])

  useEffect(() => {
    refresh()
    if (!scannedThisLaunch) {
      scannedThisLaunch = true
      runScan(true)
    }
  }, [refresh, runScan])

  return { projects, loading, scanning, refresh, scan }
}
