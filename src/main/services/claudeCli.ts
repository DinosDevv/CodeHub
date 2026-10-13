import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { simpleGit } from 'simple-git'
import { envWithCurrentPath, which, withoutParentClaude } from './envPath'
import type { TerminalShell } from '../../shared/api'

/** Where Claude Code's native installer puts it, in case PATH doesn't list it. */
const CLAUDE_DEFAULT = join(
  homedir(),
  '.local',
  'bin',
  process.platform === 'win32' ? 'claude.exe' : 'claude'
)

let cache: { at: number; onPath: boolean; path: string | null } | null = null

function resolve(): { onPath: boolean; path: string | null } {
  if (!cache || Date.now() - cache.at > 30_000) {
    const found = which('claude')
    cache = {
      at: Date.now(),
      onPath: found !== null,
      path: found ?? (existsSync(CLAUDE_DEFAULT) ? CLAUDE_DEFAULT : null)
    }
  }
  return cache
}

export function isClaudeAvailable(): boolean {
  return resolve().path !== null
}

/** How a shell should invoke Claude: `claude` if it's on PATH, else its quoted full path. */
export function claudeShellCommand(shell: TerminalShell): string | null {
  const { onPath, path } = resolve()
  if (!path) return null
  if (onPath) return 'claude'
  return shell === 'gitbash' ? `'${path}'` : `& '${path}'`
}

// ---------------------------------------------------------------------------
// One-shot Claude: commit messages.

const MAX_DIFF = 60 * 1024
const TIMEOUT_MS = 120_000

/**
 * Runs `claude -p` with everything on stdin (no prompt on the command line, so
 * nothing in a diff can be read as shell syntax). LOWTIDE_QUIET keeps these
 * helper runs out of the "claude right now" list.
 */
function runClaudePrint(cwd: string, input: string): Promise<string> {
  const { path } = resolve()
  if (!path) return Promise.reject(new Error('Claude Code isn’t installed yet.'))

  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      path,
      ['-p', '--model', 'haiku', '--max-turns', '1', '--output-format', 'text'],
      {
        cwd,
        env: { ...withoutParentClaude(envWithCurrentPath()), LOWTIDE_QUIET: '1' },
        windowsHide: true,
        // npm installs ship a .cmd launcher, which Windows only runs through a shell.
        shell: /\.(cmd|bat)$/i.test(path)
      }
    )
    let out = ''
    let err = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('Claude took too long to answer.'))
    }, TIMEOUT_MS)
    child.stdout.setEncoding('utf8').on('data', (d: string) => (out += d))
    child.stderr.setEncoding('utf8').on('data', (d: string) => (err += d))
    child.on('error', (e) => {
      clearTimeout(timer)
      reject(e)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0 && out.trim()) resolvePromise(out)
      else {
        const reason = (err || out).split('\n').find((l) => l.trim())
        reject(new Error(reason ? `Claude: ${reason.trim()}` : 'Claude didn’t answer.'))
      }
    })
    child.stdin.end(input)
  })
}

/** Strips the wrapping a model sometimes adds around "just the message". */
function cleanMessage(raw: string): string {
  let text = raw.trim()
  text = text
    .replace(/^```[a-z]*\n?/i, '')
    .replace(/\n?```$/, '')
    .trim()
  if (/^["'`].*["'`]$/s.test(text)) text = text.slice(1, -1).trim()
  return text
}

export async function writeCommitMessage(path: string): Promise<string> {
  const git = simpleGit(path)
  const [stat, diff] = await Promise.all([
    git.raw(['diff', '--cached', '--stat']),
    git.raw(['diff', '--cached'])
  ])
  if (!diff.trim()) throw new Error('Stage some changes first.')

  let recent = ''
  try {
    recent = await git.raw(['log', '-8', '--format=%s'])
  } catch {
    // no commits yet
  }

  const clipped = diff.length > MAX_DIFF ? `${diff.slice(0, MAX_DIFF)}\n[diff truncated]` : diff
  const input = [
    'Write a git commit message for the staged changes below.',
    '- First line: a concise summary, at most 72 characters, imperative mood.',
    '- If the change is non-trivial, add a blank line and a few short "- " bullet points.',
    '- Do not use any tools. Reply with only the commit message: no quotes, no code fences, no preamble.',
    recent.trim()
      ? `- Match the style of this repo's recent commit subjects:\n${recent.trim()}`
      : '',
    '',
    'Changed files:',
    stat.trim(),
    '',
    'Diff:',
    clipped
  ].join('\n')

  const message = cleanMessage(await runClaudePrint(path, input))
  if (!message) throw new Error('Claude didn’t suggest anything.')
  return message
}
