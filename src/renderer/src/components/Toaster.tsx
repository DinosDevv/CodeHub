import { CheckCircle2, Info, TriangleAlert } from 'lucide-react'
import { useToasts } from '../hooks/useToasts'
import { dismissToast, type ToastKind } from '../lib/toast'

const icons: Record<ToastKind, React.JSX.Element> = {
  info: <Info size={16} className="text-glow" />,
  success: <CheckCircle2 size={16} className="text-success" />,
  error: <TriangleAlert size={16} className="text-danger" />
}

export function Toaster(): React.JSX.Element {
  const toasts = useToasts()
  return (
    <div className="pointer-events-none fixed right-6 bottom-6 z-50 flex flex-col items-end gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className="pointer-events-auto flex animate-rise items-center gap-2 rounded-2xl border border-line/70 bg-surface-2/80 px-4 py-2.5 text-sm shadow-[0_8px_30px_-8px_rgb(0_0_0/0.7)] backdrop-blur-xl"
        >
          {icons[t.kind]}
          {t.message}
        </button>
      ))}
    </div>
  )
}
