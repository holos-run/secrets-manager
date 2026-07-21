import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { vi } from 'vitest'
import type { Mock } from 'vitest'

vi.mock('@connectrpc/connect-query', async (importOriginal) => ({
  ...await importOriginal<typeof import('@connectrpc/connect-query')>(),
  useMutation: vi.fn(() => ({})),
  useQuery: vi.fn(() => ({})),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: vi.fn(),
}))

import { useMutation, useQuery } from '@connectrpc/connect-query'
import { SecretsService } from '@/gen/holos/console/v1/secrets_pb.js'
import { useAuth } from '@/lib/auth'
import { keys } from './keys'
import {
  useCreateSecret,
  useDeleteSecret,
  useGetSecret,
  useGetSecretMetadata,
  useGetSecretRaw,
  useListSecrets,
  useUpdateSecret,
  useUpdateSecretSharing,
} from './secrets'

function makeWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('secret queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuth as Mock).mockReturnValue({ isAuthenticated: true })
  })

  it('uses connect-query for list, detail, metadata, and raw reads', () => {
    renderHook(() => useListSecrets('my-project'))
    renderHook(() => useGetSecret('my-project', 'my-secret'))
    renderHook(() => useGetSecretMetadata('my-project', 'my-secret'))
    renderHook(() => useGetSecretRaw('my-project', 'my-secret', true))

    expect(useQuery).toHaveBeenNthCalledWith(
      1,
      SecretsService.method.listSecrets,
      { project: 'my-project' },
      expect.objectContaining({ enabled: true, select: expect.any(Function) }),
    )
    expect(useQuery).toHaveBeenNthCalledWith(
      2,
      SecretsService.method.getSecret,
      { name: 'my-secret', project: 'my-project' },
      expect.objectContaining({ enabled: true, select: expect.any(Function) }),
    )
    expect(useQuery).toHaveBeenNthCalledWith(
      3,
      SecretsService.method.listSecrets,
      { project: 'my-project' },
      expect.objectContaining({ enabled: true, select: expect.any(Function) }),
    )
    expect(useQuery).toHaveBeenNthCalledWith(
      4,
      SecretsService.method.getSecretRaw,
      { name: 'my-secret', project: 'my-project' },
      expect.objectContaining({ enabled: true, select: expect.any(Function) }),
    )
  })

  it('combines caller intent with authentication and identifier guards for raw reads', () => {
    renderHook(() => useGetSecretRaw('my-project', 'my-secret', false))
    expect((useQuery as Mock).mock.calls[0][2].enabled).toBe(false)

    vi.clearAllMocks()
    ;(useAuth as Mock).mockReturnValue({ isAuthenticated: false })
    renderHook(() => useGetSecretRaw('my-project', 'my-secret', true))
    expect((useQuery as Mock).mock.calls[0][2].enabled).toBe(false)
  })
})

describe('secret mutations', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient()
  })

  it.each([
    {
      name: 'create',
      useHook: () => useCreateSecret('my-project'),
      method: SecretsService.method.createSecret,
      variables: { name: 'my-secret', data: {}, userGrants: [], roleGrants: [] },
      invalidates: [keys.secrets.list('my-project').key],
    },
    {
      name: 'update',
      useHook: () => useUpdateSecret('my-project'),
      method: SecretsService.method.updateSecret,
      variables: { name: 'my-secret', data: {} },
      invalidates: [
        keys.secrets.list('my-project').key,
        keys.secrets.detail('my-project', 'my-secret').key,
        keys.secrets.raw('my-project', 'my-secret').key,
      ],
    },
    {
      name: 'sharing update',
      useHook: () => useUpdateSecretSharing('my-project'),
      method: SecretsService.method.updateSharing,
      variables: { name: 'my-secret', userGrants: [], roleGrants: [] },
      invalidates: [
        keys.secrets.list('my-project').key,
        keys.secrets.detail('my-project', 'my-secret').key,
        keys.secrets.raw('my-project', 'my-secret').key,
      ],
    },
    {
      name: 'delete',
      useHook: () => useDeleteSecret('my-project'),
      method: SecretsService.method.deleteSecret,
      variables: { name: 'my-secret', project: 'my-project' },
      invalidates: [
        keys.secrets.list('my-project').key,
        keys.secrets.detail('my-project', 'my-secret').key,
        keys.secrets.raw('my-project', 'my-secret').key,
      ],
    },
  ])('uses connect-query and scoped keys for $name', async ({ useHook, method, variables, invalidates }) => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    renderHook(() => useHook(), { wrapper: makeWrapper(queryClient) })

    expect(useMutation).toHaveBeenCalledWith(method, expect.objectContaining({ onSuccess: expect.any(Function) }))
    const onSuccess = (useMutation as Mock).mock.calls[0][1].onSuccess
    await act(async () => onSuccess({}, variables))

    expect(invalidateSpy.mock.calls.map(([filters]) => filters.queryKey)).toEqual(invalidates)
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['connect-query'] })
  })

  it.each([
    {
      name: 'create',
      useHook: () => useCreateSecret('my-project'),
      variables: { name: 'my-secret', data: {}, userGrants: [], roleGrants: [] },
      rpcVariables: { name: 'my-secret', data: {}, userGrants: [], roleGrants: [], project: 'my-project' },
    },
    {
      name: 'update',
      useHook: () => useUpdateSecret('my-project'),
      variables: { name: 'my-secret', data: {} },
      rpcVariables: { name: 'my-secret', data: {}, project: 'my-project' },
    },
    {
      name: 'sharing update',
      useHook: () => useUpdateSecretSharing('my-project'),
      variables: { name: 'my-secret', userGrants: [], roleGrants: [] },
      rpcVariables: { name: 'my-secret', userGrants: [], roleGrants: [], project: 'my-project' },
    },
    {
      name: 'delete',
      useHook: () => useDeleteSecret('my-project'),
      variables: 'my-secret',
      rpcVariables: { name: 'my-secret', project: 'my-project' },
    },
  ])('preserves the public mutation signature and adds project for $name', async ({ useHook, variables, rpcVariables }) => {
    const mutate = vi.fn()
    const mutateAsync = vi.fn().mockResolvedValue({})
    ;(useMutation as Mock).mockReturnValue({ mutate, mutateAsync })

    const { result } = renderHook(() => useHook(), { wrapper: makeWrapper(queryClient) })
    await act(async () => {
      await (result.current.mutateAsync as Mock)(variables)
    })

    expect(mutateAsync).toHaveBeenCalledWith(rpcVariables, undefined)
  })

  it('does not refetch deleted detail queries before route navigation', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    renderHook(() => useDeleteSecret('my-project'), { wrapper: makeWrapper(queryClient) })

    const onSuccess = (useMutation as Mock).mock.calls[0][1].onSuccess
    await act(async () => onSuccess({}, { name: 'my-secret', project: 'my-project' }))

    expect(invalidateSpy).toHaveBeenCalledTimes(3)
    for (const [filters] of invalidateSpy.mock.calls) {
      expect(filters.refetchType).toBe('none')
    }
  })
})
