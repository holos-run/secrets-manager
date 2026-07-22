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
import { ProjectService } from '@/gen/holos/console/v1/projects_pb.js'
import { useAuth } from '@/lib/auth'
import { keys } from './keys'
import {
  useCreateProject,
  useDeleteProject,
  useGetProject,
  useListProjects,
  useUpdateProject,
  useUpdateProjectDefaultSharing,
  useUpdateProjectSharing,
} from './projects'

function makeWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('project queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuth as Mock).mockReturnValue({ isAuthenticated: true })
  })

  it('uses connect-query for list and detail reads', () => {
    renderHook(() => useListProjects('my-org'))
    renderHook(() => useGetProject('my-project'))

    expect(useQuery).toHaveBeenNthCalledWith(
      1,
      ProjectService.method.listProjects,
      expect.objectContaining({ organization: 'my-org' }),
      { enabled: true },
    )
    expect(useQuery).toHaveBeenNthCalledWith(
      2,
      ProjectService.method.getProject,
      { name: 'my-project' },
      expect.objectContaining({ enabled: true, select: expect.any(Function) }),
    )

    const select = (useQuery as Mock).mock.calls[1][2].select
    expect(select({ project: { name: 'my-project' } })).toEqual({ name: 'my-project' })
  })

  it('gates reads on authentication and required identifiers', () => {
    ;(useAuth as Mock).mockReturnValue({ isAuthenticated: false })
    renderHook(() => useListProjects(''))
    renderHook(() => useGetProject(''))

    expect((useQuery as Mock).mock.calls[0][2].enabled).toBe(false)
    expect((useQuery as Mock).mock.calls[1][2].enabled).toBe(false)
  })
})

describe('project mutations', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient()
  })

  it.each([
    {
      name: 'create',
      hook: useCreateProject,
      method: ProjectService.method.createProject,
      variables: { name: 'my-project', organization: 'my-org' },
      invalidates: [keys.projects.list('my-org').key],
    },
    {
      name: 'update',
      hook: useUpdateProject,
      method: ProjectService.method.updateProject,
      variables: { name: 'my-project', displayName: 'My Project' },
      invalidates: [keys.projects.lists().key, keys.projects.detail('my-project').key],
    },
    {
      name: 'sharing update',
      hook: useUpdateProjectSharing,
      method: ProjectService.method.updateProjectSharing,
      variables: { name: 'my-project', userGrants: [], roleGrants: [] },
      invalidates: [keys.projects.lists().key, keys.projects.detail('my-project').key],
    },
    {
      name: 'default sharing update',
      hook: useUpdateProjectDefaultSharing,
      method: ProjectService.method.updateProjectDefaultSharing,
      variables: { name: 'my-project', defaultUserGrants: [], defaultRoleGrants: [] },
      invalidates: [keys.projects.lists().key, keys.projects.detail('my-project').key],
    },
    {
      name: 'delete',
      hook: useDeleteProject,
      method: ProjectService.method.deleteProject,
      variables: { name: 'my-project' },
      invalidates: [keys.projects.lists().key, keys.projects.detail('my-project').key],
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
