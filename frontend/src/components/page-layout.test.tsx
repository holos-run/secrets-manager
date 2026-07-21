import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'
import { PageHeader, PageLayout } from './page-layout'

describe('PageLayout', () => {
  it('renders a semantic page header with context, title, description, and actions', () => {
    render(
      <PageLayout>
        <PageHeader
          eyebrow="Project / production"
          title="Secrets"
          description="Store and manage project credentials."
          actions={<Button>Create Secret</Button>}
        />
        <div>Page content</div>
      </PageLayout>,
    )

    const header = screen.getByTestId('page-header')
    expect(header.tagName).toBe('HEADER')
    expect(screen.getByRole('heading', { level: 1, name: 'Secrets' })).toBeInTheDocument()
    expect(screen.getByText('Project / production')).toBeInTheDocument()
    expect(screen.getByText('Store and manage project credentials.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Secret' })).toBeInTheDocument()
  })

  it('marks the page shell for visual and end-to-end verification', () => {
    render(<PageLayout>Content</PageLayout>)

    expect(screen.getByTestId('page-layout')).toHaveAttribute('data-layout', 'operator-page')
  })
})
