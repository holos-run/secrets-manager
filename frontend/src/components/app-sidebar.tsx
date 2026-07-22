import { useState } from 'react'
import type React from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import {
  Building2,
  Info,
  KeyRound,
  FolderKanban,
  Plus,
  Settings,
  User,
  ChevronsUpDown,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useOrg } from '@/lib/org-context'
import { useProject } from '@/lib/project-context'
import { useVersion } from '@/queries/version'
import { getAppConfig } from '@/lib/app-config'
import { CreateOrgDialog } from '@/components/create-org-dialog'
import { CreateProjectDialog } from '@/components/create-project-dialog'

const bottomItems = [
  { label: 'About', to: '/about' as const, icon: Info },
  { label: 'Profile', to: '/profile' as const, icon: User },
]

function WorkspacePickerSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="px-2 text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  )
}

function renderWorkspacePickerTrigger({
  testId,
  icon: Icon,
  label,
}: {
  testId: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <SidebarMenuButton
      data-testid={testId}
      size="lg"
      className="border border-sidebar-border bg-sidebar-accent/35"
    >
      <Icon />
      <span className="truncate">{label}</span>
      <ChevronsUpDown className="ml-auto opacity-50" />
    </SidebarMenuButton>
  )
}

export function AppSidebar() {
  const { appName } = getAppConfig()
  const { data: versionData } = useVersion()
  const router = useRouter()
  const pathname = router.state.location.pathname.replace(/\/$/, '') || '/'
  const { projects, selectedProject } = useProject()
  const { selectedOrg, organizations } = useOrg()

  const selectedOrgObj = organizations.find((o) => o.name === selectedOrg)
  const orgDisplayName = selectedOrgObj
    ? (selectedOrgObj.displayName || selectedOrgObj.name)
    : selectedOrg ?? ''

  const selectedProjectObj = projects.find((p) => p.name === selectedProject)
  const projectDisplayName = selectedProjectObj
    ? (selectedProjectObj.displayName || selectedProjectObj.name)
    : selectedProject ?? ''

  const orgNavItems: Array<{
    label: string
    to: string
    params: Record<string, string>
    icon: React.ComponentType<{ className?: string }>
    activePath: string
  }> = selectedOrg
    ? [
        {
          label: 'Projects',
          to: '/orgs/$orgName/projects' as const,
          params: { orgName: selectedOrg },
          icon: FolderKanban,
          activePath: `/orgs/${selectedOrg}/projects`,
        },
        {
          label: 'Org Settings',
          to: '/orgs/$orgName/settings/' as const,
          params: { orgName: selectedOrg },
          icon: Settings,
          activePath: `/orgs/${selectedOrg}/settings`,
        },
      ]
    : []

  const projectNavItems: Array<{
    label: string
    to: string
    params: Record<string, string>
    icon: React.ComponentType<{ className?: string }>
    activePath: string
  }> = selectedProject
    ? [
        {
          label: 'Secrets',
          to: '/projects/$projectName/secrets' as const,
          params: { projectName: selectedProject },
          icon: KeyRound,
          activePath: `/projects/${selectedProject}/secrets`,
        },
        {
          label: 'Project Settings',
          to: '/projects/$projectName/settings/' as const,
          params: { projectName: selectedProject },
          icon: Settings,
          activePath: `/projects/${selectedProject}/settings`,
        },
      ]
    : []

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="gap-3 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm shadow-sidebar-primary/20">
            <KeyRound aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight">{appName}</div>
            {versionData?.version && (
              <div className="font-mono text-[0.6875rem] text-muted-foreground">
                {versionData.version}
              </div>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent className="flex flex-col gap-3">
            <OrgPicker />
            <ProjectPicker />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {orgNavItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>{orgDisplayName}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {orgNavItems.map((item) => {
                  const isActive =
                    pathname === item.activePath || pathname.startsWith(`${item.activePath}/`)
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link
                          to={item.to}
                          params={item.params}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {projectNavItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>{projectDisplayName}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {projectNavItems.map((item) => {
                  const isActive =
                    pathname === item.activePath || pathname.startsWith(`${item.activePath}/`)
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link
                          to={item.to}
                          params={item.params}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <item.icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          {bottomItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton asChild isActive={pathname === item.to}>
                <Link to={item.to} aria-current={pathname === item.to ? 'page' : undefined}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        <SidebarSeparator />
      </SidebarFooter>
    </Sidebar>
  )
}

function OrgPicker() {
  const { organizations, selectedOrg, setSelectedOrg, isLoading } = useOrg()
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)

  if (isLoading) return null

  if (organizations.length === 0) {
    return (
      <WorkspacePickerSection label="Organization">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setCreateOpen(true)}
        >
          <Plus data-icon="inline-start" /> New Organization
        </Button>
        <CreateOrgDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={(name) => setSelectedOrg(name)}
        />
      </WorkspacePickerSection>
    )
  }

  const selectedOrgObj = organizations.find((o) => o.name === selectedOrg)
  const displayLabel = selectedOrgObj
    ? (selectedOrgObj.displayName || selectedOrgObj.name)
    : 'All Organizations'

  return (
    <WorkspacePickerSection label="Organization">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {renderWorkspacePickerTrigger({
            testId: 'org-picker',
            icon: Building2,
            label: displayLabel,
          })}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuItem onClick={() => setSelectedOrg(null)}>
            All Organizations
          </DropdownMenuItem>
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.name}
              onClick={() => {
                setSelectedOrg(org.name)
                router.navigate({
                  to: '/orgs/$orgName/projects',
                  params: { orgName: org.name },
                })
              }}
            >
              {org.displayName || org.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)}>
            <Plus /> New Organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateOrgDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(name) => setSelectedOrg(name)}
      />
    </WorkspacePickerSection>
  )
}

function ProjectPicker() {
  const { selectedOrg } = useOrg()
  const { projects, selectedProject, setSelectedProject, isLoading } = useProject()
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)

  // Only show when an org is selected
  if (!selectedOrg) return null
  if (isLoading) return null

  if (projects.length === 0) {
    return (
      <WorkspacePickerSection label="Project">
        <p className="px-2 text-xs text-muted-foreground">No projects yet.</p>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setCreateOpen(true)}
        >
          <Plus data-icon="inline-start" /> New Project
        </Button>
        <CreateProjectDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          defaultOrganization={selectedOrg}
          onCreated={(name) => setSelectedProject(name)}
        />
      </WorkspacePickerSection>
    )
  }

  const selectedProjectObj = projects.find((p) => p.name === selectedProject)
  const displayLabel = selectedProjectObj
    ? (selectedProjectObj.displayName || selectedProjectObj.name)
    : 'All Projects'

  return (
    <WorkspacePickerSection label="Project">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {renderWorkspacePickerTrigger({
            testId: 'project-picker',
            icon: FolderKanban,
            label: displayLabel,
          })}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuItem
            onClick={() => {
              setSelectedProject(null)
              router.navigate({
                to: '/orgs/$orgName/projects',
                params: { orgName: selectedOrg },
              })
            }}
          >
            All Projects
          </DropdownMenuItem>
          {projects.map((project) => (
            <DropdownMenuItem
              key={project.name}
              onClick={() => {
                setSelectedProject(project.name)
                router.navigate({
                  to: '/projects/$projectName/secrets',
                  params: { projectName: project.name },
                })
              }}
            >
              {project.displayName || project.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)}>
            <Plus /> New Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultOrganization={selectedOrg}
        onCreated={(name) => setSelectedProject(name)}
      />
    </WorkspacePickerSection>
  )
}
