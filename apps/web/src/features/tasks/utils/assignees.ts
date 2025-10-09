import type { TaskAssignee } from '@repo/types'
import type { User } from '@/features/users/schemas/userSchema'

export function mapUserToTaskAssignee(user: User): TaskAssignee {
  const trimmedName = typeof user.name === 'string' ? user.name.trim() : ''
  const trimmedEmail = typeof user.email === 'string' ? user.email.trim() : ''
  const username = trimmedName || trimmedEmail || user.id

  const assignee: TaskAssignee = {
    id: user.id,
    username,
  }

  if (trimmedName) {
    assignee.name = trimmedName
  }

  if (trimmedEmail) {
    assignee.email = trimmedEmail
  }

  return assignee
}

export function getTaskAssigneeDisplayName(assignee: TaskAssignee): string {
  if (!assignee) {
    return ''
  }

  const username =
    typeof assignee.username === 'string' ? assignee.username.trim() : ''

  if (username) {
    return username
  }

  const name = typeof assignee.name === 'string' ? assignee.name.trim() : ''
  if (name) {
    return name
  }

  const email = typeof assignee.email === 'string' ? assignee.email.trim() : ''
  if (email) {
    return email
  }

  return assignee.id
}
