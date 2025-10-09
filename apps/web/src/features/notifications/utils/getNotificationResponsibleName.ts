import type { NotificationDTO } from '@repo/types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getTrimmedValue(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
}

export function getNotificationResponsibleName(
  notification: NotificationDTO,
): string | null {
  const metadata = notification.metadata

  if (!isRecord(metadata)) {
    return null
  }

  const metadataCandidates: Array<string | null> = []

  const commentAuthorName = getTrimmedValue(metadata['commentAuthorName'])
  const actorDisplayName = getTrimmedValue(metadata['actorDisplayName'])

  metadataCandidates.push(commentAuthorName, actorDisplayName)

  if (isRecord(metadata['actor'])) {
    metadataCandidates.push(getTrimmedValue(metadata['actor']['displayName']))
  }

  for (const candidate of metadataCandidates) {
    if (candidate) {
      return candidate
    }
  }

  return null
}
