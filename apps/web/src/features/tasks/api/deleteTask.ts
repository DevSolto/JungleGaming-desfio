import { TASKS_ENDPOINT } from './getTasks'

export async function deleteTask(taskId: string): Promise<void> {
  const response = await fetch(`${TASKS_ENDPOINT}/${taskId}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(
      `Falha ao remover tarefa: ${response.status} ${response.statusText}`,
    )
  }
}
