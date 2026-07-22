import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { ViewModeToggle } from './view-mode-toggle'

describe('ViewModeToggle', () => {
  it('renders both option buttons', () => {
    const onValueChange = vi.fn()
    render(
      <ViewModeToggle
        value="data"
        onValueChange={onValueChange}
        options={[
          { value: 'data', label: 'Data' },
          { value: 'resource', label: 'Resource' },
        ]}
      />,
    )
    expect(screen.getByRole('tab', { name: 'Data' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Resource' })).toBeInTheDocument()
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Data' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Resource' })).toHaveAttribute('aria-selected', 'false')
  })

  it('calls onValueChange when a non-active option is clicked', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <ViewModeToggle
        value="data"
        onValueChange={onValueChange}
        options={[
          { value: 'data', label: 'Data' },
          { value: 'resource', label: 'Resource' },
        ]}
      />,
    )
    await user.click(screen.getByRole('tab', { name: 'Resource' }))
    expect(onValueChange).toHaveBeenCalledWith('resource')
  })

  it('calls onValueChange when arrow-key navigation activates another option', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <ViewModeToggle
        value="data"
        onValueChange={onValueChange}
        options={[
          { value: 'data', label: 'Data' },
          { value: 'resource', label: 'Resource' },
        ]}
      />,
    )

    screen.getByRole('tab', { name: 'Data' }).focus()
    await user.keyboard('{ArrowRight}')

    expect(onValueChange).toHaveBeenCalledWith('resource')
  })

  it('keeps the active option selected when it is re-clicked', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <ViewModeToggle
        value="data"
        onValueChange={onValueChange}
        options={[
          { value: 'data', label: 'Data' },
          { value: 'resource', label: 'Resource' },
        ]}
      />,
    )
    await user.click(screen.getByRole('tab', { name: 'Data' }))
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('renders Claims/Raw options for profile page toggle', () => {
    const onValueChange = vi.fn()
    render(
      <ViewModeToggle
        value="claims"
        onValueChange={onValueChange}
        options={[
          { value: 'claims', label: 'Claims' },
          { value: 'raw', label: 'Raw' },
        ]}
      />,
    )
    expect(screen.getByRole('tab', { name: 'Claims' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Raw' })).toBeInTheDocument()
  })

  it('switching to raw view calls onValueChange with raw', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(
      <ViewModeToggle
        value="claims"
        onValueChange={onValueChange}
        options={[
          { value: 'claims', label: 'Claims' },
          { value: 'raw', label: 'Raw' },
        ]}
      />,
    )
    await user.click(screen.getByRole('tab', { name: 'Raw' }))
    expect(onValueChange).toHaveBeenCalledWith('raw')
  })
})
