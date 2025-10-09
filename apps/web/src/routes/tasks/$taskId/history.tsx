import { createFileRoute } from '@tanstack/react-router'

import { TaskHistoryPage } from '@/features/tasks/pages/TaskHistoryPage'

export const Route = createFileRoute('/tasks/$taskId/history')({
  component: TaskHistoryRoute,
})

function TaskHistoryRoute() {
  const { taskId } = Route.useParams()

  return <TaskHistoryPage taskId={taskId} />
}
