import { Copy, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useDock } from '../hooks/useTerminals'
import { showClaudeHint } from '../lib/dock'
import { getTerminalSupport } from '../lib/terminals'
import { toast } from '../lib/toast'
import { Modal } from './Modal'
import { Button } from './ui'

const installs = [
  { label: 'native installer (PowerShell)', command: 'irm https://claude.ai/install.ps1 | iex' },
  { label: 'or with npm', command: 'npm install -g @anthropic-ai/claude-code' }
]

/** Shown when you open a Claude tab but the `claude` command isn't installed. */
export function ClaudeInstallDialog(): React.JSX.Element | null {
  const { claudeHintOpen } = useDock()
  const [checking, setChecking] = useState(false)
  if (!claudeHintOpen) return null

  const close = (): void => showClaudeHint(false)

  const checkAgain = async (): Promise<void> => {
    setChecking(true)
    const support = await getTerminalSupport()
    setChecking(false)
    if (support.claude) {
      close()
      toast('claude code found ✦ open a claude tab with +', 'success')
    } else {
      toast("still can't find `claude` — a restart of lowtide may help after installing")
    }
  }

  return (
    <Modal title="claude code isn't installed yet" onClose={close}>
      <p className="text-sm text-muted">
        the claude tab runs the <span className="font-mono text-fg">claude</span> command in your
        project folder. install it once in any terminal:
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {installs.map((i) => (
          <div key={i.command}>
            <p className="mb-1 text-xs font-semibold text-muted">{i.label}</p>
            <div className="flex items-center gap-2 rounded-xl border border-line/60 bg-bg/50 py-1.5 pr-1.5 pl-3">
              <code className="flex-1 truncate font-mono text-xs select-text">{i.command}</code>
              <button
                aria-label="copy command"
                onClick={() => {
                  navigator.clipboard.writeText(i.command)
                  toast('copied')
                }}
                className="grid h-7 w-7 place-items-center rounded-full text-muted transition hover:bg-glow/15 hover:text-glow"
              >
                <Copy size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={close}>
          later
        </Button>
        <Button onClick={checkAgain} disabled={checking}>
          <Sparkles size={16} /> {checking ? 'checking…' : "i've installed it"}
        </Button>
      </div>
    </Modal>
  )
}
