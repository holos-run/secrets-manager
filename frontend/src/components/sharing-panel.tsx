import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2 } from 'lucide-react'
import { Role } from '@/gen/holos/console/v1/rbac_pb'

export interface Grant {
  principal: string
  role: Role
  nbf?: bigint
  exp?: bigint
}

export interface SharingPanelProps {
  userGrants: Grant[]
  roleGrants: Grant[]
  isOwner: boolean
  onSave: (userGrants: Grant[], roleGrants: Grant[]) => Promise<void>
  isSaving: boolean
  title?: string
  description?: string
  draft?: boolean
  onDraftChange?: (userGrants: Grant[], roleGrants: Grant[]) => void
}

function createGrantRowId(kind: 'user' | 'role'): string {
  return `${kind}-${crypto.randomUUID()}`
}

interface GrantRow {
  id: string
  grant: Grant
}

function createGrantRow(kind: 'user' | 'role', grant: Grant): GrantRow {
  return { id: createGrantRowId(kind), grant }
}

function roleName(role: Role): string {
  switch (role) {
    case Role.OWNER: return 'Owner'
    case Role.EDITOR: return 'Editor'
    case Role.VIEWER: return 'Viewer'
    default: return 'Unknown'
  }
}

function formatTimeBound(ts?: bigint): string {
  if (ts == null) return ''
  return new Date(Number(ts) * 1000).toLocaleString()
}

function grantSecondary(role: Role, nbf?: bigint, exp?: bigint): string {
  const parts = [roleName(role)]
  parts.push(nbf != null ? `from ${formatTimeBound(nbf)}` : 'no start restriction')
  parts.push(exp != null ? `until ${formatTimeBound(exp)}` : 'no expiration')
  return parts.join(' \u00b7 ')
}

function timestampToDatetimeLocal(ts?: bigint): string {
  if (ts == null) return ''
  const d = new Date(Number(ts) * 1000)
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}T00:00`
}

function datetimeLocalToTimestamp(value: string): bigint | undefined {
  if (!value) return undefined
  const datePart = value.split('T')[0]
  const d = new Date(datePart + 'T00:00:00Z')
  if (isNaN(d.getTime())) return undefined
  return BigInt(Math.floor(d.getTime() / 1000))
}

function defaultNbfUTC(): bigint {
  const now = new Date()
  const todayMidnightUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  return BigInt(Math.floor(todayMidnightUTC.getTime() / 1000))
}

function defaultExpirationUTC(): bigint {
  const now = new Date()
  const firstOfMonthAfterNext = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 1))
  const lastDayOfNextMonth = new Date(firstOfMonthAfterNext.getTime() - 24 * 60 * 60 * 1000)
  return BigInt(Math.floor(lastDayOfNextMonth.getTime() / 1000))
}

export function SharingPanel({ userGrants, roleGrants, isOwner, onSave, isSaving, title = 'Sharing', description, draft = false, onDraftChange }: SharingPanelProps) {
  const [editing, setEditing] = useState(false)
  const [editUserGrants, setEditUserGrants] = useState<Grant[]>([])
  const [editRoleGrants, setEditRoleGrants] = useState<Grant[]>([])
  const [saveError, setSaveError] = useState<string | null>(null)
  const [editUserRowIds, setEditUserRowIds] = useState<string[]>([])
  const [editRoleRowIds, setEditRoleRowIds] = useState<string[]>([])

  const handleEdit = () => {
    setEditUserGrants(userGrants.map((g) => ({ ...g })))
    setEditRoleGrants(roleGrants.map((g) => ({ ...g })))
    setEditUserRowIds(userGrants.map(() => createGrantRowId('user')))
    setEditRoleRowIds(roleGrants.map(() => createGrantRowId('role')))
    setSaveError(null)
    setEditing(true)
  }

  const handleCancel = () => {
    setSaveError(null)
    setEditing(false)
  }

  const handleSave = async () => {
    const users = editUserGrants.filter((g) => g.principal.trim() !== '')
    const roles = editRoleGrants.filter((g) => g.principal.trim() !== '')
    try {
      await onSave(users, roles)
      setEditing(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleUserChange = (index: number, field: keyof Grant, value: string | Role | bigint | undefined) => {
    const updated = [...editUserGrants]
    updated[index] = { ...updated[index], [field]: value }
    setEditUserGrants(updated)
  }

  const handleRoleChange = (index: number, field: keyof Grant, value: string | Role | bigint | undefined) => {
    const updated = [...editRoleGrants]
    updated[index] = { ...updated[index], [field]: value }
    setEditRoleGrants(updated)
  }

  const hasGrants = userGrants.length > 0 || roleGrants.length > 0

  if (draft) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <GrantEditor
          userGrants={userGrants}
          roleGrants={roleGrants}
          onChange={(users, roles) => onDraftChange?.(users, roles)}
        />
      </div>
    )
  }

  if (!editing) {
    return (
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">{title}</h3>
          {isOwner && (
            <Button variant="ghost" size="sm" onClick={handleEdit}>Edit</Button>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
        {!hasGrants ? (
          <p className="text-sm text-muted-foreground">No sharing grants configured.</p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {userGrants.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Users</p>
                <ul className="flex flex-col gap-1">
                  {userGrants.map((g) => (
                    <li key={g.principal} className="text-sm">
                      <span className="font-medium">{g.principal}</span>
                      <span className="text-muted-foreground ml-2">{grantSecondary(g.role, g.nbf, g.exp)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {roleGrants.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Roles</p>
                <ul className="flex flex-col gap-1">
                  {roleGrants.map((g) => (
                    <li key={g.principal} className="text-sm">
                      <span className="font-medium">{g.principal}</span>
                      <span className="text-muted-foreground ml-2">{grantSecondary(g.role, g.nbf, g.exp)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <h3 className="text-sm font-medium">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      <div>
        <p className="text-xs text-muted-foreground mb-2">Users</p>
        {editUserGrants.map((g, i) => (
          <div key={editUserRowIds[i]} className="mb-3 flex flex-col gap-2">
            <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center">
              <Input
                placeholder="Email address"
                value={g.principal}
                onChange={(e) => handleUserChange(i, 'principal', e.target.value)}
                className="flex-1"
              />
              <Select
                value={String(g.role)}
                onValueChange={(v) => handleUserChange(i, 'role', Number(v) as Role)}
              >
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={String(Role.VIEWER)}>Viewer</SelectItem>
                    <SelectItem value={String(Role.EDITOR)}>Editor</SelectItem>
                    <SelectItem value={String(Role.OWNER)}>Owner</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                aria-label="remove"
                onClick={() => {
                  setEditUserRowIds(editUserRowIds.filter((_, j) => j !== i))
                  setEditUserGrants(editUserGrants.filter((_, j) => j !== i))
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex-1">
                <Label className="text-xs">Not before</Label>
                <div className="flex gap-1 items-center">
                  <Input
                    type="datetime-local"
                    value={timestampToDatetimeLocal(g.nbf)}
                    onChange={(e) => handleUserChange(i, 'nbf', datetimeLocalToTimestamp(e.target.value))}
                    className="flex-1"
                  />
                  {g.nbf == null && (
                    <Button variant="outline" size="sm" onClick={() => handleUserChange(i, 'nbf', defaultNbfUTC())}>Set</Button>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <Label className="text-xs">Expires</Label>
                <div className="flex gap-1 items-center">
                  <Input
                    type="datetime-local"
                    value={timestampToDatetimeLocal(g.exp)}
                    onChange={(e) => handleUserChange(i, 'exp', datetimeLocalToTimestamp(e.target.value))}
                    className="flex-1"
                  />
                  {g.exp == null && (
                    <Button variant="outline" size="sm" onClick={() => handleUserChange(i, 'exp', defaultExpirationUTC())}>Set</Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditUserRowIds([...editUserRowIds, createGrantRowId('user')])
            setEditUserGrants([...editUserGrants, { principal: '', role: Role.VIEWER }])
          }}
        >
          Add User
        </Button>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-2">Roles</p>
        {editRoleGrants.map((g, i) => (
          <div key={editRoleRowIds[i]} className="mb-3 flex flex-col gap-2">
            <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center">
              <Input
                placeholder="Role name"
                value={g.principal}
                onChange={(e) => handleRoleChange(i, 'principal', e.target.value)}
                className="flex-1"
              />
              <Select
                value={String(g.role)}
                onValueChange={(v) => handleRoleChange(i, 'role', Number(v) as Role)}
              >
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={String(Role.VIEWER)}>Viewer</SelectItem>
                    <SelectItem value={String(Role.EDITOR)}>Editor</SelectItem>
                    <SelectItem value={String(Role.OWNER)}>Owner</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                aria-label="remove"
                onClick={() => {
                  setEditRoleRowIds(editRoleRowIds.filter((_, j) => j !== i))
                  setEditRoleGrants(editRoleGrants.filter((_, j) => j !== i))
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex-1">
                <Label className="text-xs">Not before</Label>
                <div className="flex gap-1 items-center">
                  <Input
                    type="datetime-local"
                    value={timestampToDatetimeLocal(g.nbf)}
                    onChange={(e) => handleRoleChange(i, 'nbf', datetimeLocalToTimestamp(e.target.value))}
                    className="flex-1"
                  />
                  {g.nbf == null && (
                    <Button variant="outline" size="sm" onClick={() => handleRoleChange(i, 'nbf', defaultNbfUTC())}>Set</Button>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <Label className="text-xs">Expires</Label>
                <div className="flex gap-1 items-center">
                  <Input
                    type="datetime-local"
                    value={timestampToDatetimeLocal(g.exp)}
                    onChange={(e) => handleRoleChange(i, 'exp', datetimeLocalToTimestamp(e.target.value))}
                    className="flex-1"
                  />
                  {g.exp == null && (
                    <Button variant="outline" size="sm" onClick={() => handleRoleChange(i, 'exp', defaultExpirationUTC())}>Set</Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditRoleRowIds([...editRoleRowIds, createGrantRowId('role')])
            setEditRoleGrants([...editRoleGrants, { principal: '', role: Role.VIEWER }])
          }}
        >
          Add Role
        </Button>
      </div>

      {saveError && (
        <Alert variant="destructive">
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
      </div>
    </div>
  )
}

function GrantEditor({
  userGrants,
  roleGrants,
  onChange,
}: {
  userGrants: Grant[]
  roleGrants: Grant[]
  onChange: (userGrants: Grant[], roleGrants: Grant[]) => void
}) {
  const [userRows, setUserRows] = useState(() => userGrants.map((grant) => createGrantRow('user', grant)))
  const [roleRows, setRoleRows] = useState(() => roleGrants.map((grant) => createGrantRow('role', grant)))

  const publish = (users: GrantRow[], roles: GrantRow[]) => {
    setUserRows(users)
    setRoleRows(roles)
    onChange(users.map((row) => row.grant), roles.map((row) => row.grant))
  }

  const updateUser = (index: number, field: keyof Grant, value: string | Role | bigint | undefined) => {
    const updated = userRows.map((row, grantIndex) =>
      grantIndex === index ? { ...row, grant: { ...row.grant, [field]: value } } : row,
    )
    publish(updated, roleRows)
  }
  const updateRole = (index: number, field: keyof Grant, value: string | Role | bigint | undefined) => {
    const updated = roleRows.map((row, grantIndex) =>
      grantIndex === index ? { ...row, grant: { ...row.grant, [field]: value } } : row,
    )
    publish(userRows, updated)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-xs text-muted-foreground">Users</p>
        <div className="flex flex-col gap-3">
          {userRows.map(({ id, grant }, index) => (
            <div key={id} className="flex items-center gap-2">
              <Input
                aria-label={`user ${index + 1}`}
                placeholder="Email address"
                value={grant.principal}
                onChange={(event) => updateUser(index, 'principal', event.target.value)}
                className="flex-1"
              />
              <Select value={String(grant.role)} onValueChange={(value) => updateUser(index, 'role', Number(value) as Role)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={String(Role.VIEWER)}>Viewer</SelectItem>
                    <SelectItem value={String(Role.EDITOR)}>Editor</SelectItem>
                    <SelectItem value={String(Role.OWNER)}>Owner</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                aria-label="remove"
                onClick={() => {
                  publish(userRows.filter((_, grantIndex) => grantIndex !== index), roleRows)
                }}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            publish([...userRows, createGrantRow('user', { principal: '', role: Role.VIEWER })], roleRows)
          }}
        >
          Add User
        </Button>
      </div>
      <div>
        <p className="mb-2 text-xs text-muted-foreground">Roles</p>
        <div className="flex flex-col gap-3">
          {roleRows.map(({ id, grant }, index) => (
            <div key={id} className="flex items-center gap-2">
              <Input
                aria-label={`role ${index + 1}`}
                placeholder="Role name"
                value={grant.principal}
                onChange={(event) => updateRole(index, 'principal', event.target.value)}
                className="flex-1"
              />
              <Select value={String(grant.role)} onValueChange={(value) => updateRole(index, 'role', Number(value) as Role)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={String(Role.VIEWER)}>Viewer</SelectItem>
                    <SelectItem value={String(Role.EDITOR)}>Editor</SelectItem>
                    <SelectItem value={String(Role.OWNER)}>Owner</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                aria-label="remove"
                onClick={() => {
                  publish(userRows, roleRows.filter((_, grantIndex) => grantIndex !== index))
                }}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            publish(userRows, [...roleRows, createGrantRow('role', { principal: '', role: Role.VIEWER })])
          }}
        >
          Add Role
        </Button>
      </div>
    </div>
  )
}
