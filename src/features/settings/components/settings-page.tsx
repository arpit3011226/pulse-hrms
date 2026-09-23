import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/layout/page-header'
import { usePermissions } from '@/hooks/use-permissions'
import { ProfileSettings } from './profile-settings'
import { DelegationSettings } from './delegation-settings'
import { OrganizationSettings } from './organization-settings'
import { AdminSettings } from './admin-settings'
import { RolesDefinitions } from './roles-definitions'
import { SeedDemoData } from './seed-demo-data'

export function SettingsPage() {
  const { canManageSettings } = usePermissions()
  const showAdmin = canManageSettings

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account and organization settings" />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="delegation">Delegation</TabsTrigger>
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
