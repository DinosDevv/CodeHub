import { useTasks } from '../hooks/useTasks'
import type { Navigate } from '../lib/navigation'
import { TaskItem } from './TaskItem'
import { Card, EmptyState } from './ui'

/** Dashboard card: what's in progress and up next across every project. */
export function OpenTasks({
  navigate,
  className = '',
  delay
}: {
  navigate: Navigate
  className?: string
  delay: number
}): React.JSX.Element {
  const tasks = useTasks({ statuses: ['doing', 'todo'], limit: 8 })

  return (
    <Card title="open tasks" className={className} delay={delay}>
      {tasks === null ? null : tasks.length === 0 ? (
        <EmptyState>nothing on the list — enjoy the quiet.</EmptyState>
      ) : (
        <ul className="-mx-3 flex flex-col">
          {tasks.map((t) => (
            <TaskItem
              key={t.id}
              task={t}
              showProject
              draggable={false}
              onOpen={() => navigate({ page: 'project', id: t.projectId })}
            />
          ))}
        </ul>
      )}
    </Card>
  )
}
