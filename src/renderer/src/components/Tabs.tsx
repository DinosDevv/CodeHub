import type { ReactNode } from 'react'

export interface TabItem<T extends string> {
  id: T
  label: string
  /** A count shown after the label (hidden when 0 or missing). */
  badge?: number
  /** A small status dot (e.g. Claude is working), as a Tailwind class. */
  dot?: string
  icon?: ReactNode
}

/** Quiet pill tabs with a sea-glass underline under the selected one. */
export function Tabs<T extends string>({
  items,
  value,
  onChange
}: {
  items: TabItem<T>[]
  value: T
  onChange: (id: T) => void
}): React.JSX.Element {
  return (
    <div role="tablist" className="mb-6 flex animate-rise gap-1 border-b border-line/40">
      {items.map((t) => {
        const active = t.id === value
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={`relative -mb-px flex items-center gap-2 px-4 pt-1 pb-3 text-sm font-semibold transition duration-300 ${
              active ? 'text-fg' : 'text-muted hover:text-fg'
            }`}
          >
            {t.icon}
            {t.label}
            {!!t.badge && (
              <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-muted">
                {t.badge}
              </span>
            )}
            {t.dot && <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />}
            <span
              className={`absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent shadow-[0_0_10px_var(--color-accent)] transition duration-300 ${
                active ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </button>
        )
      })}
    </div>
  )
}
