import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Task } from '@contracts'

import { Button } from '@/components/ui/button'
import { router } from '@/router'

import { getTasks, type GetTasksFilters } from '../api/getTasks'
import { CardsView } from '../components/CardsView'
import { KanbanView } from '../components/KanbanView'
import { SearchBar } from '../components/SearchBar'
import { TableView } from '../components/TableView'
import { TaskFilters } from '../components/TaskFilters'
import { TaskModal } from '../components/TaskModal'
import { ViewSwitcher } from '../components/ViewSwitcher'
import { useTaskCreationModal } from '../store/useTaskCreationModal'
import { useTasksFilters } from '../store/useTasksFilters'
import { useTasksView } from '../store/useTasksView'

const containerClassName =
  'mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8'

const sectionTitleClassName =
  'text-2xl font-semibold tracking-tight text-foreground sm:text-3xl'

export function TasksPage() {
  const {
    status,
    priority,
    dueDate,
    searchTerm,
    setSearchTerm,
  } = useTasksFilters()
  const { viewMode } = useTasksView()
  const creationModal = useTaskCreationModal()

  const filters = useMemo<Pick<GetTasksFilters, 'status' | 'priority' | 'dueDate' | 'searchTerm'>>(
    () => ({ status, priority, dueDate, searchTerm }),
    [status, priority, dueDate, searchTerm],
  )

  const tasksQuery = useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => getTasks(filters),
  })

  const tasks = tasksQuery.data ?? []
  const isPending = tasksQuery.isPending
  const isFetching = tasksQuery.isFetching
  const isLoading = isPending || (isFetching && tasks.length === 0)
  const isRefetching = isFetching && !isPending

  const handleTaskSelect = (task: Task) => {
    void router.navigate({
      to: '/tasks/$taskId',
      params: { taskId: task.id },
    })
  }

  const isModalOpen = creationModal.isOpen

  const errorMessage =
    tasksQuery.isError && tasksQuery.error instanceof Error
      ? tasksQuery.error.message
      : tasksQuery.isError
        ? 'Não foi possível carregar as tarefas. Tente novamente.'
        : null

  return (
    <main className={containerClassName}>
      <header className="space-y-2">
        <h1 className={sectionTitleClassName}>Tarefas</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Acompanhe o progresso das tarefas da sua equipe, filtre por status ou
          prioridade e visualize os detalhes com facilidade.
        </p>
      </header>

      <TaskFilters className="shadow-sm" />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <SearchBar
          className="w-full md:max-w-md"
          onTaskSelect={(taskId) => {
            void router.navigate({
              to: '/tasks/$taskId',
              params: { taskId },
            })
          }}
          onSearchTermChange={setSearchTerm}
        />

        <ViewSwitcher className="md:self-end" />
      </div>

      {errorMessage ? (
        <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">Erro ao carregar tarefas</h2>
            <p className="text-sm text-destructive/80">{errorMessage}</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => tasksQuery.refetch()}
            className="w-fit"
          >
            Tentar novamente
          </Button>
        </div>
      ) : null}

      <section className="space-y-6">
        <CardsView
          tasks={tasks}
          isLoading={isLoading}
          onSelectTask={handleTaskSelect}
          onCreateFirstTask={creationModal.open}
        />

        {viewMode === 'list' ? (
          <TableView
            tasks={tasks}
            isLoading={isLoading && !isRefetching}
            onSelectTask={handleTaskSelect}
            onCreateFirstTask={creationModal.open}
          />
        ) : (
          <KanbanView
            tasks={tasks}
            isLoading={isLoading}
            onSelectTask={handleTaskSelect}
            onCreateFirstTask={creationModal.open}
          />
      )}
      </section>

      <TaskModal
        open={isModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            creationModal.close()
          }
        }}
      />
    </main>
  )
}
