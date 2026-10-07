import { useMemo } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { DateRangeFilter } from '@/components/shared/date-range-filter'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { usePermissions } from '@/hooks/use-permissions'
import { useEmployees } from '@/features/employees/hooks/use-employees'
import {
  useMentorships, useMentorshipRequests, useMyEmployeeId,
} from '../hooks/use-mentorship'
import { FindMentorTab } from './find-mentor-tab'
import { MyMentorshipTab } from './my-mentorship-tab'
import { MyMenteesTab } from './my-mentees-tab'
import { MentorProfileTab } from './mentor-profile-tab'
import { ProgrammeTab } from './programme-tab'
import { TeamMentoringTab } from './team-mentoring-tab'
import type { MentorshipRequestRow, MentorshipRow } from '../types'

/**
 * The mentorship programme.
 *
 * Tabs sort themselves alphabetically, so which one opens first is set by
 * value rather than position: whoever has a mentor lands on that, and everyone
 * else lands on the list of people they could ask.
 */
export function MentorshipPage() {
  const { isAdmin, isHR, isLeadership } = usePermissions()
  const myEmployeeId = useMyEmployeeId()
  const { data: pairData } = useMentorships()
  const { data: requestData } = useMentorshipRequests()
  const { data: employees } = useEmployees()

  const pairs = (pairData ?? []) as unknown as MentorshipRow[]
  const requests = (requestData ?? []) as unknown as MentorshipRequestRow[]

  const runsProgramme = isAdmin || isHR || isLeadership

  const hasActiveMentor = pairs.some(
    (m) => m.mentee_id === myEmployeeId && m.status === 'active'
  )
  const hasPendingRequest = requests.some(
    (r) => r.mentee_id === myEmployeeId && r.status === 'pending'
  )
  const awaitingMyAnswer = requests.filter(
    (r) => r.mentor_id === myEmployeeId && r.status === 'pending'
  ).length

  // A manager here is anyone who has somebody reporting to them, not a role —
  // plenty of people who manage a team carry the plain employee role.
  const managesSomeone = useMemo(
    () => (employees ?? []).some((e) => e.reporting_manager_id === myEmployeeId),
    [employees, myEmployeeId]
  )

  return (
    <div>
      <PageHeader
        title="Mentorship"
        description="Find a mentor, agree what you are working towards, and keep it moving."
        actions={runsProgramme ? <DateRangeFilter /> : undefined}
      />

      <Tabs defaultValue={hasActiveMentor ? 'mine' : 'find'}>
        <TabsList>
          <TabsTrigger value="find">Find a Mentor</TabsTrigger>
          <TabsTrigger value="mine">My Mentorship</TabsTrigger>
          <TabsTrigger value="mentees">
            My Mentees
            {awaitingMyAnswer > 0 && (
              <Badge className="ml-2 h-4 px-1.5 text-[10px]">{awaitingMyAnswer}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="profile">Mentor Profile</TabsTrigger>
          {managesSomeone && <TabsTrigger value="team">My Team</TabsTrigger>}
          {runsProgramme && <TabsTrigger value="programme">Programme</TabsTrigger>}
        </TabsList>

        <TabsContent value="find" className="mt-6">
          <FindMentorTab
            myEmployeeId={myEmployeeId}
            hasActiveMentor={hasActiveMentor}
            hasPendingRequest={hasPendingRequest}
          />
        </TabsContent>

        <TabsContent value="mine" className="mt-6">
          <MyMentorshipTab myEmployeeId={myEmployeeId} />
        </TabsContent>

        <TabsContent value="mentees" className="mt-6">
          <MyMenteesTab myEmployeeId={myEmployeeId} />
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <MentorProfileTab myEmployeeId={myEmployeeId} />
        </TabsContent>

        {managesSomeone && (
          <TabsContent value="team" className="mt-6">
            <TeamMentoringTab myEmployeeId={myEmployeeId} />
          </TabsContent>
        )}

        {runsProgramme && (
          <TabsContent value="programme" className="mt-6">
            <ProgrammeTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
