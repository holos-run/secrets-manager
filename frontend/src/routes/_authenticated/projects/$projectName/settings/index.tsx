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
import { useGetProject, useUpdateProject, useUpdateProjectSharing, useUpdateProjectDefaultSharing, useDeleteProject } from '@/queries/projects'

export const Route = createFileRoute('/_authenticated/projects/$projectName/settings/')({
  component: ProjectSettingsRoute,
})

function ProjectSettingsRoute() {
  const { projectName } = Route.useParams()
  return <ProjectSettingsPage projectName={projectName} />
}

export function ProjectSettingsPage({ projectName: propProjectName }: { projectName?: string } = {}) {
  // Support both direct prop (for tests) and route params
  let routeProjectName: string | undefined
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    routeProjectName = Route.useParams().projectName
  } catch {
    routeProjectName = undefined
  }
  const projectName = propProjectName ?? routeProjectName ?? ''

  const navigate = useNavigate()
  const { data: project, isPending, error } = useGetProject(projectName)
  const updateProject = useUpdateProject()
  const updateProjectSharing = useUpdateProjectSharing()
  const updateProjectDefaultSharing = useUpdateProjectDefaultSharing()
  const deleteProject = useDeleteProject()

  const [deleteOpen, setDeleteOpen] = useState(false)

  const handleSaveDisplayName = async (displayName: string) => {
    try {
      await updateProject.mutateAsync({ name: projectName, displayName })
      toast.success('Saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
      throw err
    }
  }

  const handleSaveDescription = async (description: string) => {
    try {
      await updateProject.mutateAsync({ name: projectName, description })
      toast.success('Saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
      throw err
    }
  }

  const handleSaveSharing = async (userGrants: Grant[], roleGrants: Grant[]) => {
    try {
      await updateProjectSharing.mutateAsync({ name: projectName, userGrants, roleGrants })
      toast.success('Sharing saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
      throw err
    }
  }

  const handleSaveDefaultSharing = async (defaultUserGrants: Grant[], defaultRoleGrants: Grant[]) => {
    try {
      await updateProjectDefaultSharing.mutateAsync({ name: projectName, defaultUserGrants, defaultRoleGrants })
      toast.success('Default sharing saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
      throw err
    }
  }

  const handleDelete = async () => {
    try {
      await deleteProject.mutateAsync({ name: projectName })
      toast.success('Project deleted')
      setDeleteOpen(false)
      navigate({ to: '/' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const isOwner = project?.userRole === Role.OWNER

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

  const displayName = project?.displayName ?? ''
  const description = project?.description ?? ''
  const userGrants = (project?.userGrants ?? []) as Grant[]
  const roleGrants = (project?.roleGrants ?? []) as Grant[]
  const defaultUserGrants = (project?.defaultUserGrants ?? []) as Grant[]
  const defaultRoleGrants = (project?.defaultRoleGrants ?? []) as Grant[]

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">{projectName} / Settings</p>
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
            isSaving={updateProject.isPending}
          />

          {/* Name (slug) - read-only */}
          <div className="flex items-center gap-2">
            <span className="w-32 text-sm text-muted-foreground shrink-0">Name (slug)</span>
            <span className="flex-1 text-sm font-mono">{projectName}</span>
          </div>

          <InlineEditField
            label="Description"
            value={description}
            emptyText="No description"
            multiline
            onSave={handleSaveDescription}
            isSaving={updateProject.isPending}
          />
        </div>

        {/* Sharing section */}
        <SharingPanel
          userGrants={userGrants}
          roleGrants={roleGrants}
          isOwner={isOwner}
          onSave={handleSaveSharing}
          isSaving={updateProjectSharing.isPending}
        />

        {/* Default Secret Sharing section */}
        <SharingPanel
          title="Default Secret Sharing"
          description="These grants are automatically applied to every new secret created in this project."
          userGrants={defaultUserGrants}
          roleGrants={defaultRoleGrants}
          isOwner={isOwner}
          onSave={handleSaveDefaultSharing}
          isSaving={updateProjectDefaultSharing.isPending}
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
              Delete Project
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              This will permanently delete {projectName}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteProject.error && (
            <Alert variant="destructive">
              <AlertDescription>{deleteProject.error.message}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteProject.isPending}>
              {deleteProject.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
