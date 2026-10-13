import { getDb } from '../db'
import { getProject } from '../db/projects'
import { projectScripts } from './terminals'
import type { RecipeClaude, SessionRecipe } from '../../shared/api'

const CLAUDE_MODES: RecipeClaude[] = ['off', 'fresh', 'task']

/** A sensible first recipe: VS Code, plus the dev server if the project has one. */
function defaultRecipe(projectId: number): SessionRecipe {
  const scripts = projectScripts(projectId)
  const script = ['dev', 'start', 'serve'].find((s) => scripts.includes(s)) ?? null
  return { vscode: true, script, claude: 'off', browser: false }
}

/** Keeps only valid values; a script that no longer exists is dropped. */
function clean(projectId: number, raw: Partial<SessionRecipe>): SessionRecipe {
  const scripts = projectScripts(projectId)
  const script = typeof raw.script === 'string' && scripts.includes(raw.script) ? raw.script : null
  return {
    vscode: raw.vscode !== false,
    script,
    claude: CLAUDE_MODES.includes(raw.claude as RecipeClaude)
      ? (raw.claude as RecipeClaude)
      : 'off',
    browser: script !== null && raw.browser === true
  }
}

export function getRecipe(projectId: number): SessionRecipe {
  if (!getProject(projectId)) throw new Error('Unknown project.')
  const raw = getDb().prepare('SELECT recipe FROM projects WHERE id = ?').pluck().get(projectId) as
    string | null
  if (!raw) return defaultRecipe(projectId)
  try {
    return clean(projectId, JSON.parse(raw) as Partial<SessionRecipe>)
  } catch {
    return defaultRecipe(projectId)
  }
}

export function setRecipe(projectId: number, recipe: SessionRecipe): SessionRecipe {
  if (!getProject(projectId)) throw new Error('Unknown project.')
  const cleaned = clean(projectId, recipe)
  getDb()
    .prepare('UPDATE projects SET recipe = ? WHERE id = ?')
    .run(JSON.stringify(cleaned), projectId)
  return cleaned
}
