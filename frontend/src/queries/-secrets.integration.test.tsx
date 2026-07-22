import { TransportProvider } from '@connectrpc/connect-query'
import { createConnectTransport } from '@connectrpc/connect-web'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { vi } from 'vitest'

vi.mock('@/lib/auth', () => ({
  useAuth: vi.fn(() => ({ isAuthenticated: true })),
}))

import {
  useCreateSecret,
  useDeleteSecret,
  useUpdateSecret,
  useUpdateSecretSharing,
} from './secrets'

const transport = createConnectTransport({ baseUrl: 'https://example.test' })

function makeWrapper() {
  const queryClient = new QueryClient()
  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <TransportProvider transport={transport}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </TransportProvider>
    )
  }
}

describe('secret mutation integration', () => {
  it.each([
    { name: 'create', useHook: useCreateSecret },
    { name: 'update', useHook: useUpdateSecret },
    { name: 'sharing update', useHook: useUpdateSecretSharing },
    { name: 'delete', useHook: useDeleteSecret },
  ])('keeps $name callbacks stable with the real connect-query mutation hook', ({ useHook }) => {
    const { result, rerender } = renderHook(
      ({ project }) => useHook(project),
      { initialProps: { project: 'my-project' }, wrapper: makeWrapper() },
    )
    const firstMutate = result.current.mutate
    const firstMutateAsync = result.current.mutateAsync

    rerender({ project: 'my-project' })

    expect(result.current.mutate).toBe(firstMutate)
    expect(result.current.mutateAsync).toBe(firstMutateAsync)

    rerender({ project: 'other-project' })

    expect(result.current.mutate).not.toBe(firstMutate)
    expect(result.current.mutateAsync).not.toBe(firstMutateAsync)
  })
})
