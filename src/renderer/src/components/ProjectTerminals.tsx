import { Play, Sparkles, SquareTerminal } from 'lucide-react'
import { useProjectScripts, useTerminalSupport } from '../hooks/useTerminals'
import { showClaudeHint } from '../lib/dock'
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

  const openClaude = (): void => {
    if (support && !support.claude) showClaudeHint(true)
    else openTerminal({ projectId, kind: 'claude' })
  }

  return (
    <Card title="terminal" delay={delay}>
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
