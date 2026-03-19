import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useDepartments } from '@/features/departments/hooks/use-departments'
import { useCreateAnnouncement } from '../../hooks/use-dashboard'
import type { AnnouncementPriority, AnnouncementAudienceType } from '@/types/database.types'

const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'hr_admin', label: 'HR Admin' },
  { value: 'payroll_admin', label: 'Payroll Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'employee', label: 'Employee' },
]

interface AnnouncementFormDialogProps {
  open: boolean
  onClose: () => void
}

export function AnnouncementFormDialog({ open, onClose }: AnnouncementFormDialogProps) {
  const { profile, organization } = useAuth()
  const { data: departments } = useDepartments()
  const createMutation = useCreateAnnouncement()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState<AnnouncementPriority>('normal')
  const [audienceType, setAudienceType] = useState<AnnouncementAudienceType>('all')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedDepts, setSelectedDepts] = useState<string[]>([])
  const [isPinned, setIsPinned] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || !organization?.id || !profile?.id) return

    await createMutation.mutateAsync({
      organization_id: organization.id,
      title: title.trim(),
      content: content.trim(),
      priority,
      audience_type: audienceType,
      audience_roles: audienceType === 'roles' ? selectedRoles : [],
      audience_department_ids: audienceType === 'departments' ? selectedDepts : [],
      is_pinned: isPinned,
      expires_at: null,
      created_by: profile.id,
    })

    onClose()
  }

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  const toggleDept = (deptId: string) => {
    setSelectedDepts((prev) =>
      prev.includes(deptId) ? prev.filter((d) => d !== deptId) : [...prev, deptId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Announcement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" />
          </div>
          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your announcement..." rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as AnnouncementPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select value={audienceType} onValueChange={(v) => setAudienceType(v as AnnouncementAudienceType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectItem value="roles">Specific Roles</SelectItem>
                  <SelectItem value="departments">Specific Departments</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {audienceType === 'roles' && (
            <div className="space-y-2">
              <Label>Select Roles</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map((r) => (
                  <label key={r.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={selectedRoles.includes(r.value)}
                      onCheckedChange={() => toggleRole(r.value)}
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {audienceType === 'departments' && (
            <div className="space-y-2">
              <Label>Select Departments</Label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {(departments ?? []).map((d) => (
                  <label key={d.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={selectedDepts.includes(d.id)}
                      onCheckedChange={() => toggleDept(d.id)}
                    />
                    {d.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={isPinned} onCheckedChange={(v) => setIsPinned(!!v)} />
            Pin this announcement
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? 'Posting...' : 'Post Announcement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
