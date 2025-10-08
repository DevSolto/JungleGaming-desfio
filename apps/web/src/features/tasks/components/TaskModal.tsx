import { useEffect, useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type Task, TaskPriority, TaskStatus } from '@repo/types'
import {
  dateStringToISOString,
  resolveTaskTimezone,
} from '@repo/types/utils/datetime'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'

import { createTask } from '../api/createTask'
import { updateTask } from '../api/updateTask'
import { type TaskSchema, taskSchema } from '../schemas/taskSchema'

interface TaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task | null
  onSuccess?: (task: Task) => void
}

function formatTaskToFormValues(task?: Task | null): TaskSchema {
  if (!task) {
    return {
      id: '',
      title: '',
      description: '',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: '',
      assignees: [],
      createdAt: '',
      updatedAt: '',
    }
  }

  return {
    id: task.id,
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
    assignees: task.assignees ?? [],
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }
}

function normalizeFormValues(values: TaskSchema, timeZone: string) {
  return {
    title: values.title.trim(),
    description: values.description?.trim() ? values.description.trim() : null,
    status: values.status,
    priority: values.priority,
    dueDate: values.dueDate
      ? dateStringToISOString(values.dueDate, timeZone)
      : null,
    assignees: values.assignees,
  }
}

export function TaskModal({ open, onOpenChange, task, onSuccess }: TaskModalProps) {
  const queryClient = useQueryClient()
  const isEditing = Boolean(task)
  const timeZone = useMemo(() => resolveTaskTimezone(), [])

  const defaultValues = useMemo(() => formatTaskToFormValues(task), [task])

  const form = useForm<TaskSchema>({
    resolver: zodResolver(taskSchema),
    defaultValues,
  })

  useEffect(() => {
    if (open) {
      form.reset(formatTaskToFormValues(task))
    }
  }, [form, task, open])

  const mutation = useMutation({
    mutationFn: async (values: TaskSchema) => {
      const payload = normalizeFormValues(values, timeZone)

      if (isEditing && task) {
        return updateTask(task.id, payload)
      }

      return createTask(payload)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task', data.id] })
      toast({
        title: isEditing ? 'Tarefa atualizada' : 'Tarefa criada',
        description: `A tarefa "${data.title}" foi ${isEditing ? 'atualizada' : 'criada'} com sucesso.`,
      })
      onSuccess?.(data)
      onOpenChange(false)
      form.reset(formatTaskToFormValues(isEditing ? data : null))
    },
    onError: (error: unknown) => {
      const description =
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar a tarefa. Tente novamente.'

      toast({
        variant: 'destructive',
        title: 'Erro ao salvar tarefa',
        description,
      })
    },
  })

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate(values)
  })

  const errorMessage =
    mutation.isError && mutation.error instanceof Error
      ? mutation.error.message
      : mutation.isError
        ? 'Não foi possível salvar a tarefa. Tente novamente.'
        : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações da tarefa selecionada.'
              : 'Preencha os dados abaixo para criar uma nova tarefa.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Defina um título" {...field} disabled={mutation.isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva os detalhes da tarefa"
                        {...field}
                        disabled={mutation.isPending}
                        className="min-h-[120px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={mutation.isPending}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={TaskStatus.TODO}>A fazer</SelectItem>
                            <SelectItem value={TaskStatus.IN_PROGRESS}>Em andamento</SelectItem>
                            <SelectItem value={TaskStatus.REVIEW}>Em revisão</SelectItem>
                            <SelectItem value={TaskStatus.DONE}>Concluída</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridade</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={mutation.isPending}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a prioridade" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={TaskPriority.LOW}>Baixa</SelectItem>
                            <SelectItem value={TaskPriority.MEDIUM}>Média</SelectItem>
                            <SelectItem value={TaskPriority.HIGH}>Alta</SelectItem>
                            <SelectItem value={TaskPriority.URGENT}>Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prazo</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(event.target.value)}
                        disabled={mutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {errorMessage ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending
                  ? isEditing
                    ? 'Salvando...'
                    : 'Criando...'
                  : isEditing
                    ? 'Salvar alterações'
                    : 'Criar tarefa'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
