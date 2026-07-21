import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { DeleteSecretDialog } from './delete-secret-dialog'

describe('DeleteSecretDialog', () => {
  it('shows the target and delegates confirmation', () => {
    const onConfirm = vi.fn()
    render(
      <DeleteSecretDialog
        open
        onOpenChange={vi.fn()}
        name="api-token"
        isPending={false}
        onConfirm={onConfirm}
      />,
    )

    expect(screen.getByText(/api-token/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('renders mutation errors and disables confirmation while pending', () => {
    render(
      <DeleteSecretDialog
        open
        onOpenChange={vi.fn()}
        name="api-token"
        error={new Error('delete failed')}
        isPending
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('delete failed')
    expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled()
  })
})
