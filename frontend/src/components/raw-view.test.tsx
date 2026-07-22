import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RawView } from './raw-view'
import { vi } from 'vitest'
import { toast } from 'sonner'
import { SECRET_MASK, SECRET_REVEAL_TIMEOUT_MS } from '@/lib/secret-display'

vi.mock('sonner', () => ({
  toast: { success: vi.fn() },
}))

// Sample Namespace JSON (no data field)
const namespaceRaw = JSON.stringify({
  apiVersion: 'v1',
  kind: 'Namespace',
  metadata: {
    name: 'org-acme',
    uid: 'ns-uid-123',
    resourceVersion: '99999',
    creationTimestamp: '2025-06-01T00:00:00Z',
    managedFields: [{ manager: 'secrets-manager' }],
    labels: {
      'app.kubernetes.io/managed-by': 'holos.run',
      'holos.run/resource-type': 'organization',
    },
    annotations: {
      'holos.run/share-users': '[]',
    },
  },
  spec: {
    finalizers: ['kubernetes'],
  },
  status: {
    phase: 'Active',
  },
})

// Sample Secret JSON (has data field)
const secretRaw = JSON.stringify({
  apiVersion: 'v1',
  kind: 'Secret',
  metadata: {
    name: 'my-secret',
    namespace: 'default',
    uid: 'abc-123',
    resourceVersion: '12345',
    creationTimestamp: '2025-01-01T00:00:00Z',
    managedFields: [{ manager: 'kubectl' }],
    labels: {
      'app.kubernetes.io/managed-by': 'holos.run',
    },
    annotations: {
      'holos.run/share-users': '[]',
    },
  },
  data: {
    username: btoa('admin'),
    password: btoa('secret123'),
  },
  type: 'Opaque',
})

describe('RawView', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  function codeBlock(): HTMLPreElement {
    const pre = document.querySelector('pre')
    expect(pre).toBeInTheDocument()
    return pre as HTMLPreElement
  }

  describe('with Namespace (no data field)', () => {
    it('pretty-prints JSON without errors', () => {
      render(<RawView raw={namespaceRaw} includeAllFields={false} onToggleIncludeAllFields={vi.fn()} />)

      const pre = codeBlock()
      const parsed = JSON.parse(pre.textContent || '')

      expect(parsed.apiVersion).toBe('v1')
      expect(parsed.kind).toBe('Namespace')
      expect(parsed.metadata.name).toBe('org-acme')
    })

    it('strips server-managed metadata fields when includeAllFields is off', () => {
      render(<RawView raw={namespaceRaw} includeAllFields={false} onToggleIncludeAllFields={vi.fn()} />)

      const pre = codeBlock()
      const parsed = JSON.parse(pre.textContent || '')

      expect(parsed.metadata.uid).toBeUndefined()
      expect(parsed.metadata.resourceVersion).toBeUndefined()
      expect(parsed.metadata.creationTimestamp).toBeUndefined()
      expect(parsed.metadata.managedFields).toBeUndefined()

      // Non-managed fields preserved
      expect(parsed.metadata.labels).toBeDefined()
      expect(parsed.metadata.annotations).toBeDefined()
    })

    it('preserves all fields when includeAllFields is on', () => {
      render(<RawView raw={namespaceRaw} includeAllFields={true} onToggleIncludeAllFields={vi.fn()} />)

      const pre = codeBlock()
      const parsed = JSON.parse(pre.textContent || '')

      expect(parsed.metadata.uid).toBe('ns-uid-123')
      expect(parsed.metadata.resourceVersion).toBe('99999')
      expect(parsed.metadata.creationTimestamp).toBe('2025-06-01T00:00:00Z')
      expect(parsed.metadata.managedFields).toBeDefined()
    })

    it('has a Copy to Clipboard button', () => {
      render(<RawView raw={namespaceRaw} includeAllFields={false} onToggleIncludeAllFields={vi.fn()} />)

      const button = screen.getByRole('button', { name: /copy to clipboard/i })
      expect(button).toBeInTheDocument()
    })

    it('shows a toast after clicking Copy to Clipboard', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText } })

      render(<RawView raw={namespaceRaw} includeAllFields={false} onToggleIncludeAllFields={vi.fn()} />)

      fireEvent.click(screen.getByRole('button', { name: /copy to clipboard/i }))

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Copied to clipboard')
      })
    })

    it('does not create a stringData field', () => {
      render(<RawView raw={namespaceRaw} includeAllFields={true} onToggleIncludeAllFields={vi.fn()} />)

      const pre = codeBlock()
      const parsed = JSON.parse(pre.textContent || '')
      expect(parsed.stringData).toBeUndefined()
      expect(parsed.data).toBeUndefined()
    })
  })

  describe('with Secret (has data field)', () => {
    it('masks decoded stringData by default and removes the base64 data field', () => {
      render(<RawView raw={secretRaw} includeAllFields={false} onToggleIncludeAllFields={vi.fn()} />)

      const pre = codeBlock()
      const parsed = JSON.parse(pre.textContent || '')

      expect(parsed.stringData).toBeDefined()
      expect(parsed.stringData.username).toBe(SECRET_MASK)
      expect(parsed.stringData.password).toBe(SECRET_MASK)
      expect(parsed.data).toBeUndefined()
      expect(pre).not.toHaveTextContent('admin')
      expect(pre).not.toHaveTextContent('secret123')
    })

    it('reveals decoded secret values only after explicit confirmation', () => {
      render(<RawView raw={secretRaw} includeAllFields={false} onToggleIncludeAllFields={vi.fn()} />)

      const showValuesButton = screen.getByRole('button', { name: /show values/i })
      expect(showValuesButton).toHaveAttribute('aria-label', 'Show values')
      fireEvent.click(showValuesButton)

      const parsed = JSON.parse(codeBlock().textContent || '')
      expect(parsed.stringData.username).toBe('admin')
      expect(parsed.stringData.password).toBe('secret123')
      expect(screen.getByRole('button', { name: /hide values/i })).toHaveAttribute(
        'aria-label',
        'Hide values',
      )
    })

    it('automatically masks decoded secret values after the shared timeout', () => {
      vi.useFakeTimers()
      render(<RawView raw={secretRaw} includeAllFields={false} onToggleIncludeAllFields={vi.fn()} />)

      fireEvent.click(screen.getByRole('button', { name: /show values/i }))
      expect(codeBlock()).toHaveTextContent('secret123')

      act(() => vi.advanceTimersByTime(SECRET_REVEAL_TIMEOUT_MS))

      expect(codeBlock()).not.toHaveTextContent('secret123')
      expect(codeBlock()).toHaveTextContent(SECRET_MASK)
    })

    it('copies the masked representation until values are explicitly shown', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText } })
      render(<RawView raw={secretRaw} includeAllFields={false} onToggleIncludeAllFields={vi.fn()} />)

      fireEvent.click(screen.getByRole('button', { name: /copy to clipboard/i }))

      await waitFor(() => expect(writeText).toHaveBeenCalled())
      expect(writeText.mock.calls[0][0]).toContain(SECRET_MASK)
      expect(writeText.mock.calls[0][0]).not.toContain('secret123')
    })
  })

  it('uses a semantic pre element without the non-standard code role', () => {
    render(<RawView raw={namespaceRaw} includeAllFields={false} onToggleIncludeAllFields={vi.fn()} />)

    expect(codeBlock()).not.toHaveAttribute('role')
    expect(screen.queryByRole('code')).not.toBeInTheDocument()
  })

  describe('toggle', () => {
    it('calls onToggleIncludeAllFields when toggle is clicked', () => {
      const onToggle = vi.fn()
      render(<RawView raw={namespaceRaw} includeAllFields={false} onToggleIncludeAllFields={onToggle} />)

      const toggle = screen.getByRole('switch')
      fireEvent.click(toggle)
      expect(onToggle).toHaveBeenCalled()
    })
  })
})
