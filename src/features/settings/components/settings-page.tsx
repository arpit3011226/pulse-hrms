import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/layout/page-header'
import { usePermissions } from '@/hooks/use-permissions'
import { ProfileSettings } from './profile-settings'
import { OrganizationSettings } from './organization-settings'
import { AdminSettings } from './admin-settings'
import { RolesDefinitions } from './roles-definitions'

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
          {showAdmin && (
            <TabsTrigger value="admin">Admin Settings</TabsTrigger>
          )}
          {showAdmin && (
            <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="organization" className="mt-6">
          <OrganizationSettings />
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
      </Tabs>
    </div>
  )
}
