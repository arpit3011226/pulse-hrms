import { useState, useCallback } from 'react'
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Shield,
  Users,
  CalendarDays,
  Clock,
  Wallet,
  TrendingUp,
  UserPlus,
  GraduationCap,
  FileText,
  UserMinus,
  Building2,
  Database,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  APP_PERMISSION_MODULES,
  ORG_PERMISSIONS,
  USER_DATA_PERMISSIONS,
  DEFAULT_ROLE_PERMISSION_LEVELS,
  ALL_PERMISSION_FEATURE_KEYS,
  PERMISSION_LEVELS,
} from '@/lib/constants'
import type { PermissionFeature, PermissionModule } from '@/lib/constants'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { OrganizationSettings, PermissionLevel, RolePermissionLevels } from '@/types/database.types'

const EDITABLE_ROLES = ['hr_admin', 'payroll_admin', 'manager', 'leadership', 'employee'] as const
const ALL_ROLES = ['super_admin', ...EDITABLE_ROLES] as const

type AllRolePermLevels = Record<string, RolePermissionLevels>

// Map icon strings to components
const ICON_MAP: Record<string, React.ElementType> = {
  Users,
  CalendarDays,
  Clock,
  Wallet,
  TrendingUp,
  UserPlus,
  GraduationCap,
  FileText,
  UserMinus,
}

function getInitialPermLevels(org: { settings?: Partial<OrganizationSettings> } | null): AllRolePermLevels {
  const saved = org?.settings?.role_permission_levels as AllRolePermLevels | undefined
  if (saved && Object.keys(saved).length > 0) return saved
  return { ...DEFAULT_ROLE_PERMISSION_LEVELS }
}

function getLevel(perms: RolePermissionLevels | undefined, key: string): PermissionLevel {
  return perms?.[key] ?? 'no_access'
}

function countByLevel(perms: RolePermissionLevels | undefined, keys: string[]): { read: number; manage: number; total: number } {
  const total = keys.length
  let read = 0
  let manage = 0
  for (const k of keys) {
    const level = getLevel(perms, k)
    if (level === 'read') read++
    else if (level === 'manage') manage++
  }
  return { read, manage, total }
}

// ─── Permission Row ─────────────────────────────────────────────────────
function PermissionRow({
  feature,
  level,
  disabled,
  onChange,
}: {
  feature: PermissionFeature
  level: PermissionLevel
  disabled: boolean
  onChange: (key: string, level: PermissionLevel) => void
}) {
  return (
    <div className="grid grid-cols-[1fr_120px_120px_120px] items-center border-b border-border/40 last:border-b-0 px-4 py-3 hover:bg-secondary/30 transition-colors">
      <div>
        <p className="text-sm font-medium">{feature.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{feature.description}</p>
      </div>
      <RadioGroup
        value={level}
        onValueChange={(v) => onChange(feature.key, v as PermissionLevel)}
        disabled={disabled}
        className="contents"
      >
        {PERMISSION_LEVELS.map((pl) => (
          <div key={pl.value} className="flex justify-center">
            <RadioGroupItem
              value={pl.value}
              className={`h-5 w-5 ${
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              } ${
                level === pl.value
                  ? pl.value === 'no_access'
                    ? 'border-red-400 text-red-500'
                    : pl.value === 'read'
                    ? 'border-blue-400 text-blue-500'
                    : 'border-orange-400 text-orange-500'
                  : ''
              }`}
            />
          </div>
        ))}
      </RadioGroup>
    </div>
  )
}

// ─── Column Headers ─────────────────────────────────────────────────────
function ColumnHeaders() {
  return (
    <div className="grid grid-cols-[1fr_120px_120px_120px] items-center border-b border-border bg-muted/30 px-4 py-2.5 rounded-t-lg">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider" />
      {PERMISSION_LEVELS.map((pl) => (
        <span key={pl.value} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">
          {pl.label}
        </span>
      ))}
    </div>
  )
}

// ─── Module Group (for App Permissions) ─────────────────────────────────
function ModuleGroup({
  module,
  perms,
  disabled,
  onChange,
}: {
  module: PermissionModule
  perms: RolePermissionLevels | undefined
  disabled: boolean
  onChange: (key: string, level: PermissionLevel) => void
}) {
  const IconComponent = ICON_MAP[module.icon] || FileText

  return (
    <div>
      {/* Module header row */}
      <div className="flex items-center gap-2.5 bg-muted/40 px-4 py-2.5 border-b border-border/40">
        <IconComponent className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">{module.label}</span>
      </div>
      {/* Feature rows */}
      {module.features.map((feature) => (
        <PermissionRow
          key={feature.key}
          feature={feature}
          level={getLevel(perms, feature.key)}
          disabled={disabled}
          onChange={onChange}
        />
      ))}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────
export function RolesDefinitions() {
  const { organization, refreshProfile } = useAuth()
  const [selectedRole, setSelectedRole] = useState<string>('hr_admin')
  const [permLevels, setPermLevels] = useState<AllRolePermLevels>(() =>
    getInitialPermLevels(organization)
  )
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    () => new Set(['app', 'org', 'user_data'])
  )
  const [isLoading, setIsLoading] = useState(false)

  const rolePerms = permLevels[selectedRole]
  const isSuperAdmin = selectedRole === 'super_admin'

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  const handleChange = useCallback(
    (key: string, level: PermissionLevel) => {
      if (isSuperAdmin) return
      setPermLevels((prev) => ({
        ...prev,
        [selectedRole]: {
          ...(prev[selectedRole] ?? {}),
          [key]: level,
        },
      }))
    },
    [selectedRole, isSuperAdmin]
  )

  const setAllInSection = useCallback(
    (keys: string[], level: PermissionLevel) => {
      if (isSuperAdmin) return
      setPermLevels((prev) => {
        const current = prev[selectedRole] ?? {}
        const updates: RolePermissionLevels = {}
        for (const k of keys) updates[k] = level
        return { ...prev, [selectedRole]: { ...current, ...updates } }
      })
    },
    [selectedRole, isSuperAdmin]
  )

  const handleSave = async () => {
    if (!organization) return
    setIsLoading(true)
    try {
      const currentSettings = (organization.settings ?? {}) as Partial<OrganizationSettings>
      const { error } = await supabase
        .from('organizations')
        .update({
          settings: { ...currentSettings, role_permission_levels: permLevels },
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
    setPermLevels({ ...DEFAULT_ROLE_PERMISSION_LEVELS })
    toast.info('Permissions reset to defaults (unsaved)')
  }

  // Count stats for display
  const totalFeatures = ALL_PERMISSION_FEATURE_KEYS.length
  const manageCount = ALL_PERMISSION_FEATURE_KEYS.filter(
    (k) => getLevel(rolePerms, k) === 'manage'
  ).length
  const readCount = ALL_PERMISSION_FEATURE_KEYS.filter(
    (k) => getLevel(rolePerms, k) === 'read'
  ).length

  // Section helpers
  const appFeatureKeys = APP_PERMISSION_MODULES.flatMap((m) => m.features.map((f) => f.key))
  const orgFeatureKeys = ORG_PERMISSIONS.map((f) => f.key)
  const userDataFeatureKeys = USER_DATA_PERMISSIONS.map((f) => f.key)

  const renderSectionHeader = (
    sectionKey: string,
    title: string,
    icon: React.ReactNode,
    featureKeys: string[]
  ) => {
    const isExpanded = expandedSections.has(sectionKey)
    const { manage, read, total } = countByLevel(rolePerms, featureKeys)
    return (
      <div
        className="flex cursor-pointer items-center gap-3 px-5 py-4 hover:bg-secondary/40 transition-colors"
        onClick={() => toggleSection(sectionKey)}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        {icon}
        <span className="flex-1 text-base font-semibold">{title}</span>
        <div className="flex items-center gap-2">
          {manage > 0 && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 text-xs font-normal">
              {manage} manage
            </Badge>
          )}
          {read > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs font-normal">
              {read} read
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            {manage + read} / {total}
          </span>
        </div>
      </div>
    )
  }

  const renderBulkActions = (featureKeys: string[]) => {
    if (isSuperAdmin) return null
    return (
      <div className="flex items-center gap-2 px-5 py-2 border-b border-border/40 bg-muted/20">
        <span className="text-xs text-muted-foreground mr-2">Set all:</span>
        <button
          onClick={() => setAllInSection(featureKeys, 'no_access')}
          className="text-xs px-2.5 py-1 rounded-md border border-border hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-colors"
        >
          No access
        </button>
        <button
          onClick={() => setAllInSection(featureKeys, 'read')}
          className="text-xs px-2.5 py-1 rounded-md border border-border hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
        >
          Can read
        </button>
        <button
          onClick={() => setAllInSection(featureKeys, 'manage')}
          className="text-xs px-2.5 py-1 rounded-md border border-border hover:bg-orange-50 hover:border-orange-200 hover:text-orange-700 transition-colors"
        >
          Can manage
        </button>
      </div>
    )
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
            Select a role and configure granular access levels for each module and feature.
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

      {/* Role Info Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                {ROLE_LABELS[selectedRole]}
                {isSuperAdmin && (
                  <Badge variant="secondary" className="ml-1 text-xs font-normal">
                    Full access (locked)
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {ROLE_DESCRIPTIONS[selectedRole]}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">
                {manageCount + readCount} / {totalFeatures}
              </div>
              <div className="text-xs text-muted-foreground">permissions active</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Section 1: App Permissions */}
      <Card className="overflow-hidden">
        {renderSectionHeader(
          'app',
          'App Permissions configuration',
          <Shield className="h-5 w-5 text-primary" />,
          appFeatureKeys
        )}
        {expandedSections.has('app') && (
          <CardContent className="p-0">
            {renderBulkActions(appFeatureKeys)}
            <ColumnHeaders />
            {APP_PERMISSION_MODULES.map((module) => (
              <ModuleGroup
                key={module.key}
                module={module}
                perms={rolePerms}
                disabled={isSuperAdmin}
                onChange={handleChange}
              />
            ))}
          </CardContent>
        )}
      </Card>

      {/* Section 2: Organization Permissions */}
      <Card className="overflow-hidden">
        {renderSectionHeader(
          'org',
          'Organization Permissions configuration',
          <Building2 className="h-5 w-5 text-primary" />,
          orgFeatureKeys
        )}
        {expandedSections.has('org') && (
          <CardContent className="p-0">
            {renderBulkActions(orgFeatureKeys)}
            <ColumnHeaders />
            {ORG_PERMISSIONS.map((feature) => (
              <PermissionRow
                key={feature.key}
                feature={feature}
                level={getLevel(rolePerms, feature.key)}
                disabled={isSuperAdmin}
                onChange={handleChange}
              />
            ))}
          </CardContent>
        )}
      </Card>

      {/* Section 3: User Data Permissions */}
      <Card className="overflow-hidden">
        {renderSectionHeader(
          'user_data',
          'User Data Permissions configuration',
          <Database className="h-5 w-5 text-primary" />,
          userDataFeatureKeys
        )}
        {expandedSections.has('user_data') && (
          <CardContent className="p-0">
            {renderBulkActions(userDataFeatureKeys)}
            <ColumnHeaders />
            {USER_DATA_PERMISSIONS.map((feature) => (
              <PermissionRow
                key={feature.key}
                feature={feature}
                level={getLevel(rolePerms, feature.key)}
                disabled={isSuperAdmin}
                onChange={handleChange}
              />
            ))}
          </CardContent>
        )}
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
