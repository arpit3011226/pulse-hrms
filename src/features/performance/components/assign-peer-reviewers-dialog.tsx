import { useState } from 'react'
import { Loader2, Plus, X, Users } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  useReviewParticipants,
  useAddReviewParticipant,
  useRemoveReviewParticipant,
} from '../hooks/use-performance'
import type { ReviewParticipantWithRelations } from '@/types/database.types'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useCurrentEmployee } from '../hooks/use-performance'
import { supabase } from '@/lib/supabase'

interface Employee {
  id: string
  first_name: string
  last_name: string
  email: string
  employee_code: string
}

interface AssignPeerReviewersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reviewId: string
  employeeId: string // the reviewee
}

export function AssignPeerReviewersDialog({
  open,
  onOpenChange,
  reviewId,
  employeeId,
}: AssignPeerReviewersDialogProps) {
  const { profile } = useAuth()
  const { data: currentEmployee } = useCurrentEmployee()
  const { data: participants } = useReviewParticipants(reviewId)
  const addParticipant = useAddReviewParticipant()
  const removeParticipant = useRemoveReviewParticipant()

  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Employee[]>([])
  const [searching, setSearching] = useState(false)

  const peerParticipants = ((participants || []) as ReviewParticipantWithRelations[]).filter(
    (p) => p.reviewer_type === 'peer'
  )

  const skipLevelParticipant = ((participants || []) as ReviewParticipantWithRelations[]).find(
    (p) => p.reviewer_type === 'skip_level'
  )

  const existingPeerIds = new Set(peerParticipants.map((p) => p.reviewer_id))

  const handleSearch = async (query: string) => {
    setSearch(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const orgId = profile?.organization_id
      const { data } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, employee_code')
        .eq('organization_id', orgId)
        .eq('employment_status', 'active')
        .neq('id', employeeId)
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10)

      setSearchResults((data || []) as Employee[])
    } catch {
      setSearchResults([])
    }
    setSearching(false)
  }

  const handleAddPeer = async (emp: Employee) => {
    try {
      await addParticipant.mutateAsync({
        performance_review_id: reviewId,
        reviewer_id: emp.id,
        reviewer_type: 'peer',
        is_mandatory: false,
        assigned_by: currentEmployee?.id || null,
      })
      toast.success(`${emp.first_name} ${emp.last_name} added as peer reviewer`)
      setSearch('')
      setSearchResults([])
    } catch {
      toast.error('Failed to add peer reviewer')
    }
  }

  const handleAddSkipLevel = async (emp: Employee) => {
    try {
      await addParticipant.mutateAsync({
        performance_review_id: reviewId,
        reviewer_id: emp.id,
        reviewer_type: 'skip_level',
        is_mandatory: false,
        assigned_by: currentEmployee?.id || null,
      })
      toast.success(`${emp.first_name} ${emp.last_name} added as skip-level reviewer`)
      setSearch('')
      setSearchResults([])
    } catch {
      toast.error('Failed to add skip-level reviewer')
    }
  }

  const handleRemove = async (participantId: string) => {
    try {
      const participant = [...peerParticipants, skipLevelParticipant].find((p) => p?.id === participantId)
      await removeParticipant.mutateAsync({
        id: participantId,
        reviewId,
        reviewerId: participant?.reviewer_id || '',
        reviewerType: participant?.reviewer_type || '',
      })
      toast.success('Reviewer removed')
    } catch {
      toast.error('Failed to remove reviewer')
    }
  }

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Reviewers
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Search */}
          <div className="space-y-2">
            <Label>Search employees</Label>
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />

            {/* Search results */}
            {searchResults.length > 0 && (
              <ScrollArea className="max-h-48 rounded-md border">
                <div className="p-2 space-y-1">
                  {searchResults
                    .filter((emp) => !existingPeerIds.has(emp.id))
                    .map((emp) => (
                      <div
                        key={emp.id}
                        className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px] bg-orange-100 text-orange-700">
                              {getInitials(emp.first_name, emp.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {emp.first_name} {emp.last_name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">{emp.employee_code}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleAddPeer(emp)}
                            disabled={addParticipant.isPending}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Peer
                          </Button>
                          {!skipLevelParticipant && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleAddSkipLevel(emp)}
                              disabled={addParticipant.isPending}
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              Skip-Level
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            )}

            {searching && (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Current peer reviewers */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Assigned Peer Reviewers ({peerParticipants.length})</Label>
            {peerParticipants.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No peer reviewers assigned yet.</p>
            ) : (
              <div className="space-y-1.5">
                {peerParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[10px] bg-orange-100 text-orange-700">
                          {p.reviewer
                            ? getInitials(p.reviewer.first_name, p.reviewer.last_name)
                            : '??'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {p.reviewer
                            ? `${p.reviewer.first_name} ${p.reviewer.last_name}`
                            : 'Unknown'}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {p.status === 'submitted' ? 'Submitted' : 'Pending'}
                        </p>
                      </div>
                    </div>
                    {p.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemove(p.id)}
                        disabled={removeParticipant.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Skip-level reviewer */}
          {skipLevelParticipant && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Skip-Level Reviewer</Label>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[10px] bg-teal-100 text-teal-700">
                      {skipLevelParticipant.reviewer
                        ? getInitials(
                            skipLevelParticipant.reviewer.first_name,
                            skipLevelParticipant.reviewer.last_name
                          )
                        : '??'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {skipLevelParticipant.reviewer
                        ? `${skipLevelParticipant.reviewer.first_name} ${skipLevelParticipant.reviewer.last_name}`
                        : 'Unknown'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {skipLevelParticipant.status === 'submitted' ? 'Submitted' : 'Pending'}
                    </p>
                  </div>
                </div>
                {skipLevelParticipant.status === 'pending' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(skipLevelParticipant.id)}
                    disabled={removeParticipant.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
