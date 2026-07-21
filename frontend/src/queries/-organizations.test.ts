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
import { OrganizationService } from '@/gen/holos/console/v1/organizations_pb.js'
import { useAuth } from '@/lib/auth'
import { keys } from './keys'
import {
  useCreateOrganization,
  useDeleteOrganization,
  useGetOrganization,
  useListOrganizations,
  useUpdateOrganization,
  useUpdateOrganizationSharing,
} from './organizations'

function makeWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('organization queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuth as Mock).mockReturnValue({ isAuthenticated: true })
  })

  it('uses connect-query for list and detail reads', () => {
    renderHook(() => useListOrganizations())
    renderHook(() => useGetOrganization('my-org'))

    expect(useQuery).toHaveBeenNthCalledWith(
      1,
      OrganizationService.method.listOrganizations,
      {},
      { enabled: true },
    )
    expect(useQuery).toHaveBeenNthCalledWith(
      2,
      OrganizationService.method.getOrganization,
      { name: 'my-org' },
      expect.objectContaining({ enabled: true, select: expect.any(Function) }),
    )

    const select = (useQuery as Mock).mock.calls[1][2].select
    expect(select({ organization: { name: 'my-org' } })).toEqual({ name: 'my-org' })
  })

  it('gates reads on authentication and required identifiers', () => {
    ;(useAuth as Mock).mockReturnValue({ isAuthenticated: false })
    renderHook(() => useListOrganizations())
    renderHook(() => useGetOrganization(''))

    expect((useQuery as Mock).mock.calls[0][2].enabled).toBe(false)
    expect((useQuery as Mock).mock.calls[1][2].enabled).toBe(false)
  })
})

describe('organization mutations', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient()
  })

  it.each([
    {
      name: 'create',
      hook: useCreateOrganization,
      method: OrganizationService.method.createOrganization,
      variables: { name: 'my-org' },
      invalidates: [keys.organizations.list().key],
    },
    {
      name: 'update',
      hook: useUpdateOrganization,
      method: OrganizationService.method.updateOrganization,
      variables: { name: 'my-org', displayName: 'My Org' },
      invalidates: [keys.organizations.list().key, keys.organizations.detail('my-org').key],
    },
    {
      name: 'sharing update',
      hook: useUpdateOrganizationSharing,
      method: OrganizationService.method.updateOrganizationSharing,
      variables: { name: 'my-org', userGrants: [], roleGrants: [] },
      invalidates: [keys.organizations.list().key, keys.organizations.detail('my-org').key],
    },
    {
      name: 'delete',
      hook: useDeleteOrganization,
      method: OrganizationService.method.deleteOrganization,
      variables: { name: 'my-org' },
      invalidates: [keys.organizations.list().key, keys.organizations.detail('my-org').key],
    },
  ])('uses connect-query and scoped keys for $name', async ({ hook, method, variables, invalidates }) => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    renderHook(() => hook(), { wrapper: makeWrapper(queryClient) })

    expect(useMutation).toHaveBeenCalledWith(method, expect.objectContaining({ onSuccess: expect.any(Function) }))
    const onSuccess = (useMutation as Mock).mock.calls[0][1].onSuccess
    await act(async () => onSuccess({}, variables))

    expect(invalidateSpy.mock.calls.map(([filters]) => filters.queryKey)).toEqual(invalidates)
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['connect-query'] })
  })
})
