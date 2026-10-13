import { contextBridge, ipcRenderer } from 'electron'
import type { Api, ClaudeLive } from '../shared/api'

function subscribe(channel: string, listener: () => void): () => void {
  const handler = (): void => listener()
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const api: Api = {
  app: {
    getInfo: () => ipcRenderer.invoke('app:getInfo')
  },
  settings: {
    getRoots: () => ipcRenderer.invoke('settings:getRoots'),
    addRoot: () => ipcRenderer.invoke('settings:addRoot'),
    removeRoot: (root) => ipcRenderer.invoke('settings:removeRoot', root),
    getIdleMinutes: () => ipcRenderer.invoke('settings:getIdleMinutes'),
    setIdleMinutes: (minutes) => ipcRenderer.invoke('settings:setIdleMinutes', minutes)
  },
  sessions: {
    getActive: () => ipcRenderer.invoke('sessions:getActive'),
    start: (projectId) => ipcRenderer.invoke('sessions:start', projectId),
    pause: () => ipcRenderer.invoke('sessions:pause'),
    resume: () => ipcRenderer.invoke('sessions:resume'),
    stop: (note) => ipcRenderer.invoke('sessions:stop', note),
    list: (projectId, limit) => ipcRenderer.invoke('sessions:list', projectId, limit),
    stats: () => ipcRenderer.invoke('sessions:stats'),
    onChanged: (listener) => subscribe('sessions:changed', listener)
  },
  tasks: {
    list: (query) => ipcRenderer.invoke('tasks:list', query),
    add: (projectId, title) => ipcRenderer.invoke('tasks:add', projectId, title),
    update: (id, patch) => ipcRenderer.invoke('tasks:update', id, patch),
    move: (id, status, beforeId) => ipcRenderer.invoke('tasks:move', id, status, beforeId),
    remove: (id) => ipcRenderer.invoke('tasks:remove', id),
    onChanged: (listener) => subscribe('tasks:changed', listener)
  },
  terminals: {
    create: (opts) => ipcRenderer.invoke('terminals:create', opts),
    list: () => ipcRenderer.invoke('terminals:list'),
    buffer: (id) => ipcRenderer.invoke('terminals:buffer', id),
    write: (id, data) => ipcRenderer.send('terminals:write', id, data),
    resize: (id, cols, rows) => ipcRenderer.send('terminals:resize', id, cols, rows),
    close: (id) => ipcRenderer.invoke('terminals:close', id),
    scripts: (projectId) => ipcRenderer.invoke('terminals:scripts', projectId),
    support: () => ipcRenderer.invoke('terminals:support'),
    getShell: () => ipcRenderer.invoke('terminals:getShell'),
    setShell: (shell) => ipcRenderer.invoke('terminals:setShell', shell),
    onData: (listener) => {
      const handler = (_: unknown, id: number, data: string): void => listener(id, data)
      ipcRenderer.on('terminals:data', handler)
      return () => ipcRenderer.removeListener('terminals:data', handler)
    },
    onExit: (listener) => {
      const handler = (_: unknown, id: number, code: number): void => listener(id, code)
      ipcRenderer.on('terminals:exit', handler)
      return () => ipcRenderer.removeListener('terminals:exit', handler)
    },
    onChanged: (listener) => subscribe('terminals:changed', listener)
  },
  focus: {
    status: () => ipcRenderer.invoke('focus:status'),
    settings: () => ipcRenderer.invoke('focus:settings'),
    setSettings: (settings) => ipcRenderer.invoke('focus:setSettings', settings),
    takeBreak: () => ipcRenderer.invoke('focus:takeBreak'),
    snooze: () => ipcRenderer.invoke('focus:snooze'),
    endBreak: () => ipcRenderer.invoke('focus:endBreak'),
    onChanged: (listener) => subscribe('focus:changed', listener)
  },
  claude: {
    live: () => ipcRenderer.invoke('claude:live'),
    hooks: () => ipcRenderer.invoke('claude:hooks'),
    installHooks: () => ipcRenderer.invoke('claude:installHooks'),
    removeHooks: () => ipcRenderer.invoke('claude:removeHooks'),
    history: (projectId, limit) => ipcRenderer.invoke('claude:history', projectId, limit),
    onChanged: (listener) => subscribe('claude:changed', listener),
    onFocus: (listener) => {
      const handler = (_: unknown, live: ClaudeLive): void => listener(live)
      ipcRenderer.on('claude:focus', handler)
      return () => ipcRenderer.removeListener('claude:focus', handler)
    }
  },
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    get: (id) => ipcRenderer.invoke('projects:get', id),
    scan: () => ipcRenderer.invoke('projects:scan'),
    setArchived: (id, archived) => ipcRenderer.invoke('projects:setArchived', id, archived),
    getRecipe: (id) => ipcRenderer.invoke('projects:getRecipe', id),
    setRecipe: (id, recipe) => ipcRenderer.invoke('projects:setRecipe', id, recipe)
  },
  git: {
    status: (path) => ipcRenderer.invoke('git:status', path),
    log: (path, limit) => ipcRenderer.invoke('git:log', path, limit),
    workingTree: (path) => ipcRenderer.invoke('git:workingTree', path),
    diff: (path, file, staged) => ipcRenderer.invoke('git:diff', path, file, staged),
    stage: (path, files) => ipcRenderer.invoke('git:stage', path, files),
    unstage: (path, files) => ipcRenderer.invoke('git:unstage', path, files),
    commit: (path, message) => ipcRenderer.invoke('git:commit', path, message),
    push: (path) => ipcRenderer.invoke('git:push', path),
    pull: (path) => ipcRenderer.invoke('git:pull', path),
    fetch: (path) => ipcRenderer.invoke('git:fetch', path),
    writeCommitMessage: (path) => ipcRenderer.invoke('git:writeCommitMessage', path),
    onChanged: (listener) => {
      const handler = (_: unknown, path: string): void => listener(path)
      ipcRenderer.on('git:changed', handler)
      return () => ipcRenderer.removeListener('git:changed', handler)
    }
  },
  launch: {
    vscode: (path) => ipcRenderer.invoke('launch:vscode', path),
    folder: (path) => ipcRenderer.invoke('launch:folder', path)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (defined in index.d.ts)
  window.api = api
}
