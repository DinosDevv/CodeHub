import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { getDb, getDbPath } from './db'
import { getProject, listProjects, setProjectArchived, upsertProjects } from './db/projects'
import { getSetting, setSetting } from './db/settings'
import { getLastCommitAt, getRecentCommits, getRepoStatus } from './services/git'
import { openFolder, openInVSCode } from './services/launcher'
import { detectStack, findRepos, projectName } from './services/scanner'
import type { AppInfo, ScanResult } from '../shared/api'

const ROOTS_KEY = 'projectRoots'

/** Git and launch calls only ever act on folders CodeHub has scanned. */
function assertKnownPath(path: string): string {
  if (!listProjects().some((p) => p.path === path)) throw new Error('Unknown project folder.')
  return path
}

export function registerIpc(): void {
  ipcMain.handle('app:getInfo', (): AppInfo => {
    const db = getDb()
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      )
      .pluck()
      .all() as string[]
    return {
      version: app.getVersion(),
      dbPath: getDbPath(),
      schemaVersion: db.pragma('user_version', { simple: true }) as number,
      tables
    }
  })

  // settings
  ipcMain.handle('settings:getRoots', () => getSetting<string[]>(ROOTS_KEY, []))

  ipcMain.handle('settings:addRoot', async (event) => {
    const roots = getSetting<string[]>(ROOTS_KEY, [])
    const win = BrowserWindow.fromWebContents(event.sender)
    const options = {
      title: 'Choose a folder that holds your projects',
      properties: ['openDirectory' as const]
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    const picked = result.filePaths[0]
    if (result.canceled || !picked || roots.includes(picked)) return roots
    const next = [...roots, picked]
    setSetting(ROOTS_KEY, next)
    return next
  })

  ipcMain.handle('settings:removeRoot', (_, root: string) => {
    const next = getSetting<string[]>(ROOTS_KEY, []).filter((r) => r !== root)
    setSetting(ROOTS_KEY, next)
    return next
  })

  // projects
  ipcMain.handle('projects:list', () => listProjects())
  ipcMain.handle('projects:get', (_, id: number) => getProject(id))
  ipcMain.handle('projects:setArchived', (_, id: number, archived: boolean) =>
    setProjectArchived(id, archived)
  )

  ipcMain.handle('projects:scan', async (): Promise<ScanResult> => {
    const repos = await findRepos(getSetting<string[]>(ROOTS_KEY, []))
    const projects = await Promise.all(
      repos.map(async (path) => ({
        name: projectName(path),
        path,
        stack: await detectStack(path),
        lastCommitAt: await getLastCommitAt(path)
      }))
    )
    const added = upsertProjects(projects)
    return { found: repos.length, added }
  })

  // git
  ipcMain.handle('git:status', (_, path: string) => getRepoStatus(assertKnownPath(path)))
  ipcMain.handle('git:log', (_, path: string, limit: number) =>
    getRecentCommits(assertKnownPath(path), limit)
  )

  // launchers
  ipcMain.handle('launch:vscode', (_, path: string) => openInVSCode(assertKnownPath(path)))
  ipcMain.handle('launch:folder', (_, path: string) => openFolder(assertKnownPath(path)))
}
