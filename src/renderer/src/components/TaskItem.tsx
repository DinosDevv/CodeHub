import { Check, Pause, Play, Sparkles, StickyNote, Trash2 } from 'lucide-react'
import { workOnTask } from '../lib/claude'
import { useState } from 'react'
import {
  moveTask,
  removeTask,
  renameTask,
  setTaskNotes,
  TASK_DRAG_TYPE,
  toggleDone,
  type Task
} from '../lib/tasks'

export function TaskItem({
  task,
  showProject = false,
  draggable = true,
  dropTarget = false,
  onDragOverItem,
  onDropOnItem,
  onOpen
}: {
  task: Task
  showProject?: boolean
  draggable?: boolean
  /** Draws the "drop here" line above this item. */
  dropTarget?: boolean
  onDragOverItem?: () => void
  onDropOnItem?: (draggedId: number) => void
  /** Called when the row itself (not one of its controls) is clicked. */
  onOpen?: () => void
}): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  const done = task.status === 'done'

  const saveTitle = (value: string): void => {
    setEditing(false)
    if (value.trim() && value.trim() !== task.title) renameTask(task.id, value)
  }

  return (
    <li
      draggable={draggable && !editing}
      onDragStart={(e) => {
        e.dataTransfer.setData(TASK_DRAG_TYPE, String(task.id))
        e.dataTransfer.effectAllowed = 'move'
      }}
      onDragOver={(e) => {
        if (!onDropOnItem || !e.dataTransfer.types.includes(TASK_DRAG_TYPE)) return
        e.preventDefault()
        e.stopPropagation()
        onDragOverItem?.()
      }}
      onClick={(e) => {
        if (!onOpen || (e.target as HTMLElement).closest('button, input, textarea')) return
        onOpen()
      }}
      onDrop={(e) => {
        if (!onDropOnItem) return
        e.preventDefault()
        e.stopPropagation()
        onDropOnItem(Number(e.dataTransfer.getData(TASK_DRAG_TYPE)))
      }}
      className={`group relative animate-rise rounded-2xl transition duration-300 hover:bg-surface-2/50 ${
        draggable ? 'cursor-grab active:cursor-grabbing' : onOpen ? 'cursor-pointer' : ''
      }`}
    >
      {dropTarget && (
        <span className="absolute -top-0.5 right-3 left-3 h-0.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
      )}
      <div className="flex items-center gap-3 px-3 py-2">
        <button
          aria-label={done ? 'mark as not done' : 'mark as done'}
          onClick={() => toggleDone(task)}
          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border transition duration-300 ${
            done
              ? 'border-success bg-success/20 text-success'
              : task.status === 'doing'
                ? 'border-accent shadow-[0_0_10px_-2px_var(--color-accent)] hover:bg-accent/20'
                : 'border-muted/60 hover:border-success hover:bg-success/10'
          }`}
        >
          {done && <Check size={12} strokeWidth={3} />}
        </button>

        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              autoFocus
              defaultValue={task.title}
              onBlur={(e) => saveTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle(e.currentTarget.value)
                if (e.key === 'Escape') setEditing(false)
              }}
              className="w-full rounded-lg bg-bg/50 px-2 py-0.5 text-sm text-fg outline-none select-text"
            />
          ) : (
            <p
              onDoubleClick={() => !done && setEditing(true)}
              className={`truncate text-sm transition duration-500 ${
                done ? 'text-muted line-through decoration-muted/60' : ''
              }`}
            >
              {task.title}
            </p>
          )}
          {showProject && <p className="truncate text-xs text-muted">{task.projectName}</p>}
        </div>

        {task.notes && !notesOpen && (
          <StickyNote size={13} className="shrink-0 text-glow/70" aria-label="has notes" />
        )}

        <div className="flex shrink-0 gap-0.5 opacity-0 transition duration-300 group-hover:opacity-100">
          {task.status === 'todo' && (
            <TaskAction label="start working on it" onClick={() => moveTask(task.id, 'doing')}>
              <Play size={13} />
            </TaskAction>
          )}
          {task.status === 'doing' && (
            <TaskAction label="back to up next" onClick={() => moveTask(task.id, 'todo')}>
              <Pause size={13} />
            </TaskAction>
          )}
          {!done && (
            <TaskAction label="work on this with claude" onClick={() => workOnTask(task)}>
              <Sparkles size={13} className="text-accent" />
            </TaskAction>
          )}
          <TaskAction label="notes" onClick={() => setNotesOpen((v) => !v)}>
            <StickyNote size={13} />
          </TaskAction>
          <TaskAction label="delete" danger onClick={() => removeTask(task.id)}>
            <Trash2 size={13} />
          </TaskAction>
        </div>
      </div>

      {notesOpen && (
        <textarea
          autoFocus
          defaultValue={task.notes ?? ''}
          onBlur={(e) => {
            if (e.target.value !== (task.notes ?? '')) setTaskNotes(task.id, e.target.value)
          }}
          rows={3}
          placeholder="details, links, gotchas…"
          className="mx-3 mb-2 block w-[calc(100%-1.5rem)] resize-none rounded-xl border border-line/60 bg-bg/40 px-3 py-2 text-xs text-fg outline-none select-text placeholder:text-muted/60 focus:border-glow/50"
        />
      )}
    </li>
  )
}

function TaskAction({
  label,
  danger = false,
  onClick,
  children
}: {
  label: string
  danger?: boolean
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`grid h-7 w-7 place-items-center rounded-full text-muted transition ${
        danger ? 'hover:bg-danger/15 hover:text-danger' : 'hover:bg-glow/15 hover:text-glow'
      }`}
    >
      {children}
    </button>
  )
}
