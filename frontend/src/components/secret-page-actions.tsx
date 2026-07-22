import { Braces, Pencil, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ViewModeToggle } from '@/components/view-mode-toggle'

interface SecretPageActionsProps {
  viewMode: 'editor' | 'raw'
  onViewModeChange: (mode: 'editor' | 'raw') => void
  editMode: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onDelete: () => void
  isDirty: boolean
  isSaving: boolean
}

export function SecretPageActions({
  viewMode,
  onViewModeChange,
  editMode,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  isDirty,
  isSaving,
}: SecretPageActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <ViewModeToggle
        value={viewMode}
        onValueChange={(mode) => onViewModeChange(mode as 'editor' | 'raw')}
        options={[
          { value: 'editor', label: 'Data', icon: <Table2 /> },
          { value: 'raw', label: 'Resource', icon: <Braces /> },
        ]}
      />
      <div className="flex-1" />
      {viewMode === 'editor' && !editMode && (
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil />
          Edit
        </Button>
      )}
      {viewMode === 'editor' && editMode && (
        <>
          <Button size="sm" onClick={onSave} disabled={!isDirty || isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        </>
      )}
      <Button variant="destructive" size="sm" onClick={onDelete}>Delete</Button>
    </div>
  )
}
