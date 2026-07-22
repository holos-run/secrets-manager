import { useMemo, useState } from 'react'
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
  // The console is served over HTTPS (or localhost during development), so the
  // browser secure-context requirement for randomUUID is part of its runtime
  // contract. These identifiers are local React keys, not persisted IDs.
  return `${kind}-${crypto.randomUUID()}`
}

interface GrantRow {
  id: string
  grant: Grant
}

function createGrantRow(kind: 'user' | 'role', grant: Grant): GrantRow {
  return { id: createGrantRowId(kind), grant }
}

function reconcileGrantRows(kind: 'user' | 'role', rows: GrantRow[], grants: Grant[]): GrantRow[] {
  // publish() round-trips the same grant object references through onChange,
  // allowing local row IDs to survive controlled parent rerenders. A parent
  // supplied replacement object is intentionally treated as a new row so its
  // input remounts with the replacement value.
  if (rows.length === grants.length && rows.every((row, index) => row.grant === grants[index])) {
    return rows
  }

  const availableRows = [...rows]
  return grants.map((grant) => {
    const existingIndex = availableRows.findIndex((row) => row.grant === grant)
    if (existingIndex === -1) return createGrantRow(kind, grant)
    return availableRows.splice(existingIndex, 1)[0]
  })
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
  const [editUserRows, setEditUserRows] = useState<GrantRow[]>([])
  const [editRoleRows, setEditRoleRows] = useState<GrantRow[]>([])
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleEdit = () => {
    setEditUserRows(userGrants.map((grant) => createGrantRow('user', { ...grant })))
    setEditRoleRows(roleGrants.map((grant) => createGrantRow('role', { ...grant })))
    setSaveError(null)
    setEditing(true)
  }

  const handleCancel = () => {
    setSaveError(null)
    setEditing(false)
  }

  const handleSave = async () => {
    const users = editUserRows.map((row) => row.grant).filter((grant) => grant.principal.trim() !== '')
    const roles = editRoleRows.map((row) => row.grant).filter((grant) => grant.principal.trim() !== '')
    try {
      await onSave(users, roles)
      setEditing(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleUserChange = (index: number, field: keyof Grant, value: string | Role | bigint | undefined) => {
    setEditUserRows(editUserRows.map((row, rowIndex) =>
      rowIndex === index ? { ...row, grant: { ...row.grant, [field]: value } } : row,
    ))
  }

  const handleRoleChange = (index: number, field: keyof Grant, value: string | Role | bigint | undefined) => {
    setEditRoleRows(editRoleRows.map((row, rowIndex) =>
      rowIndex === index ? { ...row, grant: { ...row.grant, [field]: value } } : row,
    ))
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
        {editUserRows.map(({ id, grant }, i) => (
          <div key={id} className="mb-3 flex flex-col gap-2">
            <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center">
              <Input
                placeholder="Email address"
                value={grant.principal}
                onChange={(e) => handleUserChange(i, 'principal', e.target.value)}
                className="flex-1"
              />
              <Select
                value={String(grant.role)}
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
                  setEditUserRows(editUserRows.filter((_, j) => j !== i))
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
                    value={timestampToDatetimeLocal(grant.nbf)}
                    onChange={(e) => handleUserChange(i, 'nbf', datetimeLocalToTimestamp(e.target.value))}
                    className="flex-1"
                  />
                  {grant.nbf == null && (
                    <Button variant="outline" size="sm" onClick={() => handleUserChange(i, 'nbf', defaultNbfUTC())}>Set</Button>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <Label className="text-xs">Expires</Label>
                <div className="flex gap-1 items-center">
                  <Input
                    type="datetime-local"
                    value={timestampToDatetimeLocal(grant.exp)}
                    onChange={(e) => handleUserChange(i, 'exp', datetimeLocalToTimestamp(e.target.value))}
                    className="flex-1"
                  />
                  {grant.exp == null && (
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
            setEditUserRows([...editUserRows, createGrantRow('user', { principal: '', role: Role.VIEWER })])
          }}
        >
          Add User
        </Button>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-2">Roles</p>
        {editRoleRows.map(({ id, grant }, i) => (
          <div key={id} className="mb-3 flex flex-col gap-2">
            <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center">
              <Input
                placeholder="Role name"
                value={grant.principal}
                onChange={(e) => handleRoleChange(i, 'principal', e.target.value)}
                className="flex-1"
              />
              <Select
                value={String(grant.role)}
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
                  setEditRoleRows(editRoleRows.filter((_, j) => j !== i))
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
                    value={timestampToDatetimeLocal(grant.nbf)}
                    onChange={(e) => handleRoleChange(i, 'nbf', datetimeLocalToTimestamp(e.target.value))}
                    className="flex-1"
                  />
                  {grant.nbf == null && (
                    <Button variant="outline" size="sm" onClick={() => handleRoleChange(i, 'nbf', defaultNbfUTC())}>Set</Button>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <Label className="text-xs">Expires</Label>
                <div className="flex gap-1 items-center">
                  <Input
                    type="datetime-local"
                    value={timestampToDatetimeLocal(grant.exp)}
                    onChange={(e) => handleRoleChange(i, 'exp', datetimeLocalToTimestamp(e.target.value))}
                    className="flex-1"
                  />
                  {grant.exp == null && (
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
            setEditRoleRows([...editRoleRows, createGrantRow('role', { principal: '', role: Role.VIEWER })])
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
  const [knownUserRows, setKnownUserRows] = useState(() => userGrants.map((grant) => createGrantRow('user', grant)))
  const [knownRoleRows, setKnownRoleRows] = useState(() => roleGrants.map((grant) => createGrantRow('role', grant)))
  const userRows = useMemo(
    () => reconcileGrantRows('user', knownUserRows, userGrants),
    [knownUserRows, userGrants],
  )
  const roleRows = useMemo(
    () => reconcileGrantRows('role', knownRoleRows, roleGrants),
    [knownRoleRows, roleGrants],
  )

  const publish = (users: GrantRow[], roles: GrantRow[]) => {
    setKnownUserRows(users)
    setKnownRoleRows(roles)
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
