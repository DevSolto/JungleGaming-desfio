export async function extractErrorMessage(
  response: Response,
  fallbackMessage: string,
  context?: string,
): Promise<string> {
  try {
    const text = await response.text()

    if (!text) {
      return fallbackMessage
    }

    const data = (JSON.parse(text) as
      | { message?: string | string[]; error?: string }
      | undefined)

    if (Array.isArray(data?.message)) {
      return (data.message as string[]).join(', ')
    }

    if (typeof data?.message === 'string') {
      return data.message
    }

    if (typeof data?.error === 'string') {
      return data.error
    }
  } catch (error) {
    if (context) {
      console.error(`Erro ao interpretar resposta de ${context}:`, error)
    } else {
      console.error('Erro ao interpretar resposta:', error)
    }
  }

  return fallbackMessage
}
