import { useEffect, type ReactNode } from 'react'

export function Modal({
  title,
  onClose,
  children,
  width = 'max-w-lg'
}: {
  title: string
  onClose: () => void
  children: ReactNode
  width?: string
}): React.JSX.Element {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-bg/60 p-6 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={`w-full ${width} animate-rise rounded-card border border-line/70 bg-surface/90 p-6 shadow-[0_20px_80px_-20px_rgb(0_0_0/0.8),0_0_60px_-30px_var(--color-glow)] backdrop-blur-2xl`}
      >
        <h2 className="mb-4 text-xl font-bold">{title}</h2>
        {children}
      </div>
    </div>
  )
}
