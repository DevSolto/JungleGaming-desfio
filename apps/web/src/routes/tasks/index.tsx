import { createFileRoute } from '@tanstack/react-router'

import { TasksPage } from '@/features/tasks/pages/TasksPage'

export const Route = createFileRoute('/tasks/')({
  component: TasksRoute,
})

function TasksRoute() {
  return <TasksPage />
}
