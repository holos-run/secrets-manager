import { useMutation, useQuery } from '@connectrpc/connect-query'
import { useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { ProjectService } from '@/gen/holos/console/v1/projects_pb.js'
import { useAuth } from '@/lib/auth'
import { keys } from './keys'

export function useListProjects(organization: string) {
  const { isAuthenticated } = useAuth()
  const query = keys.projects.list(organization)
  return useQuery(
    query.schema,
    query.input,
    { enabled: isAuthenticated && !!organization },
  )
}

export function useGetProject(name: string) {
  const { isAuthenticated } = useAuth()
  const query = keys.projects.detail(name)
  return useQuery(
    query.schema,
    query.input,
    {
      enabled: isAuthenticated && name.length > 0,
      select: (response) => response.project,
    },
  )
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation(ProjectService.method.createProject, {
    onSuccess: async (_response, { organization }) => {
      if (!organization) return
      await queryClient.invalidateQueries({ queryKey: keys.projects.list(organization).key })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation(ProjectService.method.updateProject, {
    onSuccess: async (_response, { name }) => {
      if (!name) return
      await invalidateProject(queryClient, name)
    },
  })
}

export function useUpdateProjectSharing() {
  const queryClient = useQueryClient()
  return useMutation(ProjectService.method.updateProjectSharing, {
    onSuccess: async (_response, { name }) => {
      if (!name) return
      await invalidateProject(queryClient, name)
    },
  })
}

export function useUpdateProjectDefaultSharing() {
  const queryClient = useQueryClient()
  return useMutation(ProjectService.method.updateProjectDefaultSharing, {
    onSuccess: async (_response, { name }) => {
      if (!name) return
      await invalidateProject(queryClient, name)
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation(ProjectService.method.deleteProject, {
    onSuccess: async (_response, { name }) => {
      if (!name) return
      await invalidateProject(queryClient, name)
    },
  })
}

async function invalidateProject(queryClient: QueryClient, name: string) {
  // Update and delete requests do not carry the organization, so invalidate
  // every listProjects input while keeping unrelated service queries cached.
  await queryClient.invalidateQueries({ queryKey: keys.projects.lists().key })
  await queryClient.invalidateQueries({ queryKey: keys.projects.detail(name).key })
}
