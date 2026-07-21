import { useState, type ReactNode } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface InlineEditFieldProps {
  label?: string
  value: string
  emptyText: string
  multiline?: boolean
  isSaving?: boolean
  onSave: (value: string) => Promise<void> | void
  placeholder?: string
  renderValue?: (value: string) => ReactNode
}

export function InlineEditField({
  label,
  value,
  emptyText,
  multiline = false,
  isSaving = false,
  onSave,
  placeholder,
  renderValue,
}: InlineEditFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const ariaName = (label ?? 'value').toLowerCase()

  const startEditing = () => {
    setDraft(value)
    setEditing(true)
  }

  const cancelEditing = () => {
    setDraft(value)
    setEditing(false)
  }

  const save = async () => {
    try {
      await onSave(draft)
      setEditing(false)
    } catch {
      // The caller owns user-facing mutation feedback. Keep the editor open.
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      cancelEditing()
    } else if (event.key === 'Enter' && (!multiline || event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      void save()
    }
  }

  return (
    <div className={cn('flex gap-2', multiline ? 'items-start' : 'items-center')}>
      {label && (
        <span className={cn('w-32 shrink-0 text-sm text-muted-foreground', multiline && 'pt-2')}>
          {label}
        </span>
      )}
      {editing ? (
        <>
          {multiline ? (
            <Textarea
              autoFocus
              aria-label={ariaName}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1"
            />
          ) : (
            <Input
              autoFocus
              aria-label={ariaName}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1"
            />
          )}
          <div className={cn('flex gap-1', multiline && 'flex-col')}>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`save ${ariaName}`}
              onClick={() => void save()}
              disabled={isSaving}
            >
              <Check />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`cancel ${ariaName}`}
              onClick={cancelEditing}
            >
              <X />
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className={cn('flex-1 text-sm', !value && 'text-muted-foreground')}>
            {value && renderValue ? renderValue(value) : value || emptyText}
          </div>
          <Button variant="ghost" size="icon" aria-label={`edit ${ariaName}`} onClick={startEditing}>
            <Pencil />
          </Button>
        </>
      )}
    </div>
  )
}
