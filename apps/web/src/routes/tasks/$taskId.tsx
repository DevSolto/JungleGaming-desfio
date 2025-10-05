import { createFileRoute } from '@tanstack/react-router'

import { TaskDetailsPage } from '@/features/tasks/pages/TaskDetailsPage'

export const Route = createFileRoute('/tasks/$taskId')({
  component: TaskDetailsRoute,
})

function TaskDetailsRoute() {
  const { taskId } = Route.useParams()

  return <TaskDetailsPage taskId={taskId} />
}
