import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SharingPanel, type Grant } from '@/components/sharing-panel'
import { InlineEditField } from '@/components/inline-edit-field'
import { Role } from '@/gen/holos/console/v1/rbac_pb'
import {
  useGetOrganization,
  useUpdateOrganization,
  useUpdateOrganizationSharing,
  useDeleteOrganization,
} from '@/queries/organizations'

export const Route = createFileRoute('/_authenticated/orgs/$orgName/settings/')({
  component: OrgSettingsRoute,
})

function OrgSettingsRoute() {
  const { orgName } = Route.useParams()
  return <OrgSettingsPage orgName={orgName} />
}

export function OrgSettingsPage({ orgName: propOrgName }: { orgName?: string } = {}) {
  // Support both direct prop (for tests) and route params
  let routeOrgName: string | undefined
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    routeOrgName = Route.useParams().orgName
  } catch {
    routeOrgName = undefined
  }
  const orgName = propOrgName ?? routeOrgName ?? ''

  const navigate = useNavigate()
  const { data: org, isPending, error } = useGetOrganization(orgName)
  const updateOrganization = useUpdateOrganization()
  const updateOrganizationSharing = useUpdateOrganizationSharing()
  const deleteOrganization = useDeleteOrganization()

  const [deleteOpen, setDeleteOpen] = useState(false)

  const handleSaveDisplayName = async (displayName: string) => {
    try {
      await updateOrganization.mutateAsync({ name: orgName, displayName })
      toast.success('Saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
      throw err
    }
  }

  const handleSaveDescription = async (description: string) => {
    try {
      await updateOrganization.mutateAsync({ name: orgName, description })
      toast.success('Saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
      throw err
    }
  }

  const handleSaveSharing = async (userGrants: Grant[], roleGrants: Grant[]) => {
    try {
      await updateOrganizationSharing.mutateAsync({ name: orgName, userGrants, roleGrants })
      toast.success('Sharing saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
      throw err
    }
  }

  const handleDelete = async () => {
    try {
      await deleteOrganization.mutateAsync({ name: orgName })
      toast.success('Organization deleted')
      setDeleteOpen(false)
      navigate({ to: '/' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const isOwner = org?.userRole === Role.OWNER

  if (isPending) {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const displayName = org?.displayName ?? ''
  const description = org?.description ?? ''
  const userGrants = (org?.userGrants ?? []) as Grant[]
  const roleGrants = (org?.roleGrants ?? []) as Grant[]

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">{orgName} / Settings</p>
          <h2 className="text-xl font-semibold mt-1">Settings</h2>
        </div>

        {/* General section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">General</h3>
          <Separator />

          <InlineEditField
            label="Display Name"
            value={displayName}
            emptyText="No display name"
            onSave={handleSaveDisplayName}
            isSaving={updateOrganization.isPending}
          />

          {/* Name (slug) - read-only */}
          <div className="flex items-center gap-2">
            <span className="w-32 text-sm text-muted-foreground shrink-0">Name (slug)</span>
            <span className="flex-1 text-sm font-mono">{orgName}</span>
          </div>

          <InlineEditField
            label="Description"
            value={description}
            emptyText="No description"
            multiline
            onSave={handleSaveDescription}
            isSaving={updateOrganization.isPending}
          />
        </div>

        {/* Sharing section */}
        <SharingPanel
          userGrants={userGrants}
          roleGrants={roleGrants}
          isOwner={isOwner}
          onSave={handleSaveSharing}
          isSaving={updateOrganizationSharing.isPending}
        />

        {/* Danger Zone */}
        {isOwner && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-destructive">Danger Zone</h3>
            <Separator />
            <Button
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              Delete Organization
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
            <DialogDescription>
              This will permanently delete {orgName} and all its projects. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteOrganization.error && (
            <Alert variant="destructive">
              <AlertDescription>{deleteOrganization.error.message}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteOrganization.isPending}>
              {deleteOrganization.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
