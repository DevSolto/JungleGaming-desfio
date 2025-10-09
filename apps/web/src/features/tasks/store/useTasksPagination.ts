import { create } from 'zustand'

interface TasksPaginationState {
  page: number
  pageSize: number
  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void
  resetPagination: () => void
}

const initialState = {
  page: 1,
  pageSize: 10,
} satisfies Pick<TasksPaginationState, 'page' | 'pageSize'>

export const useTasksPagination = create<TasksPaginationState>((set) => ({
  ...initialState,
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize }),
  resetPagination: () =>
    set((state) => ({
      page: initialState.page,
      pageSize: state.pageSize,
    })),
}))
