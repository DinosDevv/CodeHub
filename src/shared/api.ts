// Contract between the preload bridge (window.api) and the renderer.
// Add a method here, implement it in src/main/ipc.ts and src/preload/index.ts.

export interface AppInfo {
  version: string
  dbPath: string
  schemaVersion: number
  tables: string[]
}

export interface Project {
  id: number
  name: string
  path: string
  stack: string[]
  archived: boolean
  /** False when the folder no longer exists on disk. */
  exists: boolean
  /** Unix ms of the newest commit, if known from the last scan. */
  lastCommitAt: number | null
}

export interface ScanResult {
  found: number
  added: number
}

export interface RepoStatus {
  branch: string | null
  ahead: number
  behind: number
  /** Files changed, staged or untracked. */
  changed: number
  hasRemote: boolean
}

export interface Commit {
  hash: string
  message: string
  author: string
  date: number
}

/** Every call either resolves with data or rejects with a readable message. */
export interface Api {
  app: {
    getInfo(): Promise<AppInfo>
  }
  settings: {
    getRoots(): Promise<string[]>
    /** Opens a folder picker; resolves with the updated list (unchanged if cancelled). */
    addRoot(): Promise<string[]>
    removeRoot(root: string): Promise<string[]>
  }
  projects: {
    list(): Promise<Project[]>
    get(id: number): Promise<Project | null>
    scan(): Promise<ScanResult>
    setArchived(id: number, archived: boolean): Promise<void>
  }
  git: {
    status(path: string): Promise<RepoStatus>
    log(path: string, limit: number): Promise<Commit[]>
  }
  launch: {
    vscode(path: string): Promise<void>
    folder(path: string): Promise<void>
  }
}
