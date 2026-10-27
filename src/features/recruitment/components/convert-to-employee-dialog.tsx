import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, UserPlus } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useDepartments, useDesignations } from '@/features/departments/hooks/use-departments'
import { useEmployees, useCreateEmployee } from '@/features/employees/hooks/use-employees'
import { generateNextEmployeeCode } from '@/features/employees/api/employees.api'
import { useCreateCandidateConversion } from '../hooks/use-recruitment'
import { carryDocumentsToEmployee } from '../api/preboarding.api'
import { findProfileByPersonalEmail } from '@/features/auth/api/identity.api'
import { toast } from 'sonner'

interface OfferRow {
  id: string
  offered_designation?: string | null
  joining_date?: string | null
  candidate_application_id: string
  candidate_application?: {
    id: string
    candidate?: { id: string; first_name: string; last_name: string; email: string } | null
    job_requisition?: { id: string; title: string; requisition_code: string } | null
  } | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  offer: OfferRow | null
}

export function ConvertToEmployeeDialog({ open, onOpenChange, offer }: Props) {
  const { organization } = useAuth()
  const { data: departments } = useDepartments()
  const { data: designations } = useDesignations()
  const { data: employees } = useEmployees()
  const createEmployee = useCreateEmployee()
  const createConversion = useCreateCandidateConversion()

  const candidate = offer?.candidate_application?.candidate ?? null
  const requisitionId = offer?.candidate_application?.job_requisition?.id

  const [workEmail, setWorkEmail] = useState('')
  const [employeeCode, setEmployeeCode] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [designationId, setDesignationId] = useState('')
  const [managerId, setManagerId] = useState('')
  const [joiningDate, setJoiningDate] = useState('')
  const [employmentType, setEmploymentType] = useState('full_time')
  const [saving, setSaving] = useState(false)

  // Candidate's phone and the requisition's department/type are not in the offer row
  const { data: extra } = useQuery({
    queryKey: ['convert-prefill', candidate?.id, requisitionId],
    queryFn: async () => {
      const [cand, req] = await Promise.all([
        supabase.from('candidates').select('phone, profile_id').eq('id', candidate!.id).maybeSingle(),
        requisitionId
          ? supabase
              .from('job_requisitions')
              .select('department_id, employment_type, hiring_manager_id')
              .eq('id', requisitionId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      return {
        phone: cand.data?.phone ?? null,
        candidateProfileId: cand.data?.profile_id ?? null,
        req: req.data ?? null,
      }
    },
    enabled: open && !!candidate?.id,
  })

  // Prefill from the offer and requisition each time the dialog opens
  useEffect(() => {
    if (!open || !offer) return
    setJoiningDate(offer.joining_date ?? '')
    setWorkEmail('')
    setManagerId('')
    if (organization?.id) generateNextEmployeeCode(organization.id).then(setEmployeeCode).catch(() => setEmployeeCode(''))
  }, [open, offer, organization?.id])

  useEffect(() => {
    if (!extra?.req) return
    setDepartmentId(extra.req.department_id ?? '')
    setEmploymentType(extra.req.employment_type ?? 'full_time')
    setManagerId(extra.req.hiring_manager_id ?? '')
  }, [extra])

  // Match the offered designation text to a designation record where we can
  useEffect(() => {
    if (!offer?.offered_designation || !designations) return
    const match = designations.find(
      (d) => d.title.toLowerCase() === offer.offered_designation!.toLowerCase()
    )
    if (match) setDesignationId(match.id)
  }, [offer?.offered_designation, designations])

  const canSubmit = !!candidate && !!workEmail.trim() && !!joiningDate && !saving

  async function handleSubmit() {
    if (!candidate || !offer) return
    setSaving(true)
    try {
      // F43 — reuse the identity this person already has, if any. A candidate
      // who signed up keeps the same login when they become an employee.
      const existingProfileId =
        extra?.candidateProfileId ?? (await findProfileByPersonalEmail(candidate.email))

      const employee = await createEmployee.mutateAsync({
        first_name: candidate.first_name,
        last_name: candidate.last_name,
        email: workEmail.trim(),
        personal_email: candidate.email,
        profile_id: existingProfileId ?? null,
        phone: extra?.phone ?? null,
        employee_code: employeeCode || undefined,
        department_id: departmentId || null,
        designation_id: designationId || null,
        reporting_manager_id: managerId || null,
        date_of_joining: joiningDate,
        employment_type: employmentType,
        status: 'active',
      } as Parameters<typeof createEmployee.mutateAsync>[0])

      await createConversion.mutateAsync({
        candidate_application_id: offer.candidate_application_id,
        employee_id: employee.id,
        conversion_date: joiningDate,
        notes: `Converted from offer ${offer.id}`,
      })

      if (existingProfileId && !extra?.candidateProfileId) {
        await supabase.from('candidates').update({ profile_id: existingProfileId }).eq('id', candidate.id)
      }

      /**
       * QA-37 — they are not a candidate any more.
       *
       * Conversion linked the profile and then left the role alone, so a new
       * joiner who had a portal login kept the `candidate` role. That role
       * reaches their own application and nothing else: no leave, no
       * attendance, no payslip, and 00053 deliberately hides the employee
       * directory from them. The screen said the conversion had worked.
       *
       * One server-side call rather than an update from here. become_employee
       * promotes only a candidate — somebody rejoining who used to be a
       * manager keeps their role — records their work address against the
       * profile ready for company sign-on, and writes who did it to
       * identity_events. A hiring manager may call it; a plain UPDATE from the
       * browser would have been refused for anyone but HR.
       */
      if (existingProfileId) {
        const { error: roleError } = await supabase.rpc('become_employee', {
          p_profile: existingProfileId,
          p_work_email: workEmail.trim(),
        })

        if (roleError) {
          toast.warning(
            `${candidate.first_name} was added, but their login is still a candidate login. ` +
              'Ask HR to switch it over, otherwise they cannot sign in to the app.'
          )
          onOpenChange(false)
          return
        }
      }

      /**
       * Everything they sent us before joining becomes part of their employee
       * record. Without this the joining pack gets collected twice — once
       * from the candidate and again from the new starter — which is the
       * thing people actually complain about when they join somewhere.
       *
       * Deliberately forgiving. A file that will not copy must not stop
       * somebody being hired, so it is counted and reported rather than
       * thrown; HR can re-attach the odd one by hand.
       */
      let carried = { moved: 0, failed: 0 }
      if (organization?.id) {
        try {
          carried = await carryDocumentsToEmployee({
            organization_id: organization.id,
            candidate_id: candidate.id,
            employee_id: employee.id,
          })
        } catch {
          carried = { moved: 0, failed: -1 }
        }
      }

      toast.success(
        `${candidate.first_name} added as ${employeeCode || 'an employee'}` +
          (carried.moved > 0 ? ` · ${carried.moved} document${carried.moved === 1 ? '' : 's'} carried over` : '')
      )
      if (carried.failed > 0) {
        toast.warning(
          `${carried.failed} document${carried.failed === 1 ? '' : 's'} could not be copied across. ` +
            'They are still on the candidate record — please attach them by hand.'
        )
      }
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not convert candidate')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="page">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Convert to employee
          </DialogTitle>
          <DialogDescription>
            {candidate
              ? `Create an employee record for ${candidate.first_name} ${candidate.last_name}.`
              : 'No candidate linked to this offer.'}
          </DialogDescription>
        </DialogHeader>

        {candidate && (
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Employee code</Label>
                <Input value={employeeCode} readOnly className="bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Label>Date of joining *</Label>
                <Input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Work email *</Label>
              <Input
                type="email"
                placeholder="name@company.com"
                value={workEmail}
                onChange={(e) => setWorkEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Personal email {candidate.email} is kept on the record.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {departments?.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Designation</Label>
                <Select value={designationId} onValueChange={setDesignationId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {designations?.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Reporting manager</Label>
                <Select value={managerId} onValueChange={setManagerId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {employees?.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.first_name} {e.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Employment type</Label>
                <Select value={employmentType} onValueChange={setEmploymentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full time</SelectItem>
                    <SelectItem value="part_time">Part time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create employee
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
