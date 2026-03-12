import { useState, useCallback } from 'react'
import { ChevronDown, ChevronRight, Loader2, Shield, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ROLE_LABELS, ROLE_DESCRIPTIONS, PERMISSION_CATEGORIES, DEFAULT_ROLE_PERMISSIONS } from '@/lib/constants'
import type { PermissionKey } from '@/lib/constants'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { OrganizationSettings } from '@/types/database.types'

const EDITABLE_ROLES = ['hr_admin', 'payroll_admin', 'manager', 'employee'] as const
const ALL_ROLES = ['super_admin', ...EDITABLE_ROLES] as const

type RolePermissions = Record<string, PermissionKey[]>

function getInitialPermissions(org: { settings?: Partial<OrganizationSettings> } | null): RolePermissions {
  const saved = org?.settings?.role_permissions as RolePermissions | undefined
  if (saved && Object.keys(saved).length > 0) return saved
  return { ...DEFAULT_ROLE_PERMISSIONS }
}

export function RolesDefinitions() {
  const { organization, refreshProfile } = useAuth()
  const [selectedRole, setSelectedRole] = useState<string>('hr_admin')
  const [permissions, setPermissions] = useState<RolePermissions>(() =>
    getInitialPermissions(organization)
  )
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(PERMISSION_CATEGORIES.map((c) => c.key))
  )
  const [isLoading, setIsLoading] = useState(false)

  const rolePerms = permissions[selectedRole] ?? []
  const isSuperAdmin = selectedRole === 'super_admin'

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryKey)) next.delete(categoryKey)
      else next.add(categoryKey)
      return next
    })
  }

  const hasPermission = useCallback(
    (permKey: string) => rolePerms.includes(permKey as PermissionKey),
    [rolePerms]
  )

  const togglePermission = (permKey: PermissionKey) => {
    if (isSuperAdmin) return
    setPermissions((prev) => {
      const current = prev[selectedRole] ?? []
      const next = current.includes(permKey)
        ? current.filter((k) => k !== permKey)
        : [...current, permKey]
      return { ...prev, [selectedRole]: next }
    })
  }

  const toggleCategoryAll = (categoryKey: string) => {
    if (isSuperAdmin) return
    const category = PERMISSION_CATEGORIES.find((c) => c.key === categoryKey)
    if (!category) return
    const categoryPermKeys = category.permissions.map((p) => p.key) as PermissionKey[]
    const allChecked = categoryPermKeys.every((k) => rolePerms.includes(k))

    setPermissions((prev) => {
      const current = prev[selectedRole] ?? []
      const next = allChecked
        ? current.filter((k) => !categoryPermKeys.includes(k as PermissionKey))
        : [...new Set([...current, ...categoryPermKeys])]
      return { ...prev, [selectedRole]: next }
    })
  }

  const getCategoryCount = (categoryKey: string) => {
    const category = PERMISSION_CATEGORIES.find((c) => c.key === categoryKey)
    if (!category) return { selected: 0, total: 0 }
    const total = category.permissions.length
    const selected = category.permissions.filter((p) => rolePerms.includes(p.key as PermissionKey)).length
    return { selected, total }
  }

  const handleSave = async () => {
    if (!organization) return
    setIsLoading(true)
    try {
      const currentSettings = (organization.settings ?? {}) as Partial<OrganizationSettings>
      const { error } = await supabase
        .from('organizations')
        .update({
          settings: { ...currentSettings, role_permissions: permissions },
        })
        .eq('id', organization.id)

      if (error) throw error
      await refreshProfile()
      toast.success('Role permissions saved successfully')
    } catch {
      toast.error('Failed to save permissions')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setPermissions({ ...DEFAULT_ROLE_PERMISSIONS })
    toast.info('Permissions reset to defaults (unsaved)')
  }

  return (
    <div className="space-y-6">
      {/* Role Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Manage Roles & Permissions
          </CardTitle>
          <CardDescription>
            Select a role and configure its permissions. Changes apply to all users with that role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ALL_ROLES.map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                  selectedRole === role
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-background hover:bg-secondary/60'
                }`}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Role Info + Permissions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                {ROLE_LABELS[selectedRole]}
                {isSuperAdmin && (
                  <Badge variant="secondary" className="ml-1 text-xs font-normal">
                    All permissions (locked)
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {ROLE_DESCRIPTIONS[selectedRole]}
              </CardDescription>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              {rolePerms.length} of{' '}
              {PERMISSION_CATEGORIES.reduce((sum, c) => sum + c.permissions.length, 0)} permissions
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1 pt-0">
          {PERMISSION_CATEGORIES.map((category) => {
            const isExpanded = expandedCategories.has(category.key)
            const { selected, total } = getCategoryCount(category.key)
            const allChecked = selected === total
            const someChecked = selected > 0 && selected < total

            return (
              <div key={category.key} className="rounded-lg border">
                {/* Category Header */}
                <div
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors"
                  onClick={() => toggleCategory(category.key)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div
                    className="flex items-center"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleCategoryAll(category.key)
                    }}
                  >
                    <Checkbox
                      checked={allChecked}
                      className={someChecked ? 'data-[state=unchecked]:bg-primary/20 data-[state=unchecked]:border-primary' : ''}
                      disabled={isSuperAdmin}
                    />
                  </div>
                  <span className="flex-1 text-sm font-medium">{category.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {selected} / {total} selected
                  </span>
                </div>

                {/* Permissions List */}
                {isExpanded && (
                  <div className="border-t bg-secondary/20 px-4 py-2">
                    {category.permissions.map((perm) => (
                      <label
                        key={perm.key}
                        className={`flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors ${
                          isSuperAdmin
                            ? 'opacity-70 cursor-not-allowed'
                            : 'cursor-pointer hover:bg-background/60'
                        }`}
                      >
                        <Checkbox
                          checked={isSuperAdmin || hasPermission(perm.key)}
                          onCheckedChange={() => togglePermission(perm.key as PermissionKey)}
                          disabled={isSuperAdmin}
                        />
                        <span className="text-sm">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Permissions
        </Button>
        <Button variant="outline" onClick={handleReset} disabled={isLoading}>
          Reset to Defaults
        </Button>
      </div>
    </div>
  )
}
