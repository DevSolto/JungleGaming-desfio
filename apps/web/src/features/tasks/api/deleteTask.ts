import { fetchWithAuth } from '@/lib/apiClient'

import { TASKS_ENDPOINT } from './getTasks'

export async function deleteTask(taskId: string): Promise<void> {
  const response = await fetchWithAuth(`${TASKS_ENDPOINT}/${taskId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(
      `Falha ao remover tarefa: ${response.status} ${response.statusText}`,
    )
  }
}
