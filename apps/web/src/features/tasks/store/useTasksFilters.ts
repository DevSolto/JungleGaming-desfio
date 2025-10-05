import { TaskPriority, TaskStatus } from '@contracts'
import { create } from 'zustand'

type StatusFilter = 'ALL' | TaskStatus
type PriorityFilter = 'ALL' | TaskPriority

interface TasksFiltersState {
  searchTerm: string
  status: StatusFilter
  priority: PriorityFilter
  setSearchTerm: (searchTerm: string) => void
  setStatus: (status: StatusFilter) => void
  setPriority: (priority: PriorityFilter) => void
  resetFilters: () => void
}

const initialState: Pick<TasksFiltersState, 'searchTerm' | 'status' | 'priority'> = {
  searchTerm: '',
  status: 'ALL',
  priority: 'ALL',
}

export const useTasksFilters = create<TasksFiltersState>((set) => ({
  ...initialState,
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setStatus: (status) => set({ status }),
  setPriority: (priority) => set({ priority }),
  resetFilters: () => set(initialState),
}))

export type { PriorityFilter, StatusFilter }
