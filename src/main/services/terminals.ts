import { execFileSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import * as pty from 'node-pty'
import { getProject } from '../db/projects'
import { getSetting } from '../db/settings'
import { broadcast, sendToWindows } from '../events'
import type { NewTerminal, TerminalInfo, TerminalShell } from '../../shared/api'

export const SHELL_KEY = 'terminalShell'

/** Scrollback kept per terminal so a reloaded window can repaint it. */
const MAX_BUFFER = 256 * 1024
/** Output is batched so a chatty process doesn't flood IPC. */
const FLUSH_MS = 16

interface Terminal {
  info: TerminalInfo
  proc: pty.IPty
  buffer: string
  pending: string
}

const terminals = new Map<number, Terminal>()
let nextId = 1
let flushTimer: NodeJS.Timeout | null = null

function flush(): void {
  flushTimer = null
  for (const t of terminals.values()) {
    if (!t.pending) continue
    sendToWindows('terminals:data', t.info.id, t.pending)
    t.pending = ''
  }
}

/** Every match for `command` on PATH, in PATH order. */
function whichAll(command: string): string[] {
  try {
    const out = execFileSync(process.platform === 'win32' ? 'where.exe' : 'which', [command], {
      encoding: 'utf8',
      windowsHide: true
    })
    return out.split(/\r?\n/).filter(Boolean)
  } catch {
    return []
  }
}

function which(command: string): string | null {
  return whichAll(command)[0] ?? null
}

let claudeCache: { at: number; available: boolean } | null = null

export function isClaudeAvailable(): boolean {
  if (!claudeCache || Date.now() - claudeCache.at > 30_000) {
    claudeCache = { at: Date.now(), available: which('claude') !== null }
  }
  return claudeCache.available
}

let gitBashCache: string | null | undefined

/**
 * Git Bash sits in the git install's root `bin` folder. git.exe can be found at
 * <root>\cmd or <root>\mingw64\bin depending on PATH, so walk up from each match.
 */
export function findGitBash(): string | null {
  if (gitBashCache !== undefined) return gitBashCache
  gitBashCache = null
  for (const git of whichAll('git')) {
    let dir = dirname(git)
    for (let up = 0; up < 3; up++) {
      dir = dirname(dir)
      const bash = join(dir, 'bin', 'bash.exe')
      if (existsSync(bash)) {
        gitBashCache = bash
        return bash
      }
    }
  }
  return null
}

/** npm scripts from the project's package.json, in file order. */
export function projectScripts(projectId: number): string[] {
  const project = getProject(projectId)
  if (!project?.exists) return []
  try {
    const pkg = JSON.parse(readFileSync(join(project.path, 'package.json'), 'utf8'))
    return Object.keys(pkg.scripts ?? {})
  } catch {
    return []
  }
}

// Script names go into a shell command line, so only allow plain names.
const SAFE_SCRIPT = /^[\w:.@/-]+$/

function shellCommand(shell: TerminalShell, run: string | null): { file: string; args: string[] } {
  if (shell === 'gitbash') {
    const bash = findGitBash()
    if (!bash) throw new Error("Couldn't find Git Bash.")
    // Run the command, then stay in an interactive shell afterwards.
    return {
      file: bash,
      args: run ? ['--login', '-i', '-c', `${run}; exec bash -i`] : ['--login', '-i']
    }
  }
  return {
    file: 'powershell.exe',
    args: run ? ['-NoLogo', '-NoExit', '-Command', run] : ['-NoLogo']
  }
}

/** A clean environment: never leak Electron's own variables into user processes. */
function childEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && !k.startsWith('ELECTRON_') && k !== 'CODEHUB_DATA_DIR') env[k] = v
  }
  env.COLORTERM = 'truecolor'
  return env
}

export function createTerminal(opts: NewTerminal): TerminalInfo {
  const project = getProject(opts.projectId)
  if (!project?.exists) throw new Error('That project folder is missing.')

  const shell = getSetting<TerminalShell>(SHELL_KEY, 'powershell')
  let run: string | null = null
  let title: string
  if (opts.kind === 'claude') {
    if (!isClaudeAvailable()) throw new Error('Claude Code isn’t installed yet.')
    run = 'claude'
    title = '✦ claude'
  } else if (opts.kind === 'script') {
    if (
      !opts.script ||
      !SAFE_SCRIPT.test(opts.script) ||
      !projectScripts(project.id).includes(opts.script)
    ) {
      throw new Error('Unknown script.')
    }
    run = `npm run ${opts.script}`
    title = `npm run ${opts.script}`
  } else {
    title = shell === 'gitbash' ? 'bash' : 'powershell'
  }

  const { file, args } = shellCommand(shell, run)
  const proc = pty.spawn(file, args, {
    name: 'xterm-256color',
    cols: opts.cols ?? 100,
    rows: opts.rows ?? 30,
    cwd: project.path,
    env: childEnv(),
    useConpty: true
  })

  const info: TerminalInfo = {
    id: nextId++,
    projectId: project.id,
    projectName: project.name,
    kind: opts.kind,
    title,
    exitCode: null,
    createdAt: Date.now()
  }
  const term: Terminal = { info, proc, buffer: '', pending: '' }
  terminals.set(info.id, term)

  proc.onData((data) => {
    term.buffer = (term.buffer + data).slice(-MAX_BUFFER)
    term.pending += data
    flushTimer ??= setTimeout(flush, FLUSH_MS)
  })
  proc.onExit(({ exitCode }) => {
    flush()
    info.exitCode = exitCode
    sendToWindows('terminals:exit', info.id, exitCode)
    broadcast('terminals:changed')
  })

  broadcast('terminals:changed')
  return info
}

export function listTerminals(): TerminalInfo[] {
  return [...terminals.values()].map((t) => t.info)
}

export function terminalBuffer(id: number): string {
  return terminals.get(id)?.buffer ?? ''
}

export function writeTerminal(id: number, data: string): void {
  const t = terminals.get(id)
  if (t && t.info.exitCode === null) t.proc.write(data)
}

export function resizeTerminal(id: number, cols: number, rows: number): void {
  const t = terminals.get(id)
  if (!t || t.info.exitCode !== null) return
  if (cols > 0 && rows > 0) t.proc.resize(Math.floor(cols), Math.floor(rows))
}

/** Closes a tab, ending its process if it's still running. */
export function closeTerminal(id: number): void {
  const t = terminals.get(id)
  if (!t) return
  terminals.delete(id)
  if (t.info.exitCode === null) {
    try {
      t.proc.kill()
    } catch {
      // already gone
    }
  }
  broadcast('terminals:changed')
}

export function closeAllTerminals(): void {
  for (const id of [...terminals.keys()]) closeTerminal(id)
}
