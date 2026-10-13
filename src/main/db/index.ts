import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { migrations } from './migrations'

let db: Database.Database | null = null

export function getDbPath(): string {
  return join(app.getPath('userData'), 'codehub.db')
}

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(getDbPath())
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    migrate(db)
  }
  return db
}

export function closeDb(): void {
  db?.close()
  db = null
}

function migrate(db: Database.Database): void {
  const current = db.pragma('user_version', { simple: true }) as number
  for (let v = current; v < migrations.length; v++) {
    db.transaction(() => {
      db.exec(migrations[v])
      db.pragma(`user_version = ${v + 1}`)
    })()
  }
}
