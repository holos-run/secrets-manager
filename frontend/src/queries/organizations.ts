import { useMutation, useQuery } from '@connectrpc/connect-query'
import { useQueryClient } from '@tanstack/react-query'
import { OrganizationService } from '@/gen/holos/console/v1/organizations_pb.js'
import { useAuth } from '@/lib/auth'
import { keys } from './keys'

export function useListOrganizations() {
  const { isAuthenticated } = useAuth()
  const query = keys.organizations.list()
  return useQuery(
    query.schema,
    query.input,
    { enabled: isAuthenticated },
  )
}

export function useGetOrganization(name: string) {
  const { isAuthenticated } = useAuth()
  const query = keys.organizations.detail(name)
  return useQuery(
    query.schema,
    query.input,
    {
      enabled: isAuthenticated && name.length > 0,
      select: (response) => response.organization,
    },
  )
}

export function useCreateOrganization() {
  const queryClient = useQueryClient()
  return useMutation(OrganizationService.method.createOrganization, {
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.organizations.list().key })
    },
  })
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient()
  return useMutation(OrganizationService.method.updateOrganization, {
    onSuccess: async (_response, { name }) => {
      if (!name) return
      await queryClient.invalidateQueries({ queryKey: keys.organizations.list().key })
      await queryClient.invalidateQueries({ queryKey: keys.organizations.detail(name).key })
    },
  })
}

export function useUpdateOrganizationSharing() {
  const queryClient = useQueryClient()
  return useMutation(OrganizationService.method.updateOrganizationSharing, {
    onSuccess: async (_response, { name }) => {
      if (!name) return
      await queryClient.invalidateQueries({ queryKey: keys.organizations.list().key })
      await queryClient.invalidateQueries({ queryKey: keys.organizations.detail(name).key })
    },
  })
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient()
  return useMutation(OrganizationService.method.deleteOrganization, {
    onSuccess: async (_response, { name }) => {
      if (!name) return
      await queryClient.invalidateQueries({ queryKey: keys.organizations.list().key })
      await queryClient.invalidateQueries({ queryKey: keys.organizations.detail(name).key })
    },
  })
}
