import { fireEvent, render, screen } from '@testing-library/react'
import { createColumnHelper } from '@tanstack/react-table'
import { ResourceTable, ResourceTableSortHeader } from './resource-table'

interface Item {
  name: string
  description: string
}

const columnHelper = createColumnHelper<Item>()
const columns = [
  columnHelper.accessor('name', {
    header: ({ column }) => <ResourceTableSortHeader column={column}>Name</ResourceTableSortHeader>,
  }),
  columnHelper.accessor('description', { header: 'Description' }),
]

describe('ResourceTable', () => {
  const data = [
    { name: 'zebra', description: 'Striped' },
    { name: 'alpha', description: 'First' },
  ]

  it('sorts rows and exposes the current direction with aria-sort', () => {
    render(
      <ResourceTable
        columns={columns}
        data={data}
        initialSorting={[{ id: 'name', desc: false }]}
        emptyMessage="No items"
      />,
    )

    const header = screen.getByRole('columnheader', { name: /name/i })
    expect(header).toHaveAttribute('scope', 'col')
    expect(header).toHaveAttribute('aria-sort', 'ascending')
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('alpha')

    fireEvent.click(screen.getByRole('button', { name: /name/i }))

    expect(header).toHaveAttribute('aria-sort', 'descending')
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('zebra')
  })

  it('filters rows with the shared search input', () => {
    render(
      <ResourceTable
        columns={columns}
        data={data}
        searchPlaceholder="Search items…"
        emptyMessage="No items"
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('Search items…'), {
      target: { value: 'striped' },
    })

    expect(screen.getByText('zebra')).toBeInTheDocument()
    expect(screen.queryByText('alpha')).not.toBeInTheDocument()
  })

  it('renders its empty state without a table', () => {
    render(<ResourceTable columns={columns} data={[]} emptyMessage="No items yet." />)

    expect(screen.getByText('No items yet.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('renders skeleton rows while loading', () => {
    render(
      <ResourceTable
        columns={columns}
        data={[]}
        isLoading
        loadingLabel="Loading items"
        emptyMessage="No items"
      />,
    )

    expect(screen.getByLabelText('Loading items')).toBeInTheDocument()
    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('renders errors in the shared alert surface', () => {
    render(
      <ResourceTable
        columns={columns}
        data={data}
        error={new Error('Unable to load items')}
        emptyMessage="No items"
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load items')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('paginates rows with shared controls', () => {
    const manyItems = Array.from({ length: 26 }, (_, index) => ({
      name: `item-${index.toString().padStart(2, '0')}`,
      description: `Description ${index}`,
    }))
    render(
      <ResourceTable
        columns={columns}
        data={manyItems}
        pageSize={25}
        emptyMessage="No items"
      />,
    )

    expect(screen.getByText('item-00')).toBeInTheDocument()
    expect(screen.queryByText('item-25')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.queryByText('item-00')).not.toBeInTheDocument()
    expect(screen.getByText('item-25')).toBeInTheDocument()
  })
})
