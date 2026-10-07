import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  useLeaveMentorPool, useMyMentorProfile, useSaveMentorProfile,
} from '../hooks/use-mentorship'
import type { MentorProfileRow } from '../types'
import { toast } from 'sonner'

/**
 * Offer to mentor, and say what you can help with.
 *
 * Optional on purpose. Anyone can be asked whether or not they fill this in —
 * but the people who do appear first when someone goes looking, with their
 * areas next to their name, which is where most good matches come from.
 */
export function MentorProfileTab({ myEmployeeId }: { myEmployeeId: string | undefined }) {
  const { data, isLoading } = useMyMentorProfile()
  const profile = (data ?? null) as MentorProfileRow | null

  if (isLoading) return null

  // Keyed on what was loaded, so the form fills itself in on mount rather than
  // being filled in afterwards by an effect.
  return (
    <MentorProfileForm
      key={profile?.employee_id ?? 'new'}
      profile={profile}
      myEmployeeId={myEmployeeId}
    />
  )
}

function MentorProfileForm({
  profile, myEmployeeId,
}: {
  profile: MentorProfileRow | null
  myEmployeeId: string | undefined
}) {
  const save = useSaveMentorProfile()
  const leave = useLeaveMentorPool()

  const [headline, setHeadline] = useState(profile?.headline ?? '')
  const [about, setAbout] = useState(profile?.about ?? '')
  const [areas, setAreas] = useState<string[]>(profile?.focus_areas ?? [])
  const [areaDraft, setAreaDraft] = useState('')
  const [accepting, setAccepting] = useState(profile?.is_accepting ?? true)
  const [maxMentees, setMaxMentees] = useState(String(profile?.max_mentees ?? 3))

  function addArea() {
    const value = areaDraft.trim()
    if (!value || areas.includes(value)) return
    setAreas((prev) => [...prev, value])
    setAreaDraft('')
  }

  async function handleSave() {
    if (!myEmployeeId) return
    try {
      await save.mutateAsync({
        employee_id: myEmployeeId,
        headline: headline.trim() || null,
        about: about.trim() || null,
        focus_areas: areas,
        is_accepting: accepting,
        max_mentees: Number(maxMentees),
      })
      toast.success(profile ? 'Profile updated' : 'You are now listed as a mentor')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the profile')
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {profile ? 'Your mentor profile' : 'Offer to mentor'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            You do not have to fill this in — anyone can ask you either way. Doing it puts you in
            front of people looking for exactly what you know, and saves you declining requests
            that were never a fit.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="headline">One line on what you can help with</Label>
            <Input
              id="headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="e.g. Moving from writing code to leading a team"
              maxLength={160}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="about">A little more</Label>
            <Textarea
              id="about"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={4}
              placeholder="What you have done, how you like to work with someone, what you are not the right person for."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Areas</Label>
            <div className="flex gap-2">
              <Input
                value={areaDraft}
                onChange={(e) => setAreaDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addArea()
                  }
                }}
                placeholder="e.g. Client handling"
                maxLength={40}
              />
              <Button variant="outline" onClick={addArea} disabled={!areaDraft.trim()}>
                Add
              </Button>
            </div>
            {areas.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {areas.map((a) => (
                  <Badge key={a} variant="secondary" className="gap-1">
                    {a}
                    <button
                      type="button"
                      onClick={() => setAreas((prev) => prev.filter((x) => x !== a))}
                      className="ml-0.5"
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove {a}</span>
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>How many mentees can you take?</Label>
            <Select value={maxMentees} onValueChange={setMaxMentees}>
              <SelectTrigger className="max-w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">One at a time</SelectItem>
                <SelectItem value="2">Up to two</SelectItem>
                <SelectItem value="3">Up to three</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Three is the most anyone can carry. Choose fewer if that is more honest.
            </p>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Taking new mentees</p>
              <p className="text-xs text-muted-foreground">
                Switch this off when you are stretched. You stay listed, and nobody can send you a
                request until you turn it back on.
              </p>
            </div>
            <Switch checked={accepting} onCheckedChange={setAccepting} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={save.isPending || !myEmployeeId}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {profile ? 'Save profile' : 'List me as a mentor'}
            </Button>
            {profile && (
              <Button
                variant="outline"
                disabled={leave.isPending}
                onClick={async () => {
                  if (!myEmployeeId) return
                  try {
                    await leave.mutateAsync(myEmployeeId)
                    toast.success('Removed from the mentor list')
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Could not remove it')
                  }
                }}
              >
                Remove my profile
              </Button>
            )}
          </div>

          {profile && (
            <p className="text-xs text-muted-foreground">
              Removing your profile does not end any mentorship you are already in.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
