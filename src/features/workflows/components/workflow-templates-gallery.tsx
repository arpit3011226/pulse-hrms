import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { WORKFLOW_TEMPLATES, type WorkflowTemplate } from '../utils/workflow-templates'
import { Search } from 'lucide-react'

interface WorkflowTemplatesGalleryProps {
  onUseTemplate: (template: WorkflowTemplate) => void
}

const MODULE_OPTIONS = [
  { value: 'all', label: 'All Modules' },
  { value: 'employees', label: 'Employees' },
  { value: 'leave', label: 'Leave' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'performance', label: 'Performance' },
  { value: 'recruitment', label: 'Recruitment' },
  { value: 'resignation', label: 'Separation' },
  { value: 'self_service', label: 'Self Service' },
]

export function WorkflowTemplatesGallery({ onUseTemplate }: WorkflowTemplatesGalleryProps) {
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')

  const filteredTemplates = useMemo(() => {
    return WORKFLOW_TEMPLATES.filter((t) => {
      const matchesSearch =
        !search ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase())
      const matchesModule = moduleFilter === 'all' || t.module === moduleFilter
      return matchesSearch && matchesModule
    })
  }, [search, moduleFilter])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by module" />
          </SelectTrigger>
          <SelectContent>
            {MODULE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Template Grid */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-sm">No templates match your search.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <span className="text-2xl">{template.icon}</span>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {template.module.replace('_', ' ')}
                  </Badge>
                </div>
                <h3 className="font-medium text-sm mt-2">{template.name}</h3>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-xs text-muted-foreground flex-1 mb-4">
                  {template.description}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => onUseTemplate(template)}
                >
                  Use Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
