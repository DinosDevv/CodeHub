import { ExternalLink, Play, Sparkles, SquareTerminal } from 'lucide-react'
import { useProjectScripts, useTerminalSupport, useTerminals } from '../hooks/useTerminals'
import { openDock, setActiveTerminal, showClaudeHint } from '../lib/dock'
import { openLocalUrl } from '../lib/recipes'
import { openTerminal } from '../lib/terminals'
import { Button, Card } from './ui'

/** Project page card: open a shell, Claude, or run an npm script. */
export function ProjectTerminals({
  projectId,
  delay
}: {
  projectId: number
  delay: number
}): React.JSX.Element {
  const scripts = useProjectScripts(projectId)
  const support = useTerminalSupport()
  const servers = useTerminals().filter(
    (t) => t.projectId === projectId && t.exitCode === null && t.urls.length > 0
  )

  const openClaude = (): void => {
    if (support && !support.claude) showClaudeHint(true)
    else openTerminal({ projectId, kind: 'claude' })
  }

  return (
    <Card title="terminal" delay={delay}>
      {servers.length > 0 && (
        <ul className="mb-4 flex flex-col gap-1.5">
          {servers.map((t) => (
            <li key={t.id} className="flex items-center gap-2 text-sm">
              <span className="h-1.5 w-1.5 animate-breathe rounded-full bg-success shadow-[0_0_8px_var(--color-success)]" />
              <button
                onClick={() => {
                  setActiveTerminal(t.id)
                  openDock()
                }}
                className="truncate text-muted transition hover:text-fg"
              >
                {t.title.replace(/^npm run /, '')}
              </button>
              <button
                onClick={() => openLocalUrl(t.urls[0])}
                className="ml-auto flex shrink-0 items-center gap-1 font-mono text-xs text-accent transition hover:brightness-125"
              >
                {t.urls[0].replace(/^https?:\/\//, '').replace(/\/$/, '')}
                <ExternalLink size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" onClick={() => openTerminal({ projectId, kind: 'shell' })}>
          <SquareTerminal size={16} /> shell
        </Button>
        <Button variant="ghost" onClick={openClaude}>
          <Sparkles size={16} className="text-accent" /> claude
        </Button>
      </div>
      {scripts.length > 0 && (
        <>
          <p className="mt-4 mb-2 text-xs font-semibold text-muted">scripts</p>
          <div className="flex flex-wrap gap-1.5">
            {scripts.map((s) => (
              <button
                key={s}
                onClick={() => openTerminal({ projectId, kind: 'script', script: s })}
                className="flex items-center gap-1.5 rounded-full border border-line/70 px-3 py-1 font-mono text-xs text-muted transition duration-300 hover:border-accent/50 hover:bg-accent/10 hover:text-accent"
              >
                <Play size={11} /> {s}
              </button>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
