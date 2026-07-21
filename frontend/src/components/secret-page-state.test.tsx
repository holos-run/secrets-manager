import { render, screen } from '@testing-library/react'
import { SecretPageError, SecretPageLoading } from './secret-page-state'

describe('SecretPageState', () => {
  it('renders the shared loading skeleton', () => {
    render(<SecretPageLoading />)

    expect(screen.getByLabelText('Loading secret')).toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(4)
  })

  it.each([
    ['rpc not_found', 'Secret "api-token" not found'],
    ['permission denied', 'Permission denied: You are not authorized to view this secret'],
    ['network unavailable', 'network unavailable'],
  ])('maps %s errors to the expected message', (error, message) => {
    render(<SecretPageError error={new Error(error)} name="api-token" />)

    expect(screen.getByRole('alert')).toHaveTextContent(message)
  })
})
