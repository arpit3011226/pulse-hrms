import { useState } from 'react'
import { Plus, Pencil, Trash2, MapPin, Phone, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/shared/status-badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { usePermissions } from '@/hooks/use-permissions'
import { formatDate } from '@/lib/utils'
import {
  useEmployeeAddresses,
  useEmergencyContacts,
  useDeleteAddress,
  useDeleteEmergencyContact,
} from '../hooks/use-employee-lifecycle'
import { EmployeeAddressForm } from './employee-address-form'
import { EmployeeContactForm } from './employee-contact-form'
import type { EmployeeWithRelations, EmployeeAddress, EmployeeEmergencyContact } from '@/types/database.types'
import { toast } from 'sonner'

interface EmployeePersonalTabProps {
  employee: EmployeeWithRelations
}

export function EmployeePersonalTab({ employee }: EmployeePersonalTabProps) {
  const permissions = usePermissions()
  const canEdit = permissions.canManageEmployees
  const { data: addresses, isLoading: loadingAddresses } = useEmployeeAddresses(employee.id)
  const { data: contacts, isLoading: loadingContacts } = useEmergencyContacts(employee.id)
  const deleteAddress = useDeleteAddress()
  const deleteContact = useDeleteEmergencyContact()

  const [addressDialogOpen, setAddressDialogOpen] = useState(false)
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<EmployeeAddress | undefined>()
  const [editingContact, setEditingContact] = useState<EmployeeEmergencyContact | undefined>()
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'address' | 'contact'; id: string } | null>(null)

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    try {
      if (deleteConfirm.type === 'address') {
        await deleteAddress.mutateAsync(deleteConfirm.id)
        toast.success('Address deleted')
      } else {
        await deleteContact.mutateAsync(deleteConfirm.id)
        toast.success('Contact deleted')
      }
    } catch {
      toast.error('Failed to delete')
    }
    setDeleteConfirm(null)
  }

  return (
    <div className="space-y-6">
      {/* Extended Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem label="Nationality" value={employee.nationality} />
            <InfoItem label="Gender" value={employee.gender} />
            <InfoItem label="Marital Status" value={employee.marital_status} />
            <InfoItem label="Blood Group" value={employee.blood_group} />
            {employee.personal ? (
              <>
                <InfoItem label="Religion" value={employee.personal.religion} />
                <InfoItem label="Father's Name" value={employee.personal.father_name} />
                <InfoItem label="Mother's Name" value={employee.personal.mother_name} />
                <InfoItem label="Spouse's Name" value={employee.personal.spouse_name} />
                <InfoItem
                  label="Date of Birth"
                  value={employee.personal.date_of_birth ? formatDate(employee.personal.date_of_birth) : null}
                />
              </>
            ) : null}
          </div>
          {!employee.personal && (
            <p className="mt-4 text-xs text-muted-foreground">
              Date of birth, religion and family details are visible to the person themselves,
              HR, an admin and leadership only.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Addresses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Addresses</CardTitle>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => { setEditingAddress(undefined); setAddressDialogOpen(true) }}>
              <Plus className="mr-1 h-4 w-4" /> Add Address
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingAddresses ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : !addresses?.length ? (
            <p className="text-sm text-muted-foreground">No addresses added yet.</p>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div key={addr.id} className="flex items-start justify-between rounded-lg border p-3">
                  <div className="flex gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize">{addr.address_type} Address</span>
                        {addr.is_primary && <StatusBadge status="primary" />}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {[addr.line1, addr.line2, addr.city, addr.state, addr.country, addr.pincode].filter(Boolean).join(', ')}
                      </p>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingAddress(addr); setAddressDialogOpen(true) }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm({ type: 'address', id: addr.id })}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emergency Contacts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Emergency Contacts</CardTitle>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => { setEditingContact(undefined); setContactDialogOpen(true) }}>
              <Plus className="mr-1 h-4 w-4" /> Add Contact
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingContacts ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
            </div>
          ) : !contacts?.length ? (
            <p className="text-sm text-muted-foreground">No emergency contacts added yet.</p>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact) => (
                <div key={contact.id} className="flex items-start justify-between rounded-lg border p-3">
                  <div className="flex gap-3">
                    <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{contact.contact_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{contact.relationship}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{contact.phone}</span>
                        {contact.email && <span>{contact.email}</span>}
                      </div>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingContact(contact); setContactDialogOpen(true) }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm({ type: 'contact', id: contact.id })}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <EmployeeAddressForm
        open={addressDialogOpen}
        onOpenChange={setAddressDialogOpen}
        employeeId={employee.id}
        address={editingAddress}
      />
      <EmployeeContactForm
        open={contactDialogOpen}
        onOpenChange={setContactDialogOpen}
        employeeId={employee.id}
        contact={editingContact}
      />
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete Confirmation"
        description={`Are you sure you want to delete this ${deleteConfirm?.type}?`}
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium capitalize">{value || '-'}</p>
    </div>
  )
}
