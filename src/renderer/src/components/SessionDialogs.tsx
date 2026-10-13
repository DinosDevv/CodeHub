import { useSessionDialog } from '../hooks/useSessionDialog'
import { StartSessionDialog } from './StartSessionDialog'
import { WrapUpDialog } from './WrapUpDialog'

export function SessionDialogs(): React.JSX.Element | null {
  const dialog = useSessionDialog()
  if (dialog.kind === 'start') return <StartSessionDialog initialProjectId={dialog.projectId} />
  if (dialog.kind === 'wrapUp') return <WrapUpDialog />
  return null
}
