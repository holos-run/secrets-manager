import { useState, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ExternalLink } from 'lucide-react'
import { InlineEditField } from '@/components/inline-edit-field'
import { SecretPageActions } from '@/components/secret-page-actions'
import { DeleteSecretDialog } from '@/components/delete-secret-dialog'
import { SecretPageError, SecretPageLoading } from '@/components/secret-page-state'
import { useAuth } from '@/lib/auth'
import { SecretDataGrid } from '@/components/secret-data-grid'
import { RawView } from '@/components/raw-view'
import { SharingPanel, type Grant } from '@/components/sharing-panel'
import { isSafeUrl } from '@/lib/utils'
import { useGetSecret, useGetSecretMetadata, useGetSecretRaw, useUpdateSecret, useUpdateSecretSharing, useDeleteSecret } from '@/queries/secrets'
import type { ShareGrant } from '@/gen/holos/console/v1/secrets_pb.js'
import { isOwner as computeIsOwner } from '@/lib/isOwner'
import { serializeSecretData } from '@/lib/serialize-secret-data'

export const Route = createFileRoute('/_authenticated/projects/$projectName/secrets/$name')({
  component: SecretPage,
})

export function SecretPage() {
  const { projectName, name } = Route.useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [viewMode, setViewMode] = useState<'editor' | 'raw'>('editor')

  const { data: fetchedData, isLoading: dataLoading, error: dataError } = useGetSecret(projectName, name)
  const { data: metadata, isLoading: metaLoading } = useGetSecretMetadata(projectName, name)
  const { data: rawJson, error: rawError } = useGetSecretRaw(projectName, name, viewMode === 'raw')

  const updateMutation = useUpdateSecret(projectName)
  const updateSharingMutation = useUpdateSecretSharing(projectName)
  const deleteMutation = useDeleteSecret(projectName)

  const [secretData, setSecretData] = useState<Record<string, Uint8Array> | null>(null)
  const [description, setDescription] = useState<string | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [originalDataSerialized, setOriginalDataSerialized] = useState<string | null>(null)
  const [originalDescription, setOriginalDescription] = useState<string | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)

  // View mode
  const [editMode, setEditMode] = useState(false)
  const [includeAllFields, setIncludeAllFields] = useState(false)

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false)

  // Save
  const [saveError, setSaveError] = useState<string | null>(null)

  // Sharing state from metadata
  const [localUserGrants, setLocalUserGrants] = useState<ShareGrant[] | null>(null)
  const [localRoleGrants, setLocalRoleGrants] = useState<ShareGrant[] | null>(null)

  // Initialize local state from fetched data
  useEffect(() => {
    if (fetchedData && originalDataSerialized === null) {
      // Snapshot the first async query result so later edits can be compared for dirtiness.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOriginalDataSerialized(serializeSecretData(fetchedData))
      if (secretData === null) setSecretData(fetchedData)
    }
  }, [fetchedData, originalDataSerialized, secretData])

  useEffect(() => {
    if (metadata && originalDescription === null) {
      // Snapshot the first async metadata result so later edits can be compared for dirtiness.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOriginalDescription(metadata.description ?? '')
      if (description === null) setDescription(metadata.description ?? '')
    }
    if (metadata && originalUrl === null) {
      setOriginalUrl(metadata.url ?? '')
      if (url === null) setUrl(metadata.url ?? '')
    }
  }, [metadata, originalDescription, description, originalUrl, url])

  const effectiveData = secretData ?? fetchedData ?? {}
  const effectiveDescription = description ?? metadata?.description ?? ''
  const effectiveUrl = url ?? metadata?.url ?? ''
  const effectiveUserGrants = localUserGrants ?? metadata?.userGrants ?? []
  const effectiveRoleGrants = localRoleGrants ?? metadata?.roleGrants ?? []

  const isDirty =
    originalDataSerialized !== null &&
    (serializeSecretData(effectiveData) !== originalDataSerialized ||
     effectiveDescription !== (originalDescription ?? '') ||
     effectiveUrl !== (originalUrl ?? ''))

  const userEmail = user?.profile?.email as string | undefined
  const userGroups = Array.isArray((user?.profile as Record<string, unknown> | undefined)?.groups)
    ? ((user!.profile as Record<string, unknown>).groups as string[])
    : []
  const isOwner = computeIsOwner(userEmail, userGroups, effectiveUserGrants, effectiveRoleGrants)

  const handleSaveSharing = async (newUserGrants: Grant[], newRoleGrants: Grant[]) => {
    try {
      const response = await updateSharingMutation.mutateAsync({
        name,
        userGrants: newUserGrants,
        roleGrants: newRoleGrants,
      })
      if (response.metadata) {
        setLocalUserGrants(response.metadata.userGrants)
        setLocalRoleGrants(response.metadata.roleGrants)
      }
      toast.success('Sharing saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
      throw err
    }
  }

  const handleSave = async () => {
    if (!isDirty) return
    setSaveError(null)
    try {
      await updateMutation.mutateAsync({
        name,
        data: effectiveData,
        description: effectiveDescription,
        url: effectiveUrl,
      })
      setOriginalDataSerialized(serializeSecretData(effectiveData))
      setOriginalDescription(effectiveDescription)
      setOriginalUrl(effectiveUrl)
      toast.success('Secret saved')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setSaveError(message)
      toast.error(message)
    }
  }

  const handleCancel = () => {
    setEditMode(false)
    setSaveError(null)
    // Revert data changes
    if (fetchedData) setSecretData(fetchedData)
    if (originalDescription !== null) setDescription(originalDescription)
    if (originalUrl !== null) setUrl(originalUrl)
  }

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(name)
      toast.success('Secret deleted')
      setDeleteOpen(false)
      navigate({ to: '/projects/$projectName/secrets', params: { projectName } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const isLoading = dataLoading || metaLoading

  if (authLoading || (isAuthenticated && isLoading)) {
    return <SecretPageLoading />
  }

  const displayError = dataError || rawError
  if (displayError) {
    return <SecretPageError error={displayError} name={name} />
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <p className="text-sm text-muted-foreground">{projectName} / Secrets</p>
        <h2 className="text-xl font-semibold">{name}</h2>

        {/* Metadata edits are staged locally; the page-level Save button persists both fields. */}
        <InlineEditField
          label="Description"
          value={effectiveDescription}
          emptyText="No description"
          placeholder="What is this secret used for?"
          onSave={(nextDescription) => setDescription(nextDescription)}
        />

        <InlineEditField
          label="URL"
          value={effectiveUrl}
          emptyText="No URL"
          placeholder="https://example.com/service"
          onSave={(nextUrl) => setUrl(nextUrl)}
          renderValue={(currentUrl) => isSafeUrl(currentUrl) ? (
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink />
              {currentUrl}
            </a>
          ) : currentUrl}
        />

        <SecretPageActions
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          editMode={editMode}
          onEdit={() => setEditMode(true)}
          onSave={() => void handleSave()}
          onCancel={handleCancel}
          onDelete={() => setDeleteOpen(true)}
          isDirty={isDirty}
          isSaving={updateMutation.isPending}
        />

        {viewMode === 'editor' && (
          <>
            {saveError && (
              <Alert variant="destructive"><AlertDescription>{saveError}</AlertDescription></Alert>
            )}
            <SecretDataGrid data={effectiveData} onChange={(newData) => setSecretData(newData)} readOnly={!editMode} />
          </>
        )}

        {viewMode === 'raw' && rawJson && (
          <RawView raw={rawJson} includeAllFields={includeAllFields} onToggleIncludeAllFields={() => setIncludeAllFields((p) => !p)} />
        )}

        <SharingPanel
          userGrants={effectiveUserGrants}
          roleGrants={effectiveRoleGrants}
          isOwner={isOwner}
          onSave={handleSaveSharing}
          isSaving={updateSharingMutation.isPending}
        />
      </CardContent>

      <DeleteSecretDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        name={name}
        error={deleteMutation.error}
        isPending={deleteMutation.isPending}
        onConfirm={() => void handleDelete()}
      />
    </Card>
  )
}
