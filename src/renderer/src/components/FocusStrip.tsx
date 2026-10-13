import { Coffee, Play, TimerReset } from 'lucide-react'
import { useFocus } from '../hooks/useFocus'
import { endBreak, formatCountdown, snoozeBreak, takeBreak } from '../lib/focus'
import { Button } from './ui'

/** The focus rhythm under the session clock: progress, the break nudge, the break countdown. */
export function FocusStrip({ compact = false }: { compact?: boolean }): React.JSX.Element | null {
  const focus = useFocus()
  if (!focus || focus.phase === 'off') return null

  if (focus.phase === 'break') {
    const over = focus.breakLeftMs === 0
    return compact ? (
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className={over ? 'text-accent' : 'text-glow'}>
          {over ? 'break’s over' : `☕ ${formatCountdown(focus.breakLeftMs)}`}
        </span>
        <button
          onClick={endBreak}
          className="rounded-full px-2 py-0.5 font-semibold text-accent transition hover:bg-accent/15"
        >
          back to it
        </button>
      </div>
    ) : (
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-glow/5 px-5 py-4">
        <div className="flex items-center gap-3">
          <Coffee size={20} className="text-glow" />
          <div>
            <p className="text-sm font-semibold">
              {over ? 'the tide’s coming back in' : 'stretch, sip, look out the window'}
            </p>
            <p className="text-xs text-muted">
              {over ? 'back to it when you’re ready.' : 'the session clock waits for you.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {!over && (
            <span className="font-display text-3xl font-light text-glow tabular-nums">
              {formatCountdown(focus.breakLeftMs)}
            </span>
          )}
          <Button onClick={endBreak}>
            <Play size={16} /> back to it
          </Button>
        </div>
      </div>
    )
  }

  const due = focus.phase === 'due'
  const bar = (
    <div className="h-1.5 overflow-hidden rounded-full bg-bg/60">
      <div
        className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
          due
            ? 'animate-breathe bg-glow shadow-[0_0_10px_var(--color-glow)]'
            : 'bg-gradient-to-r from-deep to-accent'
        }`}
        style={{ width: `${Math.max(focus.progress * 100, 1.5)}%` }}
      />
    </div>
  )

  if (compact) {
    return (
      <div className="mt-2">
        {bar}
        {due && (
          <button
            onClick={takeBreak}
            className="mt-2 flex items-center gap-1 text-xs font-semibold text-glow transition hover:brightness-125"
          >
            <Coffee size={12} /> break?
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className={due ? 'text-glow' : 'text-muted'}>
          {due ? 'time for a breather ☕' : 'focus'}
        </span>
        <span className="text-muted">
          <span className="font-display text-base text-fg">{focus.focusedMin}</span> of{' '}
          {focus.goalMin} min
        </span>
      </div>
      {bar}
      {due && (
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" onClick={snoozeBreak}>
            <TimerReset size={15} /> 5 more min
          </Button>
          <Button onClick={takeBreak}>
            <Coffee size={15} /> take a break
          </Button>
        </div>
      )}
    </div>
  )
}
