import type { RecipeClaude, SessionRecipe } from '../../../shared/api'
import { openClaudeTab, workOnTask } from './claude'
import { errorMessage } from './errors'
import { openInVSCode, type Project } from './projects'
import { listTasks } from './tasks'
import { listTerminals, onTerminalsChanged, openTerminal } from './terminals'
import { toast } from './toast'

export type { RecipeClaude, SessionRecipe }

export const getRecipe = (projectId: number): Promise<SessionRecipe> =>
  window.api.projects.getRecipe(projectId)

export async function saveRecipe(
  projectId: number,
  recipe: SessionRecipe
): Promise<SessionRecipe | null> {
  try {
    return await window.api.projects.setRecipe(projectId, recipe)
  } catch (e) {
    toast(errorMessage(e), 'error')
    return null
  }
}

/** Opens a local address in the real browser (the main process allows http(s) only). */
export function openLocalUrl(url: string): void {
  window.open(url)
}

/** How long to wait for a dev server to print its address. */
const URL_WAIT_MS = 3 * 60 * 1000

/** Opens the terminal's first local address in the browser as soon as it appears. */
function openWhenReady(terminalId: number): void {
  let done = false
  const check = async (): Promise<void> => {
    if (done) return
    const term = (await listTerminals()).find((t) => t.id === terminalId)
    if (!term || term.exitCode !== null) return stop()
    if (term.urls[0]) {
      openLocalUrl(term.urls[0])
      toast(`${term.projectName} is up at ${term.urls[0].replace(/^https?:\/\//, '')} ↗`, 'success')
      stop()
    }
  }
  const unsubscribe = onTerminalsChanged(check)
  const timer = setTimeout(stop, URL_WAIT_MS)
  function stop(): void {
    done = true
    unsubscribe()
    clearTimeout(timer)
  }
  check()
}

/** Sets up the room: editor, dev server, browser, Claude, in that order. */
export async function runRecipe(project: Project, recipe: SessionRecipe): Promise<void> {
  if (recipe.vscode) await openInVSCode(project)

  if (recipe.script) {
    const title = `npm run ${recipe.script}`
    // Don't start a second dev server if one is already running here.
    const running = (await listTerminals()).find(
      (t) => t.projectId === project.id && t.title === title && t.exitCode === null
    )
    const term =
      running ??
      (await openTerminal({ projectId: project.id, kind: 'script', script: recipe.script }))
    if (term && recipe.browser) openWhenReady(term.id)
  }

  if (recipe.claude === 'task') {
    const [next] = await listTasks({ projectId: project.id, statuses: ['doing', 'todo'], limit: 1 })
    if (next) await workOnTask(next)
    else await openClaudeTab(project.id)
  } else if (recipe.claude === 'fresh') {
    await openClaudeTab(project.id)
  }
}

/** "vs code · npm run dev · browser · claude on next task" */
export function describeRecipe(recipe: SessionRecipe): string {
  const parts: string[] = []
  if (recipe.vscode) parts.push('vs code')
  if (recipe.script) parts.push(`npm run ${recipe.script}`)
  if (recipe.script && recipe.browser) parts.push('browser')
  if (recipe.claude === 'fresh') parts.push('claude')
  if (recipe.claude === 'task') parts.push('claude on your next task')
  return parts.length ? parts.join(' · ') : 'just the timer'
}
