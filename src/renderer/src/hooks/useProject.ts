import { useCallback, useEffect, useState } from 'react'
import { errorMessage } from '../lib/errors'
import { getProject, setProjectArchived, type Project } from '../lib/projects'
import { toast } from '../lib/toast'

export function useProject(id: number): {
  project: Project | null
  loading: boolean
  toggleArchived: () => Promise<void>
} {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(
    () =>
      getProject(id)
        .then(setProject)
        .catch((e) => toast(errorMessage(e), 'error'))
        .finally(() => setLoading(false)),
    [id]
  )

  useEffect(() => {
    load()
  }, [load])

  const toggleArchived = useCallback(async () => {
    if (!project) return
    await setProjectArchived(project.id, !project.archived)
    toast(project.archived ? `${project.name} is back on the list` : `${project.name} tucked away`)
    await load()
  }, [project, load])

  return { project, loading, toggleArchived }
}
