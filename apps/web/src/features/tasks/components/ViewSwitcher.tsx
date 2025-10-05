import { type LucideIcon, LayoutDashboard, List } from 'lucide-react'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

import {
  type TasksViewMode,
  useTasksView,
} from '../store/useTasksView'

const viewOptions: Array<{
  value: TasksViewMode
  label: string
  icon: LucideIcon
}> = [
  { value: 'list', label: 'Lista', icon: List },
  { value: 'board', label: 'Quadro', icon: LayoutDashboard },
]

interface ViewSwitcherProps {
  className?: string
}

export function ViewSwitcher({ className }: ViewSwitcherProps) {
  const { viewMode, setViewMode } = useTasksView()

  const handleChange = (value: string) => {
    setViewMode(value as TasksViewMode)
  }

  return (
    <Tabs
      value={viewMode}
      onValueChange={handleChange}
      className={cn('w-fit', className)}
    >
      <TabsList>
        {viewOptions.map((option) => {
          const Icon = option.icon

          return (
            <TabsTrigger key={option.value} value={option.value}>
              <Icon className="size-4" />
              <span>{option.label}</span>
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}
