import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { InlineEditField } from './inline-edit-field'

describe('InlineEditField', () => {
  it('edits and saves the current value', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <InlineEditField
        label="Display Name"
        value="Old name"
        emptyText="No display name"
        onSave={onSave}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'edit display name' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'display name' }), {
      target: { value: 'New name' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'save display name' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('New name'))
  })

  it('cancels with Escape without saving', () => {
    const onSave = vi.fn()
    render(
      <InlineEditField
        label="URL"
        value="https://example.com"
        emptyText="No URL"
        onSave={onSave}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'edit url' }))
    const input = screen.getByRole('textbox', { name: 'url' })
    fireEvent.change(input, { target: { value: 'https://changed.example.com' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(screen.getByText('https://example.com')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('saves single-line fields with Enter', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <InlineEditField
        label="Display Name"
        value="Old name"
        emptyText="No display name"
        onSave={onSave}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'edit display name' }))
    const input = screen.getByRole('textbox', { name: 'display name' })
    fireEvent.change(input, { target: { value: 'Keyboard name' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Keyboard name'))
  })

  it('renders a textarea for multiline fields and saves with modifier-Enter', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <InlineEditField
        label="Description"
        value="Old description"
        emptyText="No description"
        multiline
        onSave={onSave}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'edit description' }))
    const textarea = screen.getByRole('textbox', { name: 'description' })
    fireEvent.change(textarea, { target: { value: 'New description' } })
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('New description'))
  })

  it('keeps the editor open with its draft when saving fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('save failed'))
    render(
      <InlineEditField
        label="Display Name"
        value="Old name"
        emptyText="No display name"
        onSave={onSave}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'edit display name' }))
    const input = screen.getByRole('textbox', { name: 'display name' })
    fireEvent.change(input, { target: { value: 'Unsaved name' } })
    fireEvent.click(screen.getByRole('button', { name: 'save display name' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Unsaved name'))
    expect(screen.getByRole('textbox', { name: 'display name' })).toHaveValue('Unsaved name')
    expect(screen.getByRole('button', { name: 'save display name' })).toBeInTheDocument()
  })
})
