import { existsSync } from 'fs'
import { getDb } from '.'
import type { Project } from '../../shared/api'

interface ProjectRow {
  id: number
  name: string
  path: string
  stack: string | null
  archived: number
  last_commit_at: number | null
}

export interface ProjectUpsert {
  name: string
  path: string
  stack: string[]
  lastCommitAt: number | null
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    path: row.path,
    stack: row.stack ? (JSON.parse(row.stack) as string[]) : [],
    archived: row.archived === 1,
    exists: existsSync(row.path),
    lastCommitAt: row.last_commit_at
  }
}

export function listProjects(): Project[] {
  const rows = getDb()
    .prepare('SELECT * FROM projects ORDER BY last_commit_at DESC NULLS LAST, name COLLATE NOCASE')
    .all() as ProjectRow[]
  return rows.map(toProject)
}

export function getProject(id: number): Project | null {
  const row = getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id) as
    ProjectRow | undefined
  return row ? toProject(row) : null
}

/** Inserts new repos and refreshes stack/last commit of known ones. Returns how many were new. */
export function upsertProjects(projects: ProjectUpsert[]): number {
  const db = getDb()
  const exists = db.prepare('SELECT 1 FROM projects WHERE path = ?').pluck()
  const upsert = db.prepare(`
    INSERT INTO projects (name, path, stack, last_commit_at, created_at)
    VALUES (@name, @path, @stack, @lastCommitAt, @now)
    ON CONFLICT(path) DO UPDATE SET stack = excluded.stack, last_commit_at = excluded.last_commit_at
  `)
  let added = 0
  db.transaction(() => {
    for (const p of projects) {
      if (!exists.get(p.path)) added++
      upsert.run({ ...p, stack: JSON.stringify(p.stack), now: Date.now() })
    }
  })()
  return added
}

export function setProjectArchived(id: number, archived: boolean): void {
  getDb()
    .prepare('UPDATE projects SET archived = ? WHERE id = ?')
    .run(archived ? 1 : 0, id)
}
