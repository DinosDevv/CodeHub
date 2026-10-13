import { useEffect, useState } from 'react'
import { listTasks, onTasksChanged, type Task, type TaskQuery } from '../lib/tasks'

/** Tasks matching `query`, kept live. Pass null to skip loading. */
export function useTasks(query: TaskQuery | null): Task[] | null {
  const [tasks, setTasks] = useState<Task[] | null>(null)
  // Query objects are recreated every render; key the effect on their content.
  const key = query ? JSON.stringify(query) : null

  useEffect(() => {
    if (key === null) return
    const parsed = JSON.parse(key) as TaskQuery
    let cancelled = false
    const load = (): void => {
      listTasks(parsed).then((t) => !cancelled && setTasks(t))
    }
    load()
    const unsubscribe = onTasksChanged(load)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [key])

  return key === null ? null : tasks
}
