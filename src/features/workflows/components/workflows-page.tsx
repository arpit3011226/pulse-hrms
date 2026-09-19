import { useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { useCreateWorkflow, useUpdateWorkflow } from '../hooks/use-workflows'
import { WorkflowList } from './workflow-list'
import { WorkflowTemplatesGallery } from './workflow-templates-gallery'
import { WorkflowBuilderDialog } from './workflow-builder-dialog'
import { WorkflowRunHistory } from './workflow-run-history'
import { Plus } from 'lucide-react'
import type { Workflow } from '@/types/database.types'
import type { WorkflowTemplate } from '../utils/workflow-templates'

export function WorkflowsPage() {
  const { profile, organization } = useAuth()
  const { canManageWorkflows } = usePermissions()
  const createWorkflow = useCreateWorkflow()
  const updateWorkflow = useUpdateWorkflow()

  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | undefined>()
  const [templateData, setTemplateData] = useState<Partial<Workflow> | undefined>()
  const [activeTab, setActiveTab] = useState('my-workflows')
  const [logsWorkflowId, setLogsWorkflowId] = useState<string | undefined>()

  const orgId = organization?.id ?? ''

  function handleAddWorkflow() {
    setEditingWorkflow(undefined)
    setTemplateData(undefined)
    setBuilderOpen(true)
  }

  function handleEditWorkflow(workflow: Workflow) {
    setEditingWorkflow(workflow)
    setTemplateData(undefined)
    setBuilderOpen(true)
  }

  function handleViewLogs(workflowId: string) {
    setLogsWorkflowId(workflowId)
    setActiveTab('run-history')
  }

  function handleUseTemplate(template: WorkflowTemplate) {
    setEditingWorkflow(undefined)
    setTemplateData({
      name: template.name,
      description: template.description,
      trigger_type: template.trigger_type,
      trigger_config: template.trigger_config,
      conditions: template.conditions,
      actions: template.actions,
    })
    setBuilderOpen(true)
  }

  async function handleSave(data: Partial<Workflow> & { is_enabled: boolean }) {
    if (editingWorkflow) {
      await updateWorkflow.mutateAsync({
        id: editingWorkflow.id,
        data: {
          name: data.name,
          description: data.description,
          trigger_type: data.trigger_type,
          trigger_config: data.trigger_config,
          conditions: data.conditions,
          actions: data.actions,
          is_enabled: data.is_enabled,
        },
      })
    } else {
      await createWorkflow.mutateAsync({
        organization_id: orgId,
        name: data.name ?? '',
        description: data.description ?? null,
        trigger_type: data.trigger_type ?? 'event',
        trigger_config: data.trigger_config ?? {},
        conditions: data.conditions ?? [],
        actions: data.actions ?? [],
        is_enabled: data.is_enabled,
        created_by: profile?.id ?? '',
      })
    }
    setBuilderOpen(false)
  }

  return (
    <div>
      <PageHeader
        title="Workflows"
        description="Automate notifications, reminders, and actions across your organization."
        actions={
          canManageWorkflows ? (
            <Button onClick={handleAddWorkflow}>
              <Plus className="mr-2 h-4 w-4" />
              Add Workflow
            </Button>
          ) : undefined
        }
      />

      <Tabs value={activeTab} onValueChange={(val) => {
        setActiveTab(val)
        // Clear workflow filter when switching away from run-history
        if (val !== 'run-history') setLogsWorkflowId(undefined)
      }}>
        <TabsList>
          <TabsTrigger value="my-workflows">My Workflows</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="run-history">Run History</TabsTrigger>
        </TabsList>

        <TabsContent value="my-workflows" className="mt-6">
          <WorkflowList onEdit={handleEditWorkflow} onViewLogs={handleViewLogs} />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <WorkflowTemplatesGallery onUseTemplate={handleUseTemplate} />
        </TabsContent>

        <TabsContent value="run-history" className="mt-6">
          <WorkflowRunHistory initialWorkflowId={logsWorkflowId} />
        </TabsContent>
      </Tabs>

      <WorkflowBuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        workflow={editingWorkflow}
        templateData={templateData}
        onSave={handleSave}
      />
    </div>
  )
}
