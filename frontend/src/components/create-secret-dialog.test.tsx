import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import type { Mock } from 'vitest'
import { Role } from '@/gen/holos/console/v1/rbac_pb'

vi.mock('@/queries/secrets', () => ({ useCreateSecret: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { useCreateSecret } from '@/queries/secrets'
import { toast } from 'sonner'
import { CreateSecretDialog } from './create-secret-dialog'

describe('CreateSecretDialog', () => {
  const mutateAsync = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mutateAsync.mockResolvedValue({})
    ;(useCreateSecret as Mock).mockReturnValue({ mutateAsync, isPending: false })
  })

  function renderDialog() {
    return render(
      <CreateSecretDialog
        open
        onOpenChange={vi.fn()}
        projectName="test-project"
        creatorEmail="owner@example.com"
        defaultUserGrants={[{ principal: 'editor@example.com', role: Role.EDITOR }]}
        defaultRoleGrants={[{ principal: 'engineering', role: Role.VIEWER }]}
      />,
    )
  }

  it('validates that a secret name is present', () => {
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }))
    expect(screen.getByText('Secret name is required')).toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('pre-populates creator and project default grants through SharingPanel', () => {
    renderDialog()
    expect(screen.getByDisplayValue('owner@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('editor@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('engineering')).toBeInTheDocument()
  })

  it('associates form labels and groups the secret data fields', () => {
    renderDialog()

    expect(screen.getByLabelText('Name')).toHaveAttribute('id', 'secret-name')
    expect(screen.getByLabelText('Description')).toHaveAttribute('id', 'secret-description')
    expect(screen.getByLabelText('URL')).toHaveAttribute('id', 'secret-url')
    expect(screen.getByRole('group', { name: 'Data' })).toBeInTheDocument()
  })

  it('keeps a new grant input focused while typing its principal', async () => {
    const { userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole('button', { name: 'Add User' }))
    const principalInput = screen.getByRole('textbox', { name: 'user 3' })
    await user.type(principalInput, 'new@example.com')

    expect(principalInput).toHaveFocus()
    expect(principalInput).toHaveValue('new@example.com')
  })

  it('submits edited grants and shows success feedback', async () => {
    renderDialog()
    fireEvent.change(screen.getByPlaceholderText('my-secret'), { target: { value: 'new-secret' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'remove' })[1])
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
        name: 'new-secret',
        userGrants: [{ principal: 'owner@example.com', role: Role.OWNER }],
        roleGrants: [{ principal: 'engineering', role: Role.VIEWER }],
      }))
    })
    expect(toast.success).toHaveBeenCalledWith('Secret created')
  })

  it('shows mutation failures as an error toast and inline alert', async () => {
    mutateAsync.mockRejectedValue(new Error('create failed'))
    renderDialog()
    fireEvent.change(screen.getByPlaceholderText('my-secret'), { target: { value: 'new-secret' } })
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }))

    expect(await screen.findByText('create failed')).toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith('create failed')
  })
})
