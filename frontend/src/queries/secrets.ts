import { useMutation, useQuery } from '@connectrpc/connect-query'
import { useQueryClient } from '@tanstack/react-query'
import type {
  QueryClient,
  QueryKey,
  UseMutateAsyncFunction,
  UseMutateFunction,
} from '@tanstack/react-query'
import { useCallback } from 'react'
import { SecretsService } from '@/gen/holos/console/v1/secrets_pb.js'
import type { SecretMetadata } from '@/gen/holos/console/v1/secrets_pb.js'
import { useAuth } from '@/lib/auth'
import { keys } from './keys'

type GrantInput = { principal: string; role: number }

type CreateSecretParams = {
  name: string
  data: Record<string, Uint8Array>
  userGrants: GrantInput[]
  roleGrants: GrantInput[]
  description?: string
  url?: string
}

type UpdateSecretParams = {
  name: string
  data: Record<string, Uint8Array>
  description?: string
  url?: string
}

type UpdateSecretSharingParams = {
  name: string
  userGrants: GrantInput[]
  roleGrants: GrantInput[]
}

function createSecretRequest(params: CreateSecretParams, project: string) {
  return { ...params, project }
}

function deleteSecretRequest(name: string, project: string) {
  return { name, project }
}

function updateSecretRequest(params: UpdateSecretParams, project: string) {
  return { ...params, project }
}

function updateSecretSharingRequest(params: UpdateSecretSharingParams, project: string) {
  return { ...params, project }
}

function useProjectMutationCallbacks<TData, TError, TRpcParams, TPublicParams, TOnMutateResult>(
  project: string,
  rpcMutate: UseMutateFunction<TData, TError, TRpcParams, TOnMutateResult>,
  rpcMutateAsync: UseMutateAsyncFunction<TData, TError, TRpcParams, TOnMutateResult>,
  createRequest: (params: TPublicParams, project: string) => TRpcParams,
) {
  const mutate = useCallback(
    (params: TPublicParams, options?: Parameters<typeof rpcMutate>[1]) =>
      rpcMutate(createRequest(params, project), options),
    [createRequest, project, rpcMutate],
  )
  const mutateAsync = useCallback(
    (params: TPublicParams, options?: Parameters<typeof rpcMutateAsync>[1]) =>
      rpcMutateAsync(createRequest(params, project), options),
    [createRequest, project, rpcMutateAsync],
  )
  return { mutate, mutateAsync }
}

export function useListSecrets(project: string) {
  const { isAuthenticated } = useAuth()
  const query = keys.secrets.list(project)
  return useQuery(
    query.schema,
    query.input,
    {
      enabled: isAuthenticated && !!project,
      select: (response) => response.secrets,
    },
  )
}

export function useGetSecret(project: string, name: string) {
  const { isAuthenticated } = useAuth()
  const query = keys.secrets.detail(project, name)
  return useQuery(
    query.schema,
    query.input,
    {
      enabled: isAuthenticated && !!project && !!name,
      select: (response) => response.data as Record<string, Uint8Array>,
    },
  )
}

// GetSecret only returns data (bytes), not metadata (description, url, grants).
// There is no dedicated GetSecretMetadata RPC, so this query shares the list
// cache and selects the requested secret's metadata from it.
export function useGetSecretMetadata(project: string, name: string) {
  const { isAuthenticated } = useAuth()
  const query = keys.secrets.list(project)
  return useQuery(
    query.schema,
    query.input,
    {
      enabled: isAuthenticated && !!project && !!name,
      select: (response) => response.secrets.find((secret: SecretMetadata) => secret.name === name) ?? null,
    },
  )
}

export function useGetSecretRaw(project: string, name: string, enabled = true) {
  const { isAuthenticated } = useAuth()
  const query = keys.secrets.raw(project, name)
  return useQuery(
    query.schema,
    query.input,
    {
      enabled: enabled && isAuthenticated && !!project && !!name,
      select: (response) => response.raw,
    },
  )
}

export function useCreateSecret(project: string) {
  const queryClient = useQueryClient()
  const mutation = useMutation(SecretsService.method.createSecret, {
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.secrets.list(project).key })
    },
  })
  const { mutate: rpcMutate, mutateAsync: rpcMutateAsync } = mutation
  const callbacks = useProjectMutationCallbacks(
    project,
    rpcMutate,
    rpcMutateAsync,
    createSecretRequest,
  )

  return {
    ...mutation,
    ...callbacks,
  }
}

export function useDeleteSecret(project: string) {
  const queryClient = useQueryClient()
  const mutation = useMutation(SecretsService.method.deleteSecret, {
    onSuccess: async (_response, { name }) => {
      if (!name) return
      await invalidateSecret(queryClient, project, name, false)
    },
  })
  const { mutate: rpcMutate, mutateAsync: rpcMutateAsync } = mutation
  const callbacks = useProjectMutationCallbacks(
    project,
    rpcMutate,
    rpcMutateAsync,
    deleteSecretRequest,
  )

  return {
    ...mutation,
    ...callbacks,
  }
}

export function useUpdateSecret(project: string) {
  const queryClient = useQueryClient()
  const mutation = useMutation(SecretsService.method.updateSecret, {
    onSuccess: async (_response, { name }) => {
      if (!name) return
      await invalidateSecret(queryClient, project, name)
    },
  })
  const { mutate: rpcMutate, mutateAsync: rpcMutateAsync } = mutation
  const callbacks = useProjectMutationCallbacks(
    project,
    rpcMutate,
    rpcMutateAsync,
    updateSecretRequest,
  )

  return {
    ...mutation,
    ...callbacks,
  }
}

export function useUpdateSecretSharing(project: string) {
  const queryClient = useQueryClient()
  const mutation = useMutation(SecretsService.method.updateSharing, {
    onSuccess: async (_response, { name }) => {
      if (!name) return
      await invalidateSecret(queryClient, project, name)
    },
  })
  const { mutate: rpcMutate, mutateAsync: rpcMutateAsync } = mutation
  const callbacks = useProjectMutationCallbacks(
    project,
    rpcMutate,
    rpcMutateAsync,
    updateSecretSharingRequest,
  )

  return {
    ...mutation,
    ...callbacks,
  }
}

async function invalidateSecret(
  queryClient: QueryClient,
  project: string,
  name: string,
  refetch = true,
) {
  const invalidate = (queryKey: QueryKey) => (
    refetch
      ? queryClient.invalidateQueries({ queryKey })
      : queryClient.invalidateQueries({ queryKey, refetchType: 'none' })
  )
  await invalidate(keys.secrets.list(project).key)
  await invalidate(keys.secrets.detail(project, name).key)
  await invalidate(keys.secrets.raw(project, name).key)
}
