import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/layout/page-header'
import { usePermissions } from '@/hooks/use-permissions'
import { ProfileSettings } from './profile-settings'
import { DelegationSettings } from './delegation-settings'
import { PolicySettings, NotificationSettings, PrivacySettings, AuditLogSettings } from '@/features/workplace/components/governance-settings'
import { SecuritySettings } from '@/features/workplace/components/security-settings'
import { ExpiringDocuments } from '@/features/workplace/components/expiring-documents'
import { OrganizationSettings } from './organization-settings'
import { AdminSettings } from './admin-settings'
import { LoginSettings } from './login-settings'
import { RolesDefinitions } from './roles-definitions'
import { SeedDemoData } from './seed-demo-data'

export function SettingsPage() {
  const { canManageSettings, isAdmin, isHR, isLeadership } = usePermissions()
  const showAdmin = canManageSettings
  // Creating logins is deliberately narrower than general admin rights.
  const showLogins = isAdmin || isHR || isLeadership

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account and organization settings" />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="delegation">Delegation</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          {showLogins && <TabsTrigger value="logins">Logins</TabsTrigger>}
          {showAdmin && <TabsTrigger value="audit">Audit Log</TabsTrigger>}
          {showAdmin && (
            <TabsTrigger value="admin">Admin Settings</TabsTrigger>
          )}
          {showAdmin && (
            <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          )}
          {showAdmin && (
            <TabsTrigger value="seed">Demo Data</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="organization" className="mt-6">
          <OrganizationSettings />
        </TabsContent>

        <TabsContent value="delegation" className="mt-6">
          <DelegationSettings />
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="policies" className="mt-6">
          <PolicySettings />
        </TabsContent>

        <TabsContent value="privacy" className="mt-6">
          <PrivacySettings />
        </TabsContent>

        {showLogins && (
          <TabsContent value="logins" className="mt-6">
            <LoginSettings />
          </TabsContent>
        )}

        {showAdmin && (
          <TabsContent value="audit" className="mt-6 space-y-6">
            <ExpiringDocuments />
            <AuditLogSettings />
          </TabsContent>
        )}

        {showAdmin && (
          <TabsContent value="admin" className="mt-6">
            <AdminSettings />
          </TabsContent>
        )}

        {showAdmin && (
          <TabsContent value="roles" className="mt-6">
            <RolesDefinitions />
          </TabsContent>
        )}

        {showAdmin && (
          <TabsContent value="seed" className="mt-6">
            <SeedDemoData />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
