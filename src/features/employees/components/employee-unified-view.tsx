import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  Pencil,
  Plus,
  Trash2,
  User,
  Briefcase,
  Building2,
  Heart,
  ShieldCheck,
  MapPin,
  Phone,
  Landmark,
  Users,
  FileText,
  Clock,
  LogOut,
  ExternalLink,
  Star,
} from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

import { useQueryClient } from '@tanstack/react-query'
import { useEmployee, useUpdateEmployee, useEmployees } from '../hooks/use-employees'
import { upsertEmployeeStatutory, upsertEmployeePersonal } from '../api/employees.api'

/**
 * Fields that live outside `employees` since 00045, because they are not part of
 * the staff directory everyone can read.
 */
const STATUTORY_FIELDS = ['pan_number', 'aadhar_number', 'passport_number', 'uan_number'] as const
const PERSONAL_FIELDS = ['date_of_birth', 'religion', 'father_name', 'mother_name', 'spouse_name'] as const
import {
  useEmployeeAddresses,
  useEmergencyContacts,
  useBankAccounts,
  useDependents,
  useNominees,
  useIdentityDocuments,
  useEmployeeDocuments,
  useWorkProfiles,
  useExitRecord,
  useStatusHistory,
  useOrgHistory,
  useDeleteAddress,
  useDeleteEmergencyContact,
  useDeleteBankAccount,
  useSetSalaryAccount,
  useDeleteDependent,
  useDeleteNominee,
  useDeleteIdentityDocument,
  useDeleteEmployeeDocument,
  usePreviousExperience,
  useDeletePreviousExperience,
} from '../hooks/use-employee-lifecycle'
import { useDepartments, useDesignations } from '@/features/departments/hooks/use-departments'
import { usePermissions } from '@/hooks/use-permissions'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { getInitials, formatDate } from '@/lib/utils'

import {
  SALUTATION_OPTIONS,
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  BLOOD_GROUPS,
  EMPLOYMENT_TYPES,
  EMPLOYEE_STATUSES,
  ADDRESS_TYPES,
  RELATIONSHIP_TYPES,
  BANK_ACCOUNT_TYPES,
  IDENTITY_DOCUMENT_TYPES,
  DOCUMENT_CATEGORIES,
  NOMINEE_APPLICABLE_FOR,
  ORG_CHANGE_TYPES,
  EXIT_TYPES,
  EXIT_STATUSES,
  CLEARANCE_STATUSES,
  RELIGION_OPTIONS,
  NATIONALITY_OPTIONS,
} from '@/lib/constants'

import { EmployeeAddressForm } from './employee-address-form'
import { EmployeeContactForm } from './employee-contact-form'
import { EmployeeBankForm } from './employee-bank-form'
import { EmployeeDependentForm } from './employee-dependent-form'
import { EmployeeDocumentForm } from './employee-document-form'
import { EmployeePromotionDialog } from './employee-promotion-dialog'
import { PreviousExperienceForm } from './previous-experience-form'

import type {
  Employee,
  EmployeeWithRelations,
  EmployeeAddress,
  EmployeeEmergencyContact,
  EmployeeBankAccount,
  EmployeeDependent,
  EmployeeNominee,
  EmployeeIdentityDocument,
  EmployeeDocument,
  EmployeePreviousExperience,
} from '@/types/database.types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AVATAR_COLORS = [
  'bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-orange-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-rose-500',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium capitalize">{value || '-'}</p>
    </div>
  )
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ElementType
  title: string
}) {
  return (
    <div className="flex w-full items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <span>{title}</span>
    </div>
  )
}

/**
 * Passed to AccordionTrigger's `action` slot so it sits beside the trigger
 * rather than inside it.
 */
function SectionEditAction({ canEdit, onToggleEdit }: { canEdit: boolean; onToggleEdit: () => void }) {
  if (!canEdit) return null
  return (
    <Button variant="ghost" size="icon" className="ml-2 h-6 w-6 shrink-0" onClick={onToggleEdit}>
      <Pencil className="h-3 w-3" />
    </Button>
  )
}

function SubSectionTitle({ children, onAdd, canEdit }: { children: React.ReactNode; onAdd?: () => void; canEdit?: boolean }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h4 className="text-sm font-semibold">{children}</h4>
      {canEdit && onAdd && (
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-1 h-3 w-3" /> Add
        </Button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface EmployeeUnifiedViewProps {
  employeeId: string
}

export function EmployeeUnifiedView({ employeeId }: EmployeeUnifiedViewProps) {
  const navigate = useNavigate()
  const permissions = usePermissions()
  const { profile } = useAuth()
  const canEdit = permissions.canManageEmployees

  // Core data
  const { data: employee, isLoading } = useEmployee(employeeId)
  const { data: allEmployees } = useEmployees()
  const { data: departments } = useDepartments()
  const { data: designations } = useDesignations()

  // Lifecycle data
  const { data: addresses } = useEmployeeAddresses(employeeId)
  const { data: contacts } = useEmergencyContacts(employeeId)
  const { data: bankAccounts } = useBankAccounts(employeeId)
  const { data: dependents } = useDependents(employeeId)
  const { data: nominees } = useNominees(employeeId)
  const { data: identityDocs } = useIdentityDocuments(employeeId)
  const { data: empDocuments } = useEmployeeDocuments(employeeId)
  const { data: workProfiles } = useWorkProfiles(employeeId)
  const { data: exitRecord } = useExitRecord(employeeId)
  const { data: statusHistory } = useStatusHistory(employeeId)
  const { data: orgHistory } = useOrgHistory(employeeId)
  const { data: previousExperience } = usePreviousExperience(employeeId)

  // Mutations
  const updateEmployee = useUpdateEmployee()
  const deleteAddress = useDeleteAddress()
  const deleteContact = useDeleteEmergencyContact()
  const deleteBankAccount = useDeleteBankAccount()
  const setSalaryAccount = useSetSalaryAccount()
  const deleteDependent = useDeleteDependent()
  const deleteNominee = useDeleteNominee()
  const deleteIdentityDoc = useDeleteIdentityDocument()
  const deleteEmpDocument = useDeleteEmployeeDocument()
  const deletePrevExperience = useDeletePreviousExperience()

  // Editing state for inline sections
  const [editingSection, setEditingSection] = useState<string | null>(null)

  // Dialog state for entity forms
  const [addressDialogOpen, setAddressDialogOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<EmployeeAddress | undefined>()

  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<EmployeeEmergencyContact | undefined>()

  const [bankDialogOpen, setBankDialogOpen] = useState(false)
  const [editingBank, setEditingBank] = useState<EmployeeBankAccount | undefined>()

  const [dependentDialogOpen, setDependentDialogOpen] = useState(false)
  const [dependentFormType, setDependentFormType] = useState<'dependent' | 'nominee'>('dependent')
  const [editingDependent, setEditingDependent] = useState<EmployeeDependent | undefined>()
  const [editingNominee, setEditingNominee] = useState<EmployeeNominee | undefined>()

  const [docDialogOpen, setDocDialogOpen] = useState(false)
  const [docFormType, setDocFormType] = useState<'identity' | 'document'>('identity')
  const [editingIdentityDoc, setEditingIdentityDoc] = useState<EmployeeIdentityDocument | undefined>()
  const [editingEmpDocument, setEditingEmpDocument] = useState<EmployeeDocument | undefined>()

  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false)
  const [experienceFormOpen, setExperienceFormOpen] = useState(false)
  const [editingExperience, setEditingExperience] = useState<EmployeePreviousExperience | undefined>()

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  })

  // ---------------------------------------------------------------------------
  // Inline save handler
  // ---------------------------------------------------------------------------

  const queryClient = useQueryClient()

  async function handleSaveSection(sectionData: Record<string, unknown>) {
    try {
      // The form is one flat object, but it now writes to three tables.
      const directory: Record<string, unknown> = { ...sectionData }
      const statutory: Record<string, unknown> = {}
      const personal: Record<string, unknown> = {}
      for (const f of STATUTORY_FIELDS) {
        if (f in directory) { statutory[f] = directory[f]; delete directory[f] }
      }
      for (const f of PERSONAL_FIELDS) {
        if (f in directory) { personal[f] = directory[f]; delete directory[f] }
      }

      if (Object.keys(directory).length > 0) {
        await updateEmployee.mutateAsync({ id: employeeId, ...directory } as Partial<Employee> & { id: string })
      }
      if (emp?.organization_id) {
        if (Object.keys(statutory).length > 0) {
          await upsertEmployeeStatutory(employeeId, emp.organization_id, statutory)
        }
        if (Object.keys(personal).length > 0) {
          await upsertEmployeePersonal(employeeId, emp.organization_id, personal)
        }
        if (Object.keys(statutory).length > 0 || Object.keys(personal).length > 0) {
          await queryClient.invalidateQueries({ queryKey: ['employee', employeeId] })
        }
      }
      toast.success('Updated successfully')
      setEditingSection(null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  // ---------------------------------------------------------------------------
  // Loading / Not Found
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!employee) {
    return <div className="py-16 text-center text-muted-foreground">Employee not found</div>
  }

  const emp = employee as EmployeeWithRelations
  const fullName = `${emp.first_name} ${emp.last_name}`
  const avatarColor = getAvatarColor(fullName)

  const managers = (allEmployees ?? [])
    .filter((e) => e.id !== employeeId)
    .map((e) => ({ id: e.id, first_name: e.first_name, last_name: e.last_name }))

  const showExit =
    ['on_notice', 'resigned', 'terminated', 'absconding'].includes(emp.status) ||
    permissions.canInitiateExit

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div>
      {/* ── Profile Header ─────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={emp.avatar_url || undefined} />
              <AvatarFallback className={`${avatarColor} text-lg text-white`}>
                {getInitials(emp.first_name, emp.last_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">
                {emp.salutation ? `${emp.salutation}. ` : ''}
                {emp.first_name} {emp.middle_name ? `${emp.middle_name} ` : ''}
                {emp.last_name}
              </h2>
              <p className="text-muted-foreground">
                {emp.designation?.title ?? 'No designation'} &middot;{' '}
                {emp.department?.name ?? 'No department'}
              </p>
              <div className="mt-1 flex items-center gap-2">
                {emp.employee_code && <Badge>{emp.employee_code}</Badge>}
                <StatusBadge status={emp.status} />
                <Badge variant="outline" className="capitalize">
                  {emp.employment_type.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate({ to: '/employees' })}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Accordion Sections ─────────────────────────────────────────── */}
      <Accordion type="multiple" defaultValue={['personal', 'employment']}>
        {/* SECTION 1: Personal Information */}
        <AccordionItem value="personal">
          <AccordionTrigger
            className="text-base font-semibold"
            action={
              <SectionEditAction
                canEdit={canEdit}
                onToggleEdit={() => setEditingSection(editingSection === 'personal' ? null : 'personal')}
              />
            }
          >
            <SectionHeader icon={User} title="Personal Information" />
          </AccordionTrigger>
          <AccordionContent>
            {editingSection === 'personal' ? (
              <PersonalEditForm employee={emp} onSave={handleSaveSection} onCancel={() => setEditingSection(null)} isPending={updateEmployee.isPending} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <InfoField label="Salutation" value={emp.salutation} />
                <InfoField label="First Name" value={emp.first_name} />
                <InfoField label="Middle Name" value={emp.middle_name} />
                <InfoField label="Last Name" value={emp.last_name} />
                <InfoField label="Work Email" value={emp.email} />
                <InfoField label="Personal Email" value={emp.personal_email} />
                <InfoField label="Phone" value={emp.phone} />
                <InfoField label="Official Phone" value={emp.official_phone} />
                <InfoField label="Date of Birth" value={emp.personal?.date_of_birth ? formatDate(emp.personal.date_of_birth) : null} />
                <InfoField label="Gender" value={emp.gender} />
                <InfoField label="Marital Status" value={emp.marital_status} />
                <InfoField label="Blood Group" value={emp.blood_group} />
                <InfoField label="Nationality" value={emp.nationality} />
                <InfoField label="Religion" value={emp.personal?.religion} />
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* SECTION 2: Employment Details */}
        <AccordionItem value="employment">
          <AccordionTrigger
            className="text-base font-semibold"
            action={
              <SectionEditAction
                canEdit={canEdit}
                onToggleEdit={() => setEditingSection(editingSection === 'employment' ? null : 'employment')}
              />
            }
          >
            <SectionHeader icon={Briefcase} title="Employment Details" />
          </AccordionTrigger>
          <AccordionContent>
            {editingSection === 'employment' ? (
              <EmploymentEditForm
                employee={emp}
                departments={(departments ?? []).map((d) => ({ id: d.id, name: d.name }))}
                designations={(designations ?? []).map((d) => ({ id: d.id, title: d.title }))}
                managers={managers}
                onSave={handleSaveSection}
                onCancel={() => setEditingSection(null)}
                isPending={updateEmployee.isPending}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <InfoField label="Employee Code" value={emp.employee_code} />
                <InfoField label="Department" value={emp.department?.name} />
                <InfoField label="Designation" value={emp.designation?.title} />
                <InfoField label="Employment Type" value={emp.employment_type?.replace(/_/g, ' ')} />
                <InfoField label="Joining Date" value={emp.date_of_joining ? formatDate(emp.date_of_joining) : null} />
                <InfoField label="Confirmation Date" value={emp.confirmation_date ? formatDate(emp.confirmation_date) : null} />
                <InfoField label="Probation End Date" value={emp.probation_end_date ? formatDate(emp.probation_end_date) : null} />
                <InfoField label="Reporting Manager" value={emp.reporting_manager ? `${emp.reporting_manager.first_name} ${emp.reporting_manager.last_name}` : null} />
                <InfoField label="Status" value={emp.status} />
                {/* Probation Status Badge */}
                {emp.probation_end_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Probation Status</p>
                    {emp.confirmation_date ? (
                      <Badge variant="outline" className="mt-1 border-green-200 bg-green-50 text-green-700">Confirmed</Badge>
                    ) : new Date(emp.probation_end_date) >= new Date() ? (
                      <Badge variant="outline" className="mt-1 border-amber-200 bg-amber-50 text-amber-700">
                        On Probation ({Math.ceil((new Date(emp.probation_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days remaining)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="mt-1 border-yellow-200 bg-yellow-50 text-yellow-700">Probation Ended — Awaiting Confirmation</Badge>
                    )}
                  </div>
                )}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* SECTION 3: Family Details */}
        <AccordionItem value="family">
          <AccordionTrigger
            className="text-base font-semibold"
            action={
              <SectionEditAction
                canEdit={canEdit}
                onToggleEdit={() => setEditingSection(editingSection === 'family' ? null : 'family')}
              />
            }
          >
            <SectionHeader icon={Heart} title="Family Details" />
          </AccordionTrigger>
          <AccordionContent>
            {editingSection === 'family' ? (
              <FamilyEditForm employee={emp} onSave={handleSaveSection} onCancel={() => setEditingSection(null)} isPending={updateEmployee.isPending} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <InfoField label="Father Name" value={emp.personal?.father_name} />
                <InfoField label="Mother Name" value={emp.personal?.mother_name} />
                <InfoField label="Spouse Name" value={emp.personal?.spouse_name} />
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* SECTION 4: Compliance & Identity */}
        <AccordionItem value="compliance">
          <AccordionTrigger
            className="text-base font-semibold"
            action={
              <SectionEditAction
                canEdit={canEdit}
                onToggleEdit={() => setEditingSection(editingSection === 'compliance' ? null : 'compliance')}
              />
            }
          >
            <SectionHeader icon={ShieldCheck} title="Compliance & Identity" />
          </AccordionTrigger>
          <AccordionContent>
            {editingSection === 'compliance' ? (
              <ComplianceEditForm employee={emp} onSave={handleSaveSection} onCancel={() => setEditingSection(null)} isPending={updateEmployee.isPending} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <InfoField label="PAN Number" value={emp.statutory?.pan_number} />
                <InfoField label="Aadhar Number" value={emp.statutory?.aadhar_number} />
                <InfoField label="UAN Number" value={emp.statutory?.uan_number} />
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* SECTION 5: Addresses */}
        <AccordionItem value="addresses">
          <AccordionTrigger className="text-base font-semibold">
            <SectionHeader icon={MapPin} title="Addresses" />
          </AccordionTrigger>
          <AccordionContent>
            <SubSectionTitle canEdit={canEdit} onAdd={() => { setEditingAddress(undefined); setAddressDialogOpen(true) }}>
              Addresses ({addresses?.length ?? 0})
            </SubSectionTitle>
            {(!addresses || addresses.length === 0) ? (
              <p className="text-sm text-muted-foreground">No addresses recorded.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {addresses.map((addr) => (
                  <Card key={addr.id}>
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{addr.address_type}</Badge>
                        {addr.is_primary && <Badge className="bg-purple-100 text-purple-700 border-purple-200">Primary</Badge>}
                      </div>
                      <p className="text-sm">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
                      <p className="text-sm text-muted-foreground">{addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.pincode || ''}</p>
                      <p className="text-xs text-muted-foreground">{addr.country}</p>
                      {canEdit && (
                        <div className="mt-2 flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingAddress(addr); setAddressDialogOpen(true) }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setConfirmDelete({ open: true, title: 'Delete Address', description: 'Are you sure you want to delete this address?', onConfirm: () => { deleteAddress.mutate(addr.id); setConfirmDelete((c) => ({ ...c, open: false })) } })}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* SECTION 6: Emergency Contacts */}
        <AccordionItem value="contacts">
          <AccordionTrigger className="text-base font-semibold">
            <SectionHeader icon={Phone} title="Emergency Contacts" />
          </AccordionTrigger>
          <AccordionContent>
            <SubSectionTitle canEdit={canEdit} onAdd={() => { setEditingContact(undefined); setContactDialogOpen(true) }}>
              Emergency Contacts ({contacts?.length ?? 0})
            </SubSectionTitle>
            {(!contacts || contacts.length === 0) ? (
              <p className="text-sm text-muted-foreground">No emergency contacts recorded.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {contacts.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="p-4">
                      <p className="font-medium text-sm">{c.contact_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{c.relationship} &middot; Priority: {c.priority_order}</p>
                      <p className="mt-1 text-sm">{c.phone}</p>
                      {c.email && <p className="text-sm text-muted-foreground">{c.email}</p>}
                      {canEdit && (
                        <div className="mt-2 flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingContact(c); setContactDialogOpen(true) }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setConfirmDelete({ open: true, title: 'Delete Contact', description: `Delete ${c.contact_name}?`, onConfirm: () => { deleteContact.mutate(c.id); setConfirmDelete((p) => ({ ...p, open: false })) } })}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* SECTION 7: Bank & Finance */}
        <AccordionItem value="bank">
          <AccordionTrigger className="text-base font-semibold">
            <SectionHeader icon={Landmark} title="Bank & Finance" />
          </AccordionTrigger>
          <AccordionContent>
            <SubSectionTitle canEdit={canEdit} onAdd={() => { setEditingBank(undefined); setBankDialogOpen(true) }}>
              Bank Accounts ({bankAccounts?.length ?? 0})
            </SubSectionTitle>
            {(!bankAccounts || bankAccounts.length === 0) ? (
              <p className="text-sm text-muted-foreground">No bank accounts recorded.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {bankAccounts.map((acct) => (
                  <Card key={acct.id}>
                    <CardContent className="p-4">
                      <div className="mb-1 flex items-center gap-2">
                        <p className="font-medium text-sm">{acct.bank_name}</p>
                        {acct.is_salary_account && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Salary</Badge>}
                        <Badge variant="outline" className="capitalize">{acct.account_type}</Badge>
                      </div>
                      {acct.branch_name && <p className="text-xs text-muted-foreground">{acct.branch_name}</p>}
                      <p className="mt-1 text-sm">A/C: {acct.account_number}</p>
                      <p className="text-sm text-muted-foreground">IFSC: {acct.ifsc_code}</p>
                      {canEdit && (
                        <div className="mt-2 flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingBank(acct); setBankDialogOpen(true) }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          {!acct.is_salary_account && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => { setSalaryAccount.mutate({ employeeId, accountId: acct.id }); toast.success('Set as salary account') }}
                            >
                              <Star className="mr-1 h-3 w-3" /> Set Salary
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setConfirmDelete({ open: true, title: 'Delete Bank Account', description: `Delete ${acct.bank_name} account?`, onConfirm: () => { deleteBankAccount.mutate(acct.id); setConfirmDelete((p) => ({ ...p, open: false })) } })}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* SECTION 8: Dependents & Nominees */}
        <AccordionItem value="dependents">
          <AccordionTrigger className="text-base font-semibold">
            <SectionHeader icon={Users} title="Dependents & Nominees" />
          </AccordionTrigger>
          <AccordionContent>
            {/* Dependents */}
            <SubSectionTitle canEdit={canEdit} onAdd={() => { setDependentFormType('dependent'); setEditingDependent(undefined); setEditingNominee(undefined); setDependentDialogOpen(true) }}>
              Dependents ({dependents?.length ?? 0})
            </SubSectionTitle>
            {(!dependents || dependents.length === 0) ? (
              <p className="mb-4 text-sm text-muted-foreground">No dependents recorded.</p>
            ) : (
              <div className="mb-6 grid gap-3 sm:grid-cols-2">
                {dependents.map((dep) => (
                  <Card key={dep.id}>
                    <CardContent className="p-4">
                      <p className="font-medium text-sm">{dep.dependent_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{dep.relationship}</p>
                      {dep.dob && <p className="text-xs text-muted-foreground">DOB: {formatDate(dep.dob)}</p>}
                      {dep.gender && <p className="text-xs text-muted-foreground capitalize">Gender: {dep.gender}</p>}
                      {dep.is_nominee && <Badge variant="outline" className="mt-1">Also Nominee</Badge>}
                      {canEdit && (
                        <div className="mt-2 flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setDependentFormType('dependent'); setEditingDependent(dep); setEditingNominee(undefined); setDependentDialogOpen(true) }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setConfirmDelete({ open: true, title: 'Delete Dependent', description: `Delete ${dep.dependent_name}?`, onConfirm: () => { deleteDependent.mutate(dep.id); setConfirmDelete((p) => ({ ...p, open: false })) } })}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Nominees */}
            <SubSectionTitle canEdit={canEdit} onAdd={() => { setDependentFormType('nominee'); setEditingNominee(undefined); setEditingDependent(undefined); setDependentDialogOpen(true) }}>
              Nominees ({nominees?.length ?? 0})
            </SubSectionTitle>
            {(!nominees || nominees.length === 0) ? (
              <p className="text-sm text-muted-foreground">No nominees recorded.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {nominees.map((nom) => (
                  <Card key={nom.id}>
                    <CardContent className="p-4">
                      <p className="font-medium text-sm">{nom.nominee_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{nom.relationship}</p>
                      <p className="text-xs text-muted-foreground">Allocation: {nom.allocation_percent}%</p>
                      <Badge variant="outline" className="mt-1 capitalize">{NOMINEE_APPLICABLE_FOR.find((n) => n.value === nom.applicable_for)?.label ?? nom.applicable_for}</Badge>
                      {canEdit && (
                        <div className="mt-2 flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setDependentFormType('nominee'); setEditingNominee(nom); setEditingDependent(undefined); setDependentDialogOpen(true) }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setConfirmDelete({ open: true, title: 'Delete Nominee', description: `Delete ${nom.nominee_name}?`, onConfirm: () => { deleteNominee.mutate(nom.id); setConfirmDelete((p) => ({ ...p, open: false })) } })}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* SECTION 9: Documents */}
        <AccordionItem value="documents">
          <AccordionTrigger className="text-base font-semibold">
            <SectionHeader icon={FileText} title="Documents" />
          </AccordionTrigger>
          <AccordionContent>
            {/* Identity Documents */}
            <SubSectionTitle canEdit={canEdit} onAdd={() => { setDocFormType('identity'); setEditingIdentityDoc(undefined); setEditingEmpDocument(undefined); setDocDialogOpen(true) }}>
              Identity Documents ({identityDocs?.length ?? 0})
            </SubSectionTitle>
            {(!identityDocs || identityDocs.length === 0) ? (
              <p className="mb-4 text-sm text-muted-foreground">No identity documents recorded.</p>
            ) : (
              <div className="mb-6 grid gap-3 sm:grid-cols-2">
                {identityDocs.map((doc) => (
                  <Card key={doc.id}>
                    <CardContent className="p-4">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{IDENTITY_DOCUMENT_TYPES.find((t) => t.value === doc.document_type)?.label ?? doc.document_type}</Badge>
                        <StatusBadge status={doc.verification_status} />
                      </div>
                      <p className="text-sm font-medium">{doc.document_number}</p>
                      {doc.name_on_document && <p className="text-xs text-muted-foreground">Name: {doc.name_on_document}</p>}
                      {doc.issue_date && <p className="text-xs text-muted-foreground">Issued: {formatDate(doc.issue_date)}</p>}
                      {doc.expiry_date && <p className="text-xs text-muted-foreground">Expires: {formatDate(doc.expiry_date)}</p>}
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <ExternalLink className="h-3 w-3" /> View File
                        </a>
                      )}
                      {canEdit && (
                        <div className="mt-2 flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setDocFormType('identity'); setEditingIdentityDoc(doc); setEditingEmpDocument(undefined); setDocDialogOpen(true) }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setConfirmDelete({ open: true, title: 'Delete Document', description: 'Delete this identity document?', onConfirm: () => { deleteIdentityDoc.mutate(doc.id); setConfirmDelete((p) => ({ ...p, open: false })) } })}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Employee Documents */}
            <SubSectionTitle canEdit={canEdit} onAdd={() => { setDocFormType('document'); setEditingEmpDocument(undefined); setEditingIdentityDoc(undefined); setDocDialogOpen(true) }}>
              Employee Documents ({empDocuments?.length ?? 0})
            </SubSectionTitle>
            {(!empDocuments || empDocuments.length === 0) ? (
              <p className="text-sm text-muted-foreground">No documents uploaded.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {empDocuments.map((doc) => (
                  <Card key={doc.id}>
                    <CardContent className="p-4">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{DOCUMENT_CATEGORIES.find((c) => c.value === doc.document_category)?.label ?? doc.document_category}</Badge>
                        <StatusBadge status={doc.verification_status} />
                      </div>
                      <p className="text-sm font-medium">{doc.document_name}</p>
                      {doc.expiry_date && <p className="text-xs text-muted-foreground">Expires: {formatDate(doc.expiry_date)}</p>}
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <ExternalLink className="h-3 w-3" /> View File
                      </a>
                      {canEdit && (
                        <div className="mt-2 flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setDocFormType('document'); setEditingEmpDocument(doc); setEditingIdentityDoc(undefined); setDocDialogOpen(true) }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setConfirmDelete({ open: true, title: 'Delete Document', description: `Delete ${doc.document_name}?`, onConfirm: () => { deleteEmpDocument.mutate(doc.id); setConfirmDelete((p) => ({ ...p, open: false })) } })}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* SECTION 10: Work History */}
        <AccordionItem value="work-history">
          <AccordionTrigger className="text-base font-semibold">
            <SectionHeader icon={Clock} title="Work History" />
          </AccordionTrigger>
          <AccordionContent>
            {permissions.canManageWorkProfiles && (
              <div className="mb-4">
                <Button variant="outline" size="sm" onClick={() => setPromotionDialogOpen(true)}>
                  <Plus className="mr-1 h-3 w-3" /> Promote / Transfer
                </Button>
              </div>
            )}

            {/* Current Work Profile */}
            {workProfiles && workProfiles.length > 0 && (
              <>
                <h4 className="mb-2 text-sm font-semibold">Current Assignment</h4>
                {(() => {
                  const current = workProfiles.find((wp) => wp.is_current) ?? workProfiles[0]
                  return (
                    <Card className="mb-4">
                      <CardContent className="p-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <InfoField label="Effective From" value={current.effective_from ? formatDate(current.effective_from) : null} />
                          <InfoField label="Change Reason" value={current.change_reason} />
                          <InfoField label="Employment Type" value={current.employment_type?.replace(/_/g, ' ') ?? null} />
                        </div>
                      </CardContent>
                    </Card>
                  )
                })()}
              </>
            )}

            {/* Org History Timeline */}
            {orgHistory && orgHistory.length > 0 && (
              <>
                <h4 className="mb-2 text-sm font-semibold">Change History</h4>
                <div className="space-y-3">
                  {orgHistory.map((h) => (
                    <Card key={h.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {ORG_CHANGE_TYPES.find((t) => t.value === h.change_type)?.label ?? h.change_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatDate(h.effective_from)}</span>
                        </div>
                        {h.remarks && <p className="mt-1 text-sm text-muted-foreground">{h.remarks}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}

            {(!workProfiles || workProfiles.length === 0) && (!orgHistory || orgHistory.length === 0) && (
              <p className="text-sm text-muted-foreground">No work history recorded.</p>
            )}

            {/* Previous Experience */}
            {(() => {
              const isOwnProfile = employee?.profile_id === profile?.id
              const canManageExp = permissions.canManageWorkProfiles || isOwnProfile
              return (
                <>
                  <div className="mt-6 flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Previous Experience</h4>
                    {canManageExp && (
                      <Button variant="outline" size="sm" onClick={() => { setEditingExperience(undefined); setExperienceFormOpen(true) }}>
                        <Plus className="mr-1 h-3 w-3" /> Add Experience
                      </Button>
                    )}
                  </div>
                  {previousExperience && previousExperience.length > 0 ? (
                    <div className="mt-3 space-y-3">
                      {previousExperience.map((exp) => (
                        <Card key={exp.id}>
                          <CardContent className="flex items-start justify-between p-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="text-sm font-medium">{exp.company_name}</span>
                                {exp.employment_type && (
                                  <Badge variant="secondary" className="text-xs">
                                    {EMPLOYMENT_TYPES.find((t) => t.value === exp.employment_type)?.label || exp.employment_type}
                                  </Badge>
                                )}
                              </div>
                              {exp.designation && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                  {exp.designation}{exp.department ? ` · ${exp.department}` : ''}
                                </p>
                              )}
                              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                                <span>
                                  {formatDate(exp.start_date)} — {exp.end_date ? formatDate(exp.end_date) : 'Present'}
                                </span>
                                {exp.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> {exp.location}
                                  </span>
                                )}
                              </div>
                              {exp.reason_for_leaving && (
                                <p className="mt-1 text-xs text-muted-foreground italic">Left: {exp.reason_for_leaving}</p>
                              )}
                            </div>
                            {canManageExp && (
                              <div className="flex items-center gap-1 ml-2 shrink-0">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingExperience(exp); setExperienceFormOpen(true) }}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setConfirmDelete({
                                    open: true,
                                    title: 'Delete Experience',
                                    description: `Remove ${exp.company_name} from previous experience?`,
                                    onConfirm: async () => {
                                      try {
                                        await deletePrevExperience.mutateAsync(exp.id)
                                        toast.success('Experience deleted')
                                      } catch {
                                        toast.error('Failed to delete experience')
                                      }
                                    },
                                  })}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">No previous experience recorded.</p>
                  )}
                </>
              )
            })()}
          </AccordionContent>
        </AccordionItem>

        {/* SECTION 11: Exit Management */}
        {showExit && (
          <AccordionItem value="exit">
            <AccordionTrigger className="text-base font-semibold">
              <SectionHeader icon={LogOut} title="Exit Management" />
            </AccordionTrigger>
            <AccordionContent>
              {exitRecord ? (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  <InfoField label="Exit Type" value={EXIT_TYPES.find((t) => t.value === exitRecord.exit_type)?.label ?? exitRecord.exit_type} />
                  <InfoField label="Status" value={EXIT_STATUSES.find((s) => s.value === exitRecord.status)?.label ?? exitRecord.status} />
                  <InfoField label="Resignation Date" value={exitRecord.resignation_date ? formatDate(exitRecord.resignation_date) : null} />
                  <InfoField label="Last Working Date" value={exitRecord.last_working_date ? formatDate(exitRecord.last_working_date) : null} />
                  <InfoField label="Exit Reason" value={exitRecord.exit_reason} />
                  <InfoField label="Notice Period (days)" value={exitRecord.notice_period_days?.toString() ?? null} />
                  <InfoField label="Notice Served (days)" value={exitRecord.notice_period_served?.toString() ?? null} />
                  <InfoField label="Clearance Status" value={CLEARANCE_STATUSES.find((s) => s.value === exitRecord.clearance_status)?.label ?? exitRecord.clearance_status} />
                  <InfoField label="Exit Interview Done" value={exitRecord.exit_interview_done ? 'Yes' : 'No'} />
                  {exitRecord.exit_interview_notes && <InfoField label="Interview Notes" value={exitRecord.exit_interview_notes} />}
                  <InfoField label="Regretted Attrition" value={exitRecord.regretted_attrition ? 'Yes' : 'No'} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No exit record found.</p>
              )}

              {/* Status History */}
              {statusHistory && statusHistory.length > 0 && (
                <>
                  <h4 className="mb-2 mt-4 text-sm font-semibold">Status History</h4>
                  <div className="space-y-2">
                    {statusHistory.map((sh) => (
                      <div key={sh.id} className="flex items-center gap-3 text-sm">
                        <span className="text-xs text-muted-foreground">{formatDate(sh.changed_on)}</span>
                        <span className="capitalize">{sh.previous_status?.replace(/_/g, ' ') ?? 'N/A'}</span>
                        <span className="text-muted-foreground">&rarr;</span>
                        <span className="font-medium capitalize">{sh.new_status.replace(/_/g, ' ')}</span>
                        {sh.reason && <span className="text-xs text-muted-foreground">({sh.reason})</span>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {/* ── Dialogs ──────────────────────────────────────────────────── */}
      <EmployeeAddressForm
        open={addressDialogOpen}
        onOpenChange={setAddressDialogOpen}
        employeeId={employeeId}
        address={editingAddress}
      />

      <EmployeeContactForm
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        employeeId={employeeId}
        contact={editingContact}
      />

      <EmployeeBankForm
        open={bankDialogOpen}
        onOpenChange={setBankDialogOpen}
        employeeId={employeeId}
        account={editingBank}
      />

      <EmployeeDependentForm
        open={dependentDialogOpen}
        onOpenChange={setDependentDialogOpen}
        employeeId={employeeId}
        type={dependentFormType}
        dependent={editingDependent}
        nominee={editingNominee}
      />

      <EmployeeDocumentForm
        open={docDialogOpen}
        onOpenChange={setDocDialogOpen}
        employeeId={employeeId}
        type={docFormType}
        identityDocument={editingIdentityDoc}
        employeeDocument={editingEmpDocument}
      />

      {emp && (
        <EmployeePromotionDialog
          open={promotionDialogOpen}
          onOpenChange={setPromotionDialogOpen}
          employee={emp}
          departments={(departments ?? []).map((d) => ({ id: d.id, name: d.name }))}
          designations={(designations ?? []).map((d) => ({ id: d.id, title: d.title }))}
          managers={managers}
        />
      )}

      <PreviousExperienceForm
        open={experienceFormOpen}
        onOpenChange={(open) => { setExperienceFormOpen(open); if (!open) setEditingExperience(undefined) }}
        employeeId={employeeId}
        experience={editingExperience}
      />

      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(open) => setConfirmDelete((c) => ({ ...c, open }))}
        title={confirmDelete.title}
        description={confirmDelete.description}
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={confirmDelete.onConfirm}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inline Edit Forms (Sections 1-4)
// ---------------------------------------------------------------------------

interface InlineEditFormProps {
  employee: EmployeeWithRelations
  onSave: (data: Partial<Employee>) => Promise<void>
  onCancel: () => void
  isPending: boolean
}

function PersonalEditForm({ employee, onSave, onCancel, isPending }: InlineEditFormProps) {
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      salutation: employee.salutation || '',
      first_name: employee.first_name,
      middle_name: employee.middle_name || '',
      last_name: employee.last_name,
      email: employee.email,
      personal_email: employee.personal_email || '',
      phone: employee.phone || '',
      official_phone: employee.official_phone || '',
      date_of_birth: employee.personal?.date_of_birth || '',
      gender: employee.gender || '',
      marital_status: employee.marital_status || '',
      blood_group: employee.blood_group || '',
      nationality: employee.nationality || '',
      religion: employee.personal?.religion || '',
    },
  })

  const onSubmit = (data: Record<string, string>) => {
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
    )
    onSave(cleaned)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div className="space-y-1">
          <Label>Salutation</Label>
          <Select onValueChange={(v) => setValue('salutation', v)} defaultValue={employee.salutation || undefined}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {SALUTATION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>First Name *</Label>
          <Input {...register('first_name')} required />
        </div>
        <div className="space-y-1">
          <Label>Middle Name</Label>
          <Input {...register('middle_name')} />
        </div>
        <div className="space-y-1">
          <Label>Last Name *</Label>
          <Input {...register('last_name')} required />
        </div>
        <div className="space-y-1">
          <Label>Work Email *</Label>
          <Input type="email" {...register('email')} required />
        </div>
        <div className="space-y-1">
          <Label>Personal Email</Label>
          <Input type="email" {...register('personal_email')} />
        </div>
        <div className="space-y-1">
          <Label>Phone</Label>
          <Input {...register('phone')} />
        </div>
        <div className="space-y-1">
          <Label>Official Phone</Label>
          <Input {...register('official_phone')} />
        </div>
        <div className="space-y-1">
          <Label>Date of Birth</Label>
          <Input type="date" {...register('date_of_birth')} />
        </div>
        <div className="space-y-1">
          <Label>Gender</Label>
          <Select onValueChange={(v) => setValue('gender', v)} defaultValue={employee.gender || undefined}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {GENDER_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Marital Status</Label>
          <Select onValueChange={(v) => setValue('marital_status', v)} defaultValue={employee.marital_status || undefined}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {MARITAL_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Blood Group</Label>
          <Select onValueChange={(v) => setValue('blood_group', v)} defaultValue={employee.blood_group || undefined}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {BLOOD_GROUPS.map((bg) => <SelectItem key={bg} value={bg}>{bg}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Nationality</Label>
          <Select onValueChange={(v) => setValue('nationality', v)} defaultValue={employee.nationality || undefined}>
            <SelectTrigger><SelectValue placeholder="Select nationality" /></SelectTrigger>
            <SelectContent>
              {NATIONALITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Religion</Label>
          <Select onValueChange={(v) => setValue('religion', v)} defaultValue={employee.personal?.religion || undefined}>
            <SelectTrigger><SelectValue placeholder="Select religion" /></SelectTrigger>
            <SelectContent>
              {RELIGION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending}>Save</Button>
      </div>
    </form>
  )
}

interface EmploymentEditFormProps extends InlineEditFormProps {
  departments: { id: string; name: string }[]
  designations: { id: string; title: string }[]
  managers: { id: string; first_name: string; last_name: string }[]
}

function EmploymentEditForm({ employee, departments, designations, managers, onSave, onCancel, isPending }: EmploymentEditFormProps) {
  const { register, handleSubmit, setValue } = useForm({
    defaultValues: {
      employee_code: employee.employee_code || '',
      department_id: employee.department_id || '',
      designation_id: employee.designation_id || '',
      reporting_manager_id: employee.reporting_manager_id || '',
      employment_type: employee.employment_type || 'full_time',
      date_of_joining: employee.date_of_joining || '',
      confirmation_date: employee.confirmation_date || '',
      probation_end_date: employee.probation_end_date || '',
      status: employee.status,
    },
  })

  const onSubmit = (data: Record<string, string>) => {
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
    )
    onSave(cleaned)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <div className="space-y-1">
          <Label>Employee Code</Label>
          <Input {...register('employee_code')} />
        </div>
        <div className="space-y-1">
          <Label>Department</Label>
          <Select onValueChange={(v) => setValue('department_id', v)} defaultValue={employee.department_id || undefined}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Designation</Label>
          <Select onValueChange={(v) => setValue('designation_id', v)} defaultValue={employee.designation_id || undefined}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {designations.map((d) => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Employment Type</Label>
          <Select onValueChange={(v) => setValue('employment_type', v)} defaultValue={employee.employment_type}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EMPLOYMENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Joining Date</Label>
          <Input type="date" {...register('date_of_joining')} />
        </div>
        <div className="space-y-1">
          <Label>Confirmation Date</Label>
          <Input type="date" {...register('confirmation_date')} />
        </div>
        <div className="space-y-1">
          <Label>Probation End Date</Label>
          <Input type="date" {...register('probation_end_date')} />
        </div>
        <div className="space-y-1">
          <Label>Reporting Manager</Label>
          <Select onValueChange={(v) => setValue('reporting_manager_id', v)} defaultValue={employee.reporting_manager_id || undefined}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {managers.map((m) => <SelectItem key={m.id} value={m.id}>{m.first_name} {m.last_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select onValueChange={(v) => setValue('status', v)} defaultValue={employee.status}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EMPLOYEE_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending}>Save</Button>
      </div>
    </form>
  )
}

function FamilyEditForm({ employee, onSave, onCancel, isPending }: InlineEditFormProps) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      father_name: employee.personal?.father_name || '',
      mother_name: employee.personal?.mother_name || '',
      spouse_name: employee.personal?.spouse_name || '',
    },
  })

  const onSubmit = (data: Record<string, string>) => {
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
    )
    onSave(cleaned)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label>Father Name</Label>
          <Input {...register('father_name')} />
        </div>
        <div className="space-y-1">
          <Label>Mother Name</Label>
          <Input {...register('mother_name')} />
        </div>
        <div className="space-y-1">
          <Label>Spouse Name</Label>
          <Input {...register('spouse_name')} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending}>Save</Button>
      </div>
    </form>
  )
}

function ComplianceEditForm({ employee, onSave, onCancel, isPending }: InlineEditFormProps) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      pan_number: employee.statutory?.pan_number || '',
      aadhar_number: employee.statutory?.aadhar_number || '',
      uan_number: employee.statutory?.uan_number || '',
    },
  })

  const onSubmit = (data: Record<string, string>) => {
    const cleaned = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
    )
    onSave(cleaned)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label>PAN Number</Label>
          <Input {...register('pan_number')} placeholder="ABCDE1234F" />
        </div>
        <div className="space-y-1">
          <Label>Aadhar Number</Label>
          <Input {...register('aadhar_number')} placeholder="1234 5678 9012" />
        </div>
        <div className="space-y-1">
          <Label>UAN Number</Label>
          <Input {...register('uan_number')} placeholder="100123456789" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending}>Save</Button>
      </div>
    </form>
  )
}
