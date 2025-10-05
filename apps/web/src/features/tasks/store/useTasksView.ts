import { create } from 'zustand'

type TasksViewMode = 'list' | 'board'
type TasksSortBy = 'createdAt' | 'dueDate' | 'priority'
type SortDirection = 'asc' | 'desc'

interface TasksViewState {
  viewMode: TasksViewMode
  sortBy: TasksSortBy
  sortDirection: SortDirection
  setViewMode: (viewMode: TasksViewMode) => void
  setSortBy: (sortBy: TasksSortBy) => void
  setSortDirection: (sortDirection: SortDirection) => void
  toggleSortDirection: () => void
}

export const useTasksView = create<TasksViewState>((set) => ({
  viewMode: 'list',
  sortBy: 'createdAt',
  sortDirection: 'desc',
  setViewMode: (viewMode) => set({ viewMode }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortDirection: (sortDirection) => set({ sortDirection }),
  toggleSortDirection: () =>
    set((state) => ({
      sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc',
    })),
}))

export type { SortDirection, TasksSortBy, TasksViewMode }
