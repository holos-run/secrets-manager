import type { Transport } from '@connectrpc/connect'
import { createConnectQueryKey } from '@connectrpc/connect-query'
import { QueryClient } from '@tanstack/react-query'
import { SecretsService } from '@/gen/holos/console/v1/secrets_pb.js'
import { keys } from './keys'

describe('query key scopes', () => {
  it('invalidates a transport-aware finite query with a partial factory key', async () => {
    const queryClient = new QueryClient()
    const readKey = createConnectQueryKey({
      schema: SecretsService.method.listSecrets,
      input: { project: 'my-project' },
      transport: {} as Transport,
      cardinality: 'finite',
    })
    queryClient.setQueryData(readKey, { secrets: [] })

    await queryClient.invalidateQueries({
      queryKey: keys.secrets.list('my-project').key,
      refetchType: 'none',
    })

    expect(queryClient.getQueryState(readKey)?.isInvalidated).toBe(true)
  })
})
