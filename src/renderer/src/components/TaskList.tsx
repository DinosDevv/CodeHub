import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTasks } from '../hooks/useTasks'
import {
  addTask,
  groupByStatus,
  moveTask,
  statusLabels,
  TASK_DRAG_TYPE,
  type Task,
  type TaskStatus
} from '../lib/tasks'
import { TaskItem } from './TaskItem'
import { EmptyState } from './ui'

const DONE_PREVIEW = 5

/** A project's tasks: add, drag between groups, reorder, finish. */
export function TaskList({ projectId }: { projectId: number }): React.JSX.Element {
  const tasks = useTasks({ projectId })
  const [draft, setDraft] = useState('')
  const [showAllDone, setShowAllDone] = useState(false)
  const [dropBefore, setDropBefore] = useState<number | 'end' | null>(null)
  const [dropGroup, setDropGroup] = useState<TaskStatus | null>(null)

  const submit = async (): Promise<void> => {
    if (!draft.trim()) return
    if (await addTask(projectId, draft)) setDraft('')
  }

  const clearDrop = (): void => {
    setDropBefore(null)
    setDropGroup(null)
  }

  const dropInto = (status: TaskStatus, beforeId: number | null) => (draggedId: number) => {
    clearDrop()
    if (draggedId) moveTask(draggedId, status, beforeId)
  }

  const groups = groupByStatus(tasks ?? [])

  const renderGroup = (status: TaskStatus, items: Task[]): React.JSX.Element | null => {
    if (status !== 'todo' && items.length === 0 && dropGroup !== status) return null
    const visible = status === 'done' && !showAllDone ? items.slice(0, DONE_PREVIEW) : items
    return (
      <section
        key={status}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes(TASK_DRAG_TYPE)) return
          e.preventDefault()
          setDropGroup(status)
          setDropBefore('end')
        }}
        onDrop={(e) => {
          e.preventDefault()
          dropInto(status, null)(Number(e.dataTransfer.getData(TASK_DRAG_TYPE)))
        }}
        className={`rounded-2xl p-1 transition duration-300 ${
          dropGroup === status ? 'bg-glow/5 ring-1 ring-glow/20' : ''
        }`}
      >
        <h3 className="mb-1 px-3 text-xs font-semibold text-muted">
          {statusLabels[status]} <span className="opacity-60">· {items.length}</span>
        </h3>
        <ul className="flex flex-col">
          {visible.map((t) => (
            <TaskItem
              key={t.id}
              task={t}
              dropTarget={dropGroup === status && dropBefore === t.id}
              onDragOverItem={() => {
                setDropGroup(status)
                setDropBefore(t.id)
              }}
              onDropOnItem={dropInto(status, t.id)}
            />
          ))}
        </ul>
        {items.length === 0 && status === 'todo' && (
          <p className="px-3 py-1 text-xs text-muted italic">all clear — add something above.</p>
        )}
        {status === 'done' && items.length > DONE_PREVIEW && (
          <button
            onClick={() => setShowAllDone((v) => !v)}
            className="px-3 py-1 text-xs text-muted transition hover:text-glow"
          >
            {showAllDone ? 'show less' : `show all ${items.length}`}
          </button>
        )}
      </section>
    )
  }

  return (
    <div onDragEnd={clearDrop} onDragLeave={(e) => e.currentTarget === e.target && clearDrop()}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        className="mb-4 flex items-center gap-2 rounded-2xl border border-line/60 bg-bg/30 py-1.5 pr-1.5 pl-4 transition duration-300 focus-within:border-glow/50 focus-within:shadow-[0_0_20px_-8px_var(--color-glow)]"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="what needs doing?"
          className="flex-1 bg-transparent text-sm text-fg outline-none select-text placeholder:text-muted/60"
        />
        <button
          type="submit"
          aria-label="add task"
          disabled={!draft.trim()}
          className="grid h-8 w-8 place-items-center rounded-full bg-accent text-accent-fg transition duration-300 hover:shadow-[0_0_16px_-2px_var(--color-accent)] disabled:opacity-30"
        >
          <Plus size={16} />
        </button>
      </form>

      {tasks === null ? (
        <EmptyState>gathering tasks…</EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {(['doing', 'todo', 'done'] as const).map((s) => renderGroup(s, groups[s]))}
        </div>
      )}
      <p className="mt-3 px-3 text-xs text-muted/70">
        double-click to rename · drag to reorder or move between groups
      </p>
    </div>
  )
}
