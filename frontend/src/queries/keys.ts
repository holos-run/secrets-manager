import type { DescMessage, DescMethodUnary, MessageInitShape } from '@bufbuild/protobuf'
import { createConnectQueryKey } from '@connectrpc/connect-query'
import { OrganizationService } from '@/gen/holos/console/v1/organizations_pb.js'
import { ProjectService } from '@/gen/holos/console/v1/projects_pb.js'
import { SecretsService } from '@/gen/holos/console/v1/secrets_pb.js'

function queryScope<I extends DescMessage, O extends DescMessage>(
  schema: DescMethodUnary<I, O>,
  input: MessageInitShape<I> | undefined,
) {
  return {
    schema,
    input,
    key: createConnectQueryKey({ schema, input, cardinality: undefined }),
  }
}

// Query hooks consume the schema and input from these scopes, while mutations
// use the matching partial key for targeted invalidation. Omitting transport
// and cardinality keeps the filters compatible with connect-query's generated
// finite query keys without duplicating their internal shape.
export const keys = {
  organizations: {
    list: () => queryScope(OrganizationService.method.listOrganizations, {}),
    detail: (name: string) => queryScope(OrganizationService.method.getOrganization, { name }),
  },
  projects: {
    lists: () => queryScope(ProjectService.method.listProjects, undefined),
    list: (organization: string) => queryScope(ProjectService.method.listProjects, { organization }),
    detail: (name: string) => queryScope(ProjectService.method.getProject, { name }),
  },
  secrets: {
    list: (project: string) => queryScope(SecretsService.method.listSecrets, { project }),
    detail: (project: string, name: string) => queryScope(SecretsService.method.getSecret, { name, project }),
    raw: (project: string, name: string) => queryScope(SecretsService.method.getSecretRaw, { name, project }),
  },
} as const
