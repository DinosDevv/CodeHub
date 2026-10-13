import Database from 'better-sqlite3'
import { app } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { migrations } from './migrations'

let db: Database.Database | null = null

export function getDbPath(): string {
  return join(app.getPath('userData'), 'lowtide.db')
}

/**
 * The app used to be called CodeHub and kept its data in %APPDATA%\codehub.
 * On the first Lowtide start, copy that database over (a consistent snapshot,
 * including anything still in its WAL). The old folder is left as a backup.
 */
function importLegacyData(target: string): void {
  if (process.env['LOWTIDE_DATA_DIR'] || existsSync(target)) return
  const legacy = join(app.getPath('appData'), 'codehub', 'codehub.db')
  if (!existsSync(legacy)) return
  try {
    const old = new Database(legacy, { readonly: true, fileMustExist: true })
    old.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`)
    old.close()
    console.log(`[lowtide] imported data from ${legacy}`)
  } catch (e) {
    console.error('[lowtide] could not import CodeHub data', e)
  }
}

export function getDb(): Database.Database {
  if (!db) {
    const path = getDbPath()
    importLegacyData(path)
    db = new Database(path)
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
