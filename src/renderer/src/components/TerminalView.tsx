import { useEffect, useRef } from 'react'
import { attachTerminal, fitTerminal } from '../lib/terminals'

/** Shows one terminal; the xterm instance itself outlives this component. */
export function TerminalView({ id }: { id: number }): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = ref.current!
    const detach = attachTerminal(id, host)
    const observer = new ResizeObserver(() => fitTerminal(id))
    observer.observe(host)
    return () => {
      observer.disconnect()
      detach()
    }
  }, [id])

  return <div ref={ref} className="h-full w-full overflow-hidden rounded-xl bg-bg/55 px-3 py-2" />
}
