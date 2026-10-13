import type { ButtonHTMLAttributes, ReactNode } from 'react'

// Shared building blocks. Restyle here and every page follows.

export function Card({
  title,
  children,
  className = '',
  delay = 0
}: {
  title?: string
  children: ReactNode
  className?: string
  /** Stagger for the entrance animation, in ms. */
  delay?: number
}): React.JSX.Element {
  return (
    <section
      style={{ animationDelay: `${delay}ms` }}
      className={`animate-rise rounded-card border border-line/60 bg-surface/55 p-5 shadow-[0_8px_40px_-12px_rgb(0_0_0/0.6)] backdrop-blur-xl transition duration-500 hover:border-glow/30 hover:shadow-[0_8px_40px_-12px_var(--color-glow)] ${className}`}
    >
      {title && <h2 className="mb-3 text-sm font-semibold text-muted lowercase">{title}</h2>}
      {children}
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
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
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition duration-300 disabled:pointer-events-none disabled:opacity-40 ${buttonVariants[variant]} ${className}`}
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
