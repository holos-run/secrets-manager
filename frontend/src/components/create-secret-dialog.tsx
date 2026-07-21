import { useState } from 'react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SecretDataGrid } from '@/components/secret-data-grid'
import { SharingPanel, type Grant } from '@/components/sharing-panel'
import { Role } from '@/gen/holos/console/v1/rbac_pb'
import { useCreateSecret } from '@/queries/secrets'

interface CreateSecretDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectName: string
  creatorEmail: string
  defaultUserGrants?: Grant[]
  defaultRoleGrants?: Grant[]
}

function initialGrants(creatorEmail: string, defaults: Grant[]): Grant[] {
  const grants: Grant[] = creatorEmail
    ? [{ principal: creatorEmail, role: Role.OWNER }]
    : []
  const seen = new Set(grants.map((grant) => grant.principal))
  for (const grant of defaults) {
    if (!seen.has(grant.principal)) {
      seen.add(grant.principal)
      grants.push({ ...grant })
    }
  }
  return grants
}

export function CreateSecretDialog({
  open,
  onOpenChange,
  projectName,
  creatorEmail,
  defaultUserGrants = [],
  defaultRoleGrants = [],
}: CreateSecretDialogProps) {
  const createMutation = useCreateSecret(projectName)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [data, setData] = useState<Record<string, Uint8Array>>({})
  const [error, setError] = useState<string | null>(null)
  const [userGrants, setUserGrants] = useState<Grant[]>(() => initialGrants(creatorEmail, defaultUserGrants))
  const [roleGrants, setRoleGrants] = useState<Grant[]>(() => defaultRoleGrants.map((grant) => ({ ...grant })))

  const reset = () => {
    setName('')
    setDescription('')
    setUrl('')
    setData({})
    setError(null)
    setUserGrants(initialGrants(creatorEmail, defaultUserGrants))
    setRoleGrants(defaultRoleGrants.map((grant) => ({ ...grant })))
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) reset()
    onOpenChange(nextOpen)
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Secret name is required')
      return
    }
    setError(null)
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        data,
        userGrants: userGrants.filter((grant) => grant.principal.trim()),
        roleGrants: roleGrants.filter((grant) => grant.principal.trim()),
        description: description.trim() || undefined,
        url: url.trim() || undefined,
      })
      toast.success('Secret created')
      onOpenChange(false)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught)
      setError(message)
      toast.error(message)
    }
  }

  const hasDefaults = defaultUserGrants.length > 0 || defaultRoleGrants.length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Secret</DialogTitle>
          <DialogDescription>Create a new secret. You will be added as the Owner.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div>
            <Label htmlFor="secret-name">Name</Label>
            <Input
              id="secret-name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="my-secret"
            />
            <p className="mt-1 text-xs text-muted-foreground">Lowercase alphanumeric and hyphens only</p>
          </div>
          <div>
            <Label htmlFor="secret-description">Description</Label>
            <Input
              id="secret-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this secret used for?"
            />
          </div>
          <div>
            <Label htmlFor="secret-url">URL</Label>
            <Input
              id="secret-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/service"
            />
          </div>
          <div>
            <Label>Data</Label>
            <SecretDataGrid data={data} onChange={setData} />
          </div>
          <SharingPanel
            title="Sharing"
            description={hasDefaults ? 'Pre-filled from project default sharing settings' : undefined}
            userGrants={userGrants}
            roleGrants={roleGrants}
            isOwner
            isSaving={false}
            onSave={async () => {}}
            draft
            onDraftChange={(users, roles) => {
              setUserGrants(users)
              setRoleGrants(roles)
            }}
          />
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void handleCreate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
