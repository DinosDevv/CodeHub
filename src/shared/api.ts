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

export type FileChangeKind =
  'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'conflicted'

export interface ChangedFile {
  path: string
  /** Previous path, for renames. */
  from?: string
  kind: FileChangeKind
  /** Null when unknown (binary or untracked). */
  insertions: number | null
  deletions: number | null
}

export interface WorkingTree {
  branch: string | null
  /** e.g. "origin/main"; null when the branch was never pushed. */
  upstream: string | null
  ahead: number
  behind: number
  hasRemote: boolean
  hasCommits: boolean
  /** A file staged and then edited again appears in both lists. */
  staged: ChangedFile[]
  unstaged: ChangedFile[]
}

export interface FileDiff {
  text: string
  truncated: boolean
  binary: boolean
}

export interface CommitOutcome {
  hash: string
  files: number
  insertions: number
  deletions: number
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
  tasksDone: { id: number; title: string }[]
}

export type TaskStatus = 'todo' | 'doing' | 'done'

export interface Task {
  id: number
  projectId: number
  projectName: string
  title: string
  notes: string | null
  status: TaskStatus
  createdAt: number
  doneAt: number | null
  /** The session it was finished in, if any. */
  sessionId: number | null
}

export interface TaskQuery {
  /** Omit for every project. */
  projectId?: number
  /** Omit for all statuses. */
  statuses?: TaskStatus[]
  limit?: number
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

export type TerminalKind = 'shell' | 'claude' | 'script'
export type TerminalShell = 'powershell' | 'gitbash'

export interface NewTerminal {
  projectId: number
  kind: TerminalKind
  /** npm script name, for kind 'script'. */
  script?: string
  /** Claude tabs: a first message to start the conversation with. */
  prompt?: string
  /** Claude tabs: reopen this earlier Claude conversation instead. */
  resumeSessionId?: string
  /** Shown on the tab, e.g. the task being worked on. */
  title?: string
  cols?: number
  rows?: number
}

export interface TerminalInfo {
  id: number
  projectId: number
  projectName: string
  kind: TerminalKind
  title: string
  /** Null while the process is still running. */
  exitCode: number | null
  createdAt: number
  /** Local addresses the process printed (e.g. a dev server), oldest first. */
  urls: string[]
}

export type RecipeClaude = 'off' | 'fresh' | 'task'

/** What "start session" sets up for a project. */
export interface SessionRecipe {
  vscode: boolean
  /** npm script to run, e.g. "dev"; null for none. */
  script: string | null
  /** off · a fresh Claude tab · Claude working on your next task */
  claude: RecipeClaude
  /** Open the first local address the script prints in your browser. */
  browser: boolean
}

export interface TerminalSupport {
  claude: boolean
  gitBash: boolean
}

/** working: busy on your prompt · waiting: needs you (permission/input) · idle: done, your turn */
export type ClaudeState = 'working' | 'waiting' | 'idle'

export interface ClaudeLive {
  sessionId: string
  projectId: number | null
  projectName: string | null
  /** The Lowtide terminal it runs in, if any (null for Claude started elsewhere). */
  terminalId: number | null
  cwd: string
  state: ClaudeState
  /** Last prompt while working, or Claude's notification while waiting. */
  message: string | null
  startedAt: number
  updatedAt: number
}

/** One past (or ongoing) Claude Code conversation in a project. */
export interface ClaudeSessionSummary {
  sessionId: string
  /** What `claude --resume` needs (the conversation file's id), when known. */
  resumeId: string | null
  startedAt: number
  lastAt: number
  ended: boolean
  /** What you asked, oldest first. */
  prompts: string[]
  /** How many times Claude stopped to ask for permission or input. */
  waits: number
}

export interface ClaudeHooksStatus {
  installed: boolean
  /** The hook runs a tiny Node script, so Node must be on PATH. */
  nodeAvailable: boolean
  settingsPath: string
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
  tasks: {
    list(query: TaskQuery): Promise<Task[]>
    add(projectId: number, title: string): Promise<Task>
    update(id: number, patch: { title?: string; notes?: string | null }): Promise<void>
    /** Moves a task into `status`, placed before `beforeId` (or at the end). */
    move(id: number, status: TaskStatus, beforeId: number | null): Promise<void>
    remove(id: number): Promise<void>
    onChanged(listener: () => void): () => void
  }
  terminals: {
    create(opts: NewTerminal): Promise<TerminalInfo>
    list(): Promise<TerminalInfo[]>
    /** Recent output, for repainting after a reload. */
    buffer(id: number): Promise<string>
    write(id: number, data: string): void
    resize(id: number, cols: number, rows: number): void
    close(id: number): Promise<void>
    scripts(projectId: number): Promise<string[]>
    support(): Promise<TerminalSupport>
    getShell(): Promise<TerminalShell>
    setShell(shell: TerminalShell): Promise<void>
    onData(listener: (id: number, data: string) => void): () => void
    onExit(listener: (id: number, exitCode: number) => void): () => void
    onChanged(listener: () => void): () => void
  }
  claude: {
    live(): Promise<ClaudeLive[]>
    hooks(): Promise<ClaudeHooksStatus>
    installHooks(): Promise<ClaudeHooksStatus>
    removeHooks(): Promise<ClaudeHooksStatus>
    history(projectId: number, limit: number): Promise<ClaudeSessionSummary[]>
    onChanged(listener: () => void): () => void
    /** A notification was clicked: bring this Claude session into view. */
    onFocus(listener: (live: ClaudeLive) => void): () => void
  }
  projects: {
    list(): Promise<Project[]>
    get(id: number): Promise<Project | null>
    scan(): Promise<ScanResult>
    setArchived(id: number, archived: boolean): Promise<void>
    getRecipe(id: number): Promise<SessionRecipe>
    setRecipe(id: number, recipe: SessionRecipe): Promise<SessionRecipe>
  }
  git: {
    status(path: string): Promise<RepoStatus>
    log(path: string, limit: number): Promise<Commit[]>
    workingTree(path: string): Promise<WorkingTree>
    diff(path: string, file: string, staged: boolean): Promise<FileDiff>
    stage(path: string, files: string[]): Promise<void>
    unstage(path: string, files: string[]): Promise<void>
    commit(path: string, message: string): Promise<CommitOutcome>
    push(path: string): Promise<void>
    /** Fast-forward only; never creates merge commits. */
    pull(path: string): Promise<void>
    /** Updates ahead/behind from the remote without changing files. */
    fetch(path: string): Promise<void>
    /** Asks Claude for a commit message describing the staged changes. */
    writeCommitMessage(path: string): Promise<string>
    /** Fires with the repo path after anything here changes it. */
    onChanged(listener: (path: string) => void): () => void
  }
  launch: {
    vscode(path: string): Promise<void>
    folder(path: string): Promise<void>
  }
}
