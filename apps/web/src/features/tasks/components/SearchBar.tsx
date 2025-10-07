import { useEffect, useState } from 'react'
import { Search as SearchIcon } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { router } from '@/router'
import { cn } from '@/lib/utils'


const DEFAULT_PLACEHOLDER = 'Buscar tarefas'
const SEARCH_DEBOUNCE_MS = 500


export const onSelectTask = (taskId: string) => {
  void router.navigate({
    to: '/tasks/$taskId',
    params: { taskId },
  })
}

interface SearchBarProps {
  className?: string
  placeholder?: string
  onTaskSelect?: (taskId: string) => void
  onSearchTermChange?: (term: string) => void
}

export function SearchBar({
  className,
  placeholder = DEFAULT_PLACEHOLDER,
  onSearchTermChange,
}: SearchBarProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedTerm, setDebouncedTerm] = useState('')

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedTerm(searchTerm.trim())
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [searchTerm])

  useEffect(() => {
    onSearchTermChange?.(debouncedTerm)
  }, [debouncedTerm, onSearchTermChange])

  return (
        <div className={cn('relative w-full', className)}>
          <SearchIcon className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            value={searchTerm}
            onChange={(event) => {
              const value = event.target.value
              setSearchTerm(value)
              if (!open) {
                setOpen(true)
              }
            }}
            placeholder={placeholder}
            className="pl-9"
            role="searchbox"
            onFocus={() => setOpen(true)}
            autoComplete="off"
          />
        </div>
  )
}
