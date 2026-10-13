import { execFileSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { homedir } from 'os'
import { dirname, join } from 'path'
import * as pty from 'node-pty'
import { getProject } from '../db/projects'
import { getSetting } from '../db/settings'
import { broadcast, sendToWindows } from '../events'
import { HOOK_PORT } from './claudeHooks'
import { forgetTerminal } from './claudeLive'
import { envWithCurrentPath } from './envPath'
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

/** Every match for `command` on the current PATH, in PATH order. */
function whichAll(command: string): string[] {
  try {
    const out = execFileSync(process.platform === 'win32' ? 'where.exe' : 'which', [command], {
      encoding: 'utf8',
      windowsHide: true,
      env: envWithCurrentPath()
    })
    return out.split(/\r?\n/).filter(Boolean)
  } catch {
    return []
  }
}

function which(command: string): string | null {
  return whichAll(command)[0] ?? null
}

/** Where Claude Code's native installer puts it, in case PATH doesn't list it. */
const CLAUDE_DEFAULT = join(
  homedir(),
  '.local',
  'bin',
  process.platform === 'win32' ? 'claude.exe' : 'claude'
)

let claudeCache: { at: number; command: string | null } | null = null

/** How to launch Claude Code: `claude` if it's on PATH, else its full path, else null. */
function claudeCommand(): string | null {
  if (!claudeCache || Date.now() - claudeCache.at > 30_000) {
    const command = which('claude') ? 'claude' : existsSync(CLAUDE_DEFAULT) ? CLAUDE_DEFAULT : null
    claudeCache = { at: Date.now(), command }
  }
  return claudeCache.command
}

export function isClaudeAvailable(): boolean {
  return claudeCommand() !== null
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
/** Claude's hook reads these to tell Lowtide which tab an event came from. */
function childEnv(terminalId: number): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [k, v] of Object.entries(envWithCurrentPath())) {
    if (!k.startsWith('ELECTRON_') && k !== 'LOWTIDE_DATA_DIR') env[k] = v
  }
  env.COLORTERM = 'truecolor'
  env.LOWTIDE_TERMINAL_ID = String(terminalId)
  env.LOWTIDE_HOOK_PORT = String(HOOK_PORT)
  return env
}

export function createTerminal(opts: NewTerminal): TerminalInfo {
  const project = getProject(opts.projectId)
  if (!project?.exists) throw new Error('That project folder is missing.')

  const shell = getSetting<TerminalShell>(SHELL_KEY, 'powershell')
  let run: string | null = null
  let title: string
  if (opts.kind === 'claude') {
    const claude = claudeCommand()
    if (!claude) throw new Error('Claude Code isn’t installed yet.')
    // A full path (when PATH doesn't list it) has to be quoted and called explicitly.
    run = claude === 'claude' ? 'claude' : shell === 'gitbash' ? `'${claude}'` : `& '${claude}'`
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
  const id = nextId++
  const proc = pty.spawn(file, args, {
    name: 'xterm-256color',
    cols: opts.cols ?? 100,
    rows: opts.rows ?? 30,
    cwd: project.path,
    env: childEnv(id),
    useConpty: true
  })

  const info: TerminalInfo = {
    id,
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
    forgetTerminal(id)
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
  forgetTerminal(id)
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
