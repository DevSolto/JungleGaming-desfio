import { TaskPriority, TaskStatus } from '@repo/types'
import { create } from 'zustand'

type StatusFilter = 'ALL' | TaskStatus
type PriorityFilter = 'ALL' | TaskPriority
type DueDateFilter = string | null

interface TasksFiltersState {
  searchTerm: string
  status: StatusFilter
  priority: PriorityFilter
  dueDate: DueDateFilter
  assigneeId: string | null
  assigneeName: string | null
  setSearchTerm: (searchTerm: string) => void
  setStatus: (status: StatusFilter) => void
  setPriority: (priority: PriorityFilter) => void
  setDueDate: (dueDate: DueDateFilter) => void
  setAssignee: (assignee: { id: string | null; name: string | null }) => void
  resetFilters: () => void
}

const initialState: Pick<
  TasksFiltersState,
  'searchTerm' | 'status' | 'priority' | 'dueDate' | 'assigneeId' | 'assigneeName'
> = {
  searchTerm: '',
  status: 'ALL',
  priority: 'ALL',
  dueDate: null,
  assigneeId: null,
  assigneeName: null,
}

export const useTasksFilters = create<TasksFiltersState>((set) => ({
  ...initialState,
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setStatus: (status) => set({ status }),
  setPriority: (priority) => set({ priority }),
  setDueDate: (dueDate) => set({ dueDate }),
  setAssignee: ({ id, name }) => set({ assigneeId: id, assigneeName: name }),
  resetFilters: () => set({ ...initialState }),
}))

export type { DueDateFilter, PriorityFilter, StatusFilter }
