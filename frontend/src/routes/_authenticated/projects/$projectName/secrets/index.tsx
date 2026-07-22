import { useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { Lock, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { CreateSecretDialog } from '@/components/create-secret-dialog'
import { ResourceTable, ResourceTableSortHeader, type ResourceColumnDef } from '@/components/resource-table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Grant } from '@/components/sharing-panel'
import type { SecretMetadata } from '@/gen/holos/console/v1/secrets_pb.js'
import { useAuth } from '@/lib/auth'
import { useGetProject } from '@/queries/projects'
import { useDeleteSecret, useListSecrets } from '@/queries/secrets'
import { PageHeader, PageLayout } from '@/components/page-layout'

export const Route = createFileRoute('/_authenticated/projects/$projectName/secrets/')({
  component: SecretsListPage,
})

function sharingSummary(userCount: number, roleCount: number): string | undefined {
  const parts: string[] = []
  if (userCount > 0) parts.push(`${userCount} user${userCount !== 1 ? 's' : ''}`)
  if (roleCount > 0) parts.push(`${roleCount} role${roleCount !== 1 ? 's' : ''}`)
  return parts.length > 0 ? parts.join(', ') : undefined
}

const columnHelper = createColumnHelper<SecretMetadata>()

export function SecretsListPage() {
  const { projectName } = Route.useParams()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { data: secrets = [], isLoading, error } = useListSecrets(projectName)
  const { data: project } = useGetProject(projectName)
  const deleteMutation = useDeleteSecret(projectName)
  const [createOpen, setCreateOpen] = useState(false)
  const [createSession, setCreateSession] = useState(0)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const columns = useMemo<ResourceColumnDef<SecretMetadata>[]>(() => [
    columnHelper.accessor('name', {
      header: ({ column }) => <ResourceTableSortHeader column={column}>Name</ResourceTableSortHeader>,
      cell: ({ row }) => {
        const secret = row.original
        if (!secret.accessible) return <span className="font-medium opacity-50">{secret.name}</span>
        return (
          <Link
            to="/projects/$projectName/secrets/$name"
            params={{ projectName, name: secret.name }}
            className="font-medium hover:underline"
          >
            {secret.name}
          </Link>
        )
      },
    }),
    columnHelper.accessor('description', {
      header: 'Description',
      enableSorting: false,
      cell: ({ getValue }) => {
        const description = getValue()
        return description ? (
          <span className="block max-w-[60ch] truncate text-muted-foreground">
            {description.length > 60 ? `${description.slice(0, 60)}…` : description}
          </span>
        ) : <span className="text-muted-foreground">—</span>
      },
    }),
    columnHelper.display({
      id: 'sharing',
      header: 'Sharing',
      cell: ({ row }) => {
        const secret = row.original
        if (!secret.accessible) {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline"><Lock />No access</Badge>
                </TooltipTrigger>
                <TooltipContent><p>You do not have access to this secret</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        }
        const summary = sharingSummary(secret.userGrants.length, secret.roleGrants.length)
        return summary ? <Badge variant="outline">{summary}</Badge> : <span className="text-muted-foreground">—</span>
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => row.original.accessible ? (
        <Button
          variant="ghost"
          size="icon"
          aria-label={`delete ${row.original.name}`}
          onClick={(event) => {
            event.stopPropagation()
            setDeleteTarget(row.original.name)
            deleteMutation.reset()
            setDeleteOpen(true)
          }}
        >
          <Trash2 />
        </Button>
      ) : null,
    }),
  ], [deleteMutation, projectName])

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget)
      toast.success('Secret deleted')
      setDeleteOpen(false)
      setDeleteTarget(null)
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : String(caught))
    }
  }

  const showLoading = authLoading || (isAuthenticated && isLoading)
  const creatorEmail = (user?.profile?.email as string | undefined) ?? ''
  const openCreateDialog = () => {
    setCreateSession((session) => session + 1)
    setCreateOpen(true)
  }

  return (
    <>
      <PageLayout>
        <PageHeader
          eyebrow={`Project / ${projectName}`}
          title="Secrets"
          description="Store, inspect, and control access to project credentials."
          actions={<Button size="sm" onClick={openCreateDialog} disabled={showLoading}>Create Secret</Button>}
        />
        <Card>
          <CardContent className="pt-6">
            <ResourceTable
              columns={columns}
              data={secrets}
              initialSorting={[{ id: 'name', desc: false }]}
              isLoading={showLoading}
              error={error}
              loadingLabel="Loading secrets"
              searchPlaceholder="Search secrets…"
              emptyMessage="No secrets yet."
              emptyAction={<Button size="sm" onClick={openCreateDialog}>Create Secret</Button>}
            />
          </CardContent>
        </Card>
      </PageLayout>

      <CreateSecretDialog
        key={createSession}
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectName={projectName}
        creatorEmail={creatorEmail}
        defaultUserGrants={(project?.defaultUserGrants ?? []) as Grant[]}
        defaultRoleGrants={(project?.defaultRoleGrants ?? []) as Grant[]}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Secret</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete secret &quot;{deleteTarget}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteMutation.error && (
            <Alert variant="destructive"><AlertDescription>{deleteMutation.error.message}</AlertDescription></Alert>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => void handleDeleteConfirm()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
