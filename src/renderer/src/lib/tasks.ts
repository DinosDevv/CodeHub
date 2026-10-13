import type { Task, TaskQuery, TaskStatus } from '../../../shared/api'
import { errorMessage } from './errors'
import { toast } from './toast'

export type { Task, TaskQuery, TaskStatus }

export const listTasks = (query: TaskQuery): Promise<Task[]> => window.api.tasks.list(query)
export const onTasksChanged = (listener: () => void): (() => void) =>
  window.api.tasks.onChanged(listener)

/** Runs a task mutation, turning failures into a toast. Resolves false on failure. */
async function attempt(action: () => Promise<unknown>): Promise<boolean> {
  try {
    await action()
    return true
  } catch (e) {
    toast(errorMessage(e), 'error')
    return false
  }
}

export const addTask = (projectId: number, title: string): Promise<boolean> =>
  attempt(() => window.api.tasks.add(projectId, title))

export const renameTask = (id: number, title: string): Promise<boolean> =>
  attempt(() => window.api.tasks.update(id, { title }))

export const setTaskNotes = (id: number, notes: string): Promise<boolean> =>
  attempt(() => window.api.tasks.update(id, { notes }))

export const moveTask = (
  id: number,
  status: TaskStatus,
  beforeId: number | null = null
): Promise<boolean> => attempt(() => window.api.tasks.move(id, status, beforeId))

export const removeTask = (id: number): Promise<boolean> =>
  attempt(() => window.api.tasks.remove(id))

export function toggleDone(task: Task): Promise<boolean> {
  return moveTask(task.id, task.status === 'done' ? 'todo' : 'done')
}

export function groupByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const groups: Record<TaskStatus, Task[]> = { doing: [], todo: [], done: [] }
  for (const t of tasks) groups[t.status].push(t)
  return groups
}

export const statusLabels: Record<TaskStatus, string> = {
  doing: 'in progress',
  todo: 'up next',
  done: 'done'
}

/** Drag-and-drop payload type, so drops from elsewhere are ignored. */
export const TASK_DRAG_TYPE = 'application/x-lowtide-task'
