import { TaskPriority, TaskStatus } from '@contracts'
import { create } from 'zustand'

type StatusFilter = 'ALL' | TaskStatus
type PriorityFilter = 'ALL' | TaskPriority
type DueDateFilter = string | null

interface TasksFiltersState {
  searchTerm: string
  status: StatusFilter
  priority: PriorityFilter
  dueDate: DueDateFilter
  setSearchTerm: (searchTerm: string) => void
  setStatus: (status: StatusFilter) => void
  setPriority: (priority: PriorityFilter) => void
  setDueDate: (dueDate: DueDateFilter) => void
  resetFilters: () => void
}

const initialState: Pick<
  TasksFiltersState,
  'searchTerm' | 'status' | 'priority' | 'dueDate'
> = {
  searchTerm: '',
  status: 'ALL',
  priority: 'ALL',
  dueDate: null,
}

export const useTasksFilters = create<TasksFiltersState>((set) => ({
  ...initialState,
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setStatus: (status) => set({ status }),
  setPriority: (priority) => set({ priority }),
  setDueDate: (dueDate) => set({ dueDate }),
  resetFilters: () => set(initialState),
}))

export type { DueDateFilter, PriorityFilter, StatusFilter }
