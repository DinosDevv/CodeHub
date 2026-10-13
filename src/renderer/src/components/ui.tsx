import { ChevronRight } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

// Shared building blocks. Restyle here and every page follows.

export function Card({
  title,
  action,
  children,
  className = '',
  delay = 0
}: {
  title?: string
  /** Small control shown at the right of the title row. */
  action?: ReactNode
  children: ReactNode
  className?: string
  /** Stagger for the entrance animation, in ms. */
  delay?: number
}): React.JSX.Element {
  return (
    <section
      style={{ animationDelay: `${delay}ms` }}
      className={`animate-rise rounded-card border border-transparent bg-surface/40 p-5 backdrop-blur-xl transition duration-500 hover:border-line/50 ${className}`}
    >
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && (
            <h2 className="text-xs font-semibold tracking-wider text-muted lowercase">{title}</h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

/** A quiet section header that folds its content away. */
export function Collapsible({
  title,
  open,
  onToggle,
  summary,
  children
}: {
  title: string
  open: boolean
  onToggle: () => void
  /** Shown next to the title while folded, e.g. "2h 50m this week". */
  summary?: ReactNode
  children: ReactNode
}): React.JSX.Element {
  return (
    <section className="animate-rise">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-surface/40"
      >
        <ChevronRight
          size={16}
          className={`text-muted transition duration-300 group-hover:text-accent ${open ? 'rotate-90' : ''}`}
        />
        <span className="text-xs font-semibold tracking-wider text-muted lowercase">{title}</span>
        {!open && summary && <span className="text-sm text-muted/80">· {summary}</span>}
        <span className="h-px flex-1 bg-line/40" />
      </button>
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${
          open ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </section>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}): React.JSX.Element {
  return (
    <header className="mb-8 flex animate-rise items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-4xl font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-1 truncate text-sm text-muted" title={subtitle}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </header>
  )
}

type ButtonVariant = 'primary' | 'ghost'

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-fg shadow-[0_0_24px_-6px_var(--color-accent)] hover:shadow-[0_0_32px_-4px_var(--color-accent)] hover:-translate-y-0.5',
  ghost: 'border border-line bg-surface/40 text-fg hover:border-glow/40 hover:bg-surface-2/70'
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }): React.JSX.Element {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition duration-300 disabled:pointer-events-none disabled:opacity-40 ${buttonVariants[variant]} ${className}`}
      {...props}
    />
  )
}

export function EmptyState({ children }: { children: ReactNode }): React.JSX.Element {
  return <p className="text-sm text-muted italic">{children}</p>
}

export function IconButton({
  label,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }): React.JSX.Element {
  return (
    <button
      title={label}
      aria-label={label}
      className={`grid h-9 w-9 place-items-center rounded-full border border-line/70 bg-surface/50 text-muted transition duration-300 hover:border-glow/50 hover:text-glow hover:shadow-[0_0_16px_-4px_var(--color-glow)] disabled:pointer-events-none disabled:opacity-40 ${className}`}
      {...props}
    />
  )
}

export function Chip({
  children,
  tone = 'default'
}: {
  children: ReactNode
  tone?: 'default' | 'accent' | 'glow' | 'success' | 'warning' | 'danger'
}): React.JSX.Element {
  const tones = {
    default: 'border-line/70 text-muted',
    accent: 'border-accent/30 bg-accent/10 text-accent',
    glow: 'border-glow/30 bg-glow/10 text-glow',
    success: 'border-success/30 bg-success/10 text-success',
    warning: 'border-warning/30 bg-warning/10 text-warning',
    danger: 'border-danger/30 bg-danger/10 text-danger'
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

export function SearchInput({
  value,
  onChange,
  placeholder
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}): React.JSX.Element {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-56 rounded-full border border-line/70 bg-surface/50 px-4 py-2 text-sm text-fg backdrop-blur-xl transition duration-300 outline-none placeholder:text-muted/70 focus:w-72 focus:border-glow/50 focus:shadow-[0_0_20px_-6px_var(--color-glow)]"
    />
  )
}
