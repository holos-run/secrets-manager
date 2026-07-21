import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { SecretPageActions } from './secret-page-actions'

describe('SecretPageActions', () => {
  it('delegates edit and delete actions in read mode', () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    render(
      <SecretPageActions
        viewMode="editor"
        onViewModeChange={vi.fn()}
        editMode={false}
        onEdit={onEdit}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        onDelete={onDelete}
        isDirty={false}
        isSaving={false}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onEdit).toHaveBeenCalledOnce()
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('exposes save state and cancel in edit mode', () => {
    const onSave = vi.fn()
    const onCancel = vi.fn()
    const { rerender } = render(
      <SecretPageActions
        viewMode="editor"
        onViewModeChange={vi.fn()}
        editMode
        onEdit={vi.fn()}
        onSave={onSave}
        onCancel={onCancel}
        onDelete={vi.fn()}
        isDirty={false}
        isSaving={false}
      />,
    )

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    rerender(
      <SecretPageActions
        viewMode="editor"
        onViewModeChange={vi.fn()}
        editMode
        onEdit={vi.fn()}
        onSave={onSave}
        onCancel={onCancel}
        onDelete={vi.fn()}
        isDirty
        isSaving={false}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onSave).toHaveBeenCalledOnce()
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
