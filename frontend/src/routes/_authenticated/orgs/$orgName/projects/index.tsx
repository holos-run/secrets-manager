import { useState, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { createColumnHelper } from '@tanstack/react-table'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus } from 'lucide-react'
import { useListProjects } from '@/queries/projects'
import { useProject } from '@/lib/project-context'
import { useOrg } from '@/lib/org-context'
import { CreateProjectDialog } from '@/components/create-project-dialog'
import { Role } from '@/gen/holos/console/v1/rbac_pb'
import type { Project } from '@/gen/holos/console/v1/projects_pb'
import { ResourceTable, ResourceTableSortHeader, type ResourceColumnDef } from '@/components/resource-table'
import { PageHeader, PageLayout } from '@/components/page-layout'

export const Route = createFileRoute('/_authenticated/orgs/$orgName/projects/')({
  component: ProjectsIndexPage,
})

const columnHelper = createColumnHelper<Project>()

function roleBadge(role: Role) {
  const label =
    role === Role.OWNER ? 'Owner' : role === Role.EDITOR ? 'Editor' : 'Viewer'
  return <Badge variant="outline">{label}</Badge>
}

export function ProjectsIndexPage() {
  const { orgName } = Route.useParams()
  const navigate = useNavigate()
  const { setSelectedProject } = useProject()
  const { selectedOrg, setSelectedOrg } = useOrg()
  const { data, isLoading, error } = useListProjects(orgName)
  const projects = data?.projects ?? []

  // Sync org context when navigating directly to this URL via bookmark
  useEffect(() => {
    if (selectedOrg !== orgName) {
      setSelectedOrg(orgName)
    }
  }, [orgName, selectedOrg, setSelectedOrg])

  const [createOpen, setCreateOpen] = useState(false)

  const columns: ResourceColumnDef<Project>[] = [
    columnHelper.accessor((row) => row.displayName || row.name, {
      id: 'displayName',
      header: ({ column }) => (
        <ResourceTableSortHeader column={column}>Display Name</ResourceTableSortHeader>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.displayName || row.original.name}</span>
      ),
    }),
    columnHelper.accessor('name', {
      header: 'Name',
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="text-muted-foreground font-mono text-sm">{getValue()}</span>
      ),
    }),
    columnHelper.accessor('description', {
      header: 'Description',
      enableSorting: false,
      cell: ({ getValue }) => {
        const desc = getValue()
        if (!desc) return <span className="text-muted-foreground">—</span>
        return (
          <span className="text-muted-foreground truncate max-w-[40ch] block">
            {desc.length > 40 ? `${desc.slice(0, 40)}…` : desc}
          </span>
        )
      },
    }),
    columnHelper.accessor('userRole', {
      header: 'Role',
      enableSorting: false,
      cell: ({ getValue }) => roleBadge(getValue()),
    }),
  ]

  const handleRowClick = (project: Project) => {
    setSelectedProject(project.name)
    navigate({
      to: '/projects/$projectName/secrets',
      params: { projectName: project.name },
    })
  }

  return (
    <>
      <PageLayout>
        <PageHeader
          eyebrow={`Organization / ${orgName}`}
          title="Projects"
          description="Manage the projects and access boundaries in this organization."
          actions={(
            <Button size="sm" onClick={() => setCreateOpen(true)} disabled={isLoading}>
              <Plus data-icon="inline-start" />
              Create Project
            </Button>
          )}
        />
        <Card>
          <CardContent className="pt-6">
            <ResourceTable
              columns={columns}
              data={projects}
              isLoading={isLoading}
              error={error}
              loadingLabel="Loading projects"
              searchPlaceholder="Search projects…"
              emptyMessage="No projects yet. Create one."
              emptyAction={
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  Create Project
                </Button>
              }
              onRowClick={handleRowClick}
            />
          </CardContent>
        </Card>
      </PageLayout>

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultOrganization={orgName}
        onCreated={(name) => setSelectedProject(name)}
      />
    </>
  )
}
