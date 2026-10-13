import { useProjectScripts } from '../hooks/useTerminals'
import { useRecipe } from '../hooks/useRecipe'
import type { RecipeClaude } from '../lib/recipes'
import { Toggle } from './ui'

const claudeModes: { id: RecipeClaude; label: string }[] = [
  { id: 'off', label: 'off' },
  { id: 'fresh', label: 'fresh tab' },
  { id: 'task', label: 'on my next task' }
]

/** "When the session starts…" — a project's recipe, edited in place and saved. */
export function RecipeEditor({
  projectId,
  projectName
}: {
  projectId: number
  projectName: string
}): React.JSX.Element {
  const { recipe, update } = useRecipe(projectId)
  const scripts = useProjectScripts(projectId)

  if (!recipe) return <div className="h-40" />

  return (
    <div className="animate-rise rounded-2xl bg-bg/40 p-4">
      <p className="mb-3 text-xs font-semibold tracking-wider text-muted">
        when the session starts
      </p>
      <div className="flex flex-col gap-3">
        <Toggle checked={recipe.vscode} onChange={(vscode) => update({ vscode })}>
          open in vs code
        </Toggle>

        {scripts.length > 0 ? (
          <Toggle
            checked={recipe.script !== null}
            onChange={(on) =>
              update(
                on
                  ? { script: scripts.includes('dev') ? 'dev' : scripts[0] }
                  : { script: null, browser: false }
              )
            }
          >
            run
            <select
              value={recipe.script ?? ''}
              disabled={recipe.script === null}
              onChange={(e) => update({ script: e.target.value })}
              className="rounded-full border border-line/70 bg-surface/70 px-3 py-0.5 font-mono text-xs text-fg outline-none focus:border-glow/50 disabled:opacity-50"
            >
              {recipe.script === null && <option value="">a script</option>}
              {scripts.map((s) => (
                <option key={s} value={s}>
                  npm run {s}
                </option>
              ))}
            </select>
          </Toggle>
        ) : (
          <p className="pl-12 text-xs text-muted italic">no npm scripts in this project.</p>
        )}

        <Toggle
          checked={recipe.browser}
          disabled={recipe.script === null}
          onChange={(browser) => update({ browser })}
        >
          open it in the browser once it&apos;s ready
        </Toggle>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="w-9 text-center text-accent">✦</span>
          claude
          <div className="flex rounded-full bg-surface/70 p-0.5">
            {claudeModes.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => update({ claude: m.id })}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition duration-300 ${
                  recipe.claude === m.id
                    ? 'bg-accent/80 text-accent-fg'
                    : 'text-muted hover:text-fg'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted/80">remembered for {projectName}.</p>
    </div>
  )
}
