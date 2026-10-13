import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { getDb, getDbPath } from './db'
import { getProject, listProjects, setProjectArchived, upsertProjects } from './db/projects'
import { getSetting, setSetting } from './db/settings'
import { getLastCommitAt, getRecentCommits, getRepoStatus } from './services/git'
import {
  commitStaged,
  fetchRemote,
  getFileDiff,
  getWorkingTree,
  pullBranch,
  pushBranch,
  stageFiles,
  unstageFiles
} from './services/gitChanges'
import { openFolder, openInVSCode } from './services/launcher'
import { DEFAULT_IDLE_MINUTES, IDLE_MINUTES_KEY } from './services/idle'
import { detectStack, findRepos, projectName } from './services/scanner'
import { pauseSession, resumeSession, startSession, stopSession } from './services/sessions'
import { getActiveSession, getStats, listSessions } from './db/sessions'
import { addTask, deleteTask, listTasks, moveTask, updateTask } from './db/tasks'
import { broadcast } from './events'
import { hooksStatus, installHooks, removeHooks } from './services/claudeHooks'
import { listLive } from './services/claudeLive'
import { getRecipe, setRecipe } from './services/recipes'
import { isClaudeAvailable, writeCommitMessage } from './services/claudeCli'
import { claudeHistory } from './db/claudeEvents'
import {
  closeTerminal,
  createTerminal,
  findGitBash,
  listTerminals,
  projectScripts,
  resizeTerminal,
  SHELL_KEY,
  terminalBuffer,
  writeTerminal
} from './services/terminals'
import type {
  AppInfo,
  NewTerminal,
  ScanResult,
  SessionRecipe,
  TaskQuery,
  TaskStatus,
  TerminalShell
} from '../shared/api'

const ROOTS_KEY = 'projectRoots'

/** Git and launch calls only ever act on folders Lowtide has scanned. */
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

  ipcMain.handle('settings:getIdleMinutes', () =>
    getSetting(IDLE_MINUTES_KEY, DEFAULT_IDLE_MINUTES)
  )
  ipcMain.handle('settings:setIdleMinutes', (_, minutes: number) => {
    const clamped = Math.min(120, Math.max(1, Math.round(minutes)))
    setSetting(IDLE_MINUTES_KEY, clamped)
    return clamped
  })

  // sessions
  ipcMain.handle('sessions:getActive', () => getActiveSession())
  ipcMain.handle('sessions:start', (_, projectId: number) => startSession(projectId))
  ipcMain.handle('sessions:pause', () => pauseSession('manual'))
  ipcMain.handle('sessions:resume', () => resumeSession())
  ipcMain.handle('sessions:stop', (_, note: string | null) => stopSession(note))
  ipcMain.handle('sessions:list', (_, projectId: number | null, limit: number) =>
    listSessions(projectId, limit)
  )
  ipcMain.handle('sessions:stats', () => getStats(Date.now()))

  // tasks
  const changedTasks = <T>(result: T): T => {
    broadcast('tasks:changed')
    return result
  }
  ipcMain.handle('tasks:list', (_, query: TaskQuery) => listTasks(query))
  ipcMain.handle('tasks:add', (_, projectId: number, title: string) =>
    changedTasks(addTask(projectId, title))
  )
  ipcMain.handle(
    'tasks:update',
    (_, id: number, patch: { title?: string; notes?: string | null }) =>
      changedTasks(updateTask(id, patch))
  )
  ipcMain.handle('tasks:move', (_, id: number, status: TaskStatus, beforeId: number | null) =>
    changedTasks(moveTask(id, status, beforeId))
  )
  ipcMain.handle('tasks:remove', (_, id: number) => changedTasks(deleteTask(id)))

  // terminals
  ipcMain.handle('terminals:create', (_, opts: NewTerminal) => createTerminal(opts))
  ipcMain.handle('terminals:list', () => listTerminals())
  ipcMain.handle('terminals:buffer', (_, id: number) => terminalBuffer(id))
  ipcMain.on('terminals:write', (_, id: number, data: string) => writeTerminal(id, data))
  ipcMain.on('terminals:resize', (_, id: number, cols: number, rows: number) =>
    resizeTerminal(id, cols, rows)
  )
  ipcMain.handle('terminals:close', (_, id: number) => closeTerminal(id))
  ipcMain.handle('terminals:scripts', (_, projectId: number) => projectScripts(projectId))
  ipcMain.handle('terminals:support', () => ({
    claude: isClaudeAvailable(),
    gitBash: findGitBash() !== null
  }))
  ipcMain.handle('terminals:getShell', () => getSetting<TerminalShell>(SHELL_KEY, 'powershell'))
  ipcMain.handle('terminals:setShell', (_, shell: TerminalShell) =>
    setSetting(SHELL_KEY, shell === 'gitbash' ? 'gitbash' : 'powershell')
  )

  // claude
  ipcMain.handle('claude:live', () => listLive())
  ipcMain.handle('claude:hooks', () => hooksStatus())
  ipcMain.handle('claude:installHooks', () => installHooks())
  ipcMain.handle('claude:removeHooks', () => removeHooks())
  ipcMain.handle('claude:history', (_, projectId: number, limit: number) =>
    claudeHistory(projectId, limit)
  )

  // projects
  ipcMain.handle('projects:list', () => listProjects())
  ipcMain.handle('projects:get', (_, id: number) => getProject(id))
  ipcMain.handle('projects:getRecipe', (_, id: number) => getRecipe(id))
  ipcMain.handle('projects:setRecipe', (_, id: number, recipe: SessionRecipe) =>
    setRecipe(id, recipe)
  )
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
  ipcMain.handle('git:workingTree', (_, path: string) => getWorkingTree(assertKnownPath(path)))
  ipcMain.handle('git:diff', (_, path: string, file: string, staged: boolean) =>
    getFileDiff(assertKnownPath(path), file, staged)
  )
  ipcMain.handle('git:stage', (_, path: string, files: string[]) =>
    stageFiles(assertKnownPath(path), files)
  )
  ipcMain.handle('git:unstage', (_, path: string, files: string[]) =>
    unstageFiles(assertKnownPath(path), files)
  )
  ipcMain.handle('git:commit', (_, path: string, message: string) =>
    commitStaged(assertKnownPath(path), message)
  )
  ipcMain.handle('git:push', (_, path: string) => pushBranch(assertKnownPath(path)))
  ipcMain.handle('git:pull', (_, path: string) => pullBranch(assertKnownPath(path)))
  ipcMain.handle('git:fetch', (_, path: string) => fetchRemote(assertKnownPath(path)))
  ipcMain.handle('git:writeCommitMessage', (_, path: string) =>
    writeCommitMessage(assertKnownPath(path))
  )
  ipcMain.handle('git:log', (_, path: string, limit: number) =>
    getRecentCommits(assertKnownPath(path), limit)
  )

  // launchers
  ipcMain.handle('launch:vscode', (_, path: string) => openInVSCode(assertKnownPath(path)))
  ipcMain.handle('launch:folder', (_, path: string) => openFolder(assertKnownPath(path)))
}
