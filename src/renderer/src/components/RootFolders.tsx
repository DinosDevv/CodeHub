import { FolderPlus, X } from 'lucide-react'
import { prettyPath } from '../lib/projects'
import { Button, EmptyState, IconButton } from './ui'

export function RootFolders({
  roots,
  onAdd,
  onRemove
}: {
  roots: string[]
  onAdd: () => void
  onRemove: (root: string) => void
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      {roots.length === 0 ? (
        <EmptyState>no folders yet — point me at where your projects live.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-2">
          {roots.map((r) => (
            <li
              key={r}
              className="flex items-center justify-between gap-3 rounded-2xl border border-line/50 bg-surface-2/40 py-1.5 pr-1.5 pl-4"
            >
              <span className="truncate font-mono text-xs" title={r}>
                {prettyPath(r)}
              </span>
              <IconButton label="remove folder" onClick={() => onRemove(r)}>
                <X size={14} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      <div>
        <Button variant="ghost" onClick={onAdd}>
          <FolderPlus size={16} /> add folder
        </Button>
      </div>
    </div>
  )
}
