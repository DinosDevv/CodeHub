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

export type PauseReason = 'manual' | 'idle' | 'closed'

export interface ActiveSession {
  id: number
  projectId: number
  projectName: string
  startedAt: number
  /** Total ms spent in finished pauses. */
  pausedMs: number
  /** Set while paused. */
  pausedAt: number | null
  pauseReason: PauseReason | null
}

export interface SessionCommit extends Commit {
  insertions: number
  deletions: number
  files: number
}

export interface SessionSummary {
  id: number
  projectName: string
  durationMs: number
  note: string | null
  commits: SessionCommit[]
}

export interface SessionRecord {
  id: number
  projectId: number
  projectName: string
  startedAt: number
  endedAt: number
  durationMs: number
  note: string | null
  commitCount: number
}

export interface SessionStats {
  todayMs: number
  weekMs: number
  streakDays: number
  /** This week's time per project, largest first. */
  byProject: { projectId: number; projectName: string; ms: number }[]
  recent: SessionRecord[]
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
    getIdleMinutes(): Promise<number>
    setIdleMinutes(minutes: number): Promise<number>
  }
  sessions: {
    getActive(): Promise<ActiveSession | null>
    start(projectId: number): Promise<ActiveSession>
    pause(): Promise<void>
    resume(): Promise<void>
    /** Ends the active session and returns what happened during it. */
    stop(note: string | null): Promise<SessionSummary>
    list(projectId: number | null, limit: number): Promise<SessionRecord[]>
    stats(): Promise<SessionStats>
    /** Fires whenever the active session starts, pauses, resumes or ends. Returns an unsubscribe. */
    onChanged(listener: () => void): () => void
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
