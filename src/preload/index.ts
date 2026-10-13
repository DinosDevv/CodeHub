import { contextBridge, ipcRenderer } from 'electron'
import type { Api } from '../shared/api'

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
    onChanged: (listener) => {
      const handler = (): void => listener()
      ipcRenderer.on('sessions:changed', handler)
      return () => ipcRenderer.removeListener('sessions:changed', handler)
    }
  },
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    get: (id) => ipcRenderer.invoke('projects:get', id),
    scan: () => ipcRenderer.invoke('projects:scan'),
    setArchived: (id, archived) => ipcRenderer.invoke('projects:setArchived', id, archived)
  },
  git: {
    status: (path) => ipcRenderer.invoke('git:status', path),
    log: (path, limit) => ipcRenderer.invoke('git:log', path, limit)
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
