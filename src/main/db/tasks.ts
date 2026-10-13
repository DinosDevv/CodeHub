import { getDb } from '.'
import { getActiveSession } from './sessions'
import type { Task, TaskQuery, TaskStatus } from '../../shared/api'

interface TaskRow {
  id: number
  project_id: number
  project_name: string
  title: string
  notes: string | null
  status: TaskStatus
  position: number
  created_at: number
  done_at: number | null
  session_id: number | null
}

const SELECT_TASK = `
  SELECT t.*, p.name AS project_name
  FROM tasks t JOIN projects p ON p.id = t.project_id`

// doing first, then todo, then done (most recently finished first).
const ORDER = `
  ORDER BY CASE t.status WHEN 'doing' THEN 0 WHEN 'todo' THEN 1 ELSE 2 END,
           CASE WHEN t.status = 'done' THEN -t.done_at ELSE t.position END,
           t.id`

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    title: row.title,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
    doneAt: row.done_at,
    sessionId: row.session_id
  }
}

function getTaskRow(id: number): TaskRow | undefined {
  return getDb().prepare(`${SELECT_TASK} WHERE t.id = ?`).get(id) as TaskRow | undefined
}

export function listTasks(query: TaskQuery): Task[] {
  const where: string[] = ['p.archived = 0']
  const params: unknown[] = []
  if (query.projectId !== undefined) {
    where.push('t.project_id = ?')
    params.push(query.projectId)
  }
  if (query.statuses?.length) {
    where.push(`t.status IN (${query.statuses.map(() => '?').join(', ')})`)
    params.push(...query.statuses)
  }
  const limit = query.limit ? `LIMIT ${Math.floor(query.limit)}` : ''
  const rows = getDb()
    .prepare(`${SELECT_TASK} WHERE ${where.join(' AND ')} ${ORDER} ${limit}`)
    .all(...params) as TaskRow[]
  return rows.map(toTask)
}

function endPosition(projectId: number, status: TaskStatus): number {
  const max = getDb()
    .prepare('SELECT MAX(position) FROM tasks WHERE project_id = ? AND status = ?')
    .pluck()
    .get(projectId, status) as number | null
  return (max ?? 0) + 1
}

export function addTask(projectId: number, title: string): Task {
  const clean = title.trim()
  if (!clean) throw new Error('A task needs a title.')
  const { lastInsertRowid } = getDb()
    .prepare('INSERT INTO tasks (project_id, title, position, created_at) VALUES (?, ?, ?, ?)')
    .run(projectId, clean, endPosition(projectId, 'todo'), Date.now())
  return toTask(getTaskRow(Number(lastInsertRowid))!)
}

export function updateTask(id: number, patch: { title?: string; notes?: string | null }): void {
  const row = getTaskRow(id)
  if (!row) throw new Error('That task is gone.')
  const title = patch.title === undefined ? row.title : patch.title.trim()
  if (!title) throw new Error('A task needs a title.')
  const notes = patch.notes === undefined ? row.notes : patch.notes?.trim() || null
  getDb().prepare('UPDATE tasks SET title = ?, notes = ? WHERE id = ?').run(title, notes, id)
}

/**
 * Puts a task into `status`, just before `beforeId` (or at the end).
 * Finishing a task during a session on the same project links it to that session.
 */
export function moveTask(id: number, status: TaskStatus, beforeId: number | null): void {
  const db = getDb()
  const row = getTaskRow(id)
  if (!row) throw new Error('That task is gone.')

  let position = endPosition(row.project_id, status)
  if (beforeId !== null && beforeId !== id) {
    const before = getTaskRow(beforeId)
    if (before && before.status === status && before.project_id === row.project_id) {
      const prev = db
        .prepare(
          'SELECT MAX(position) FROM tasks WHERE project_id = ? AND status = ? AND position < ? AND id != ?'
        )
        .pluck()
        .get(row.project_id, status, before.position, id) as number | null
      position = prev === null ? before.position - 1 : (prev + before.position) / 2
    }
  }

  let doneAt = row.done_at
  let sessionId = row.session_id
  if (status === 'done' && row.status !== 'done') {
    doneAt = Date.now()
    const active = getActiveSession()
    sessionId = active && active.projectId === row.project_id ? active.id : null
  } else if (status !== 'done') {
    doneAt = null
    sessionId = null
  }

  db.prepare(
    'UPDATE tasks SET status = ?, position = ?, done_at = ?, session_id = ? WHERE id = ?'
  ).run(status, position, doneAt, sessionId, id)
}

export function deleteTask(id: number): void {
  getDb().prepare('DELETE FROM tasks WHERE id = ?').run(id)
}

export function tasksDoneInSession(sessionId: number): { id: number; title: string }[] {
  return getDb()
    .prepare('SELECT id, title FROM tasks WHERE session_id = ? ORDER BY done_at')
    .all(sessionId) as { id: number; title: string }[]
}
