import { useState } from 'react'
import { ChevronDown, Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const STEPS: { title: string; body: string }[] = [
  {
    title: 'Decide what you want help with',
    body:
      'One or two things, as specific as you can make them. "Get better at leadership" is hard for anyone to act on. "Run my first performance conversation without dreading it" is something a mentor can actually work on with you.',
  },
  {
    title: 'Pick by area, not by seniority',
    body:
      'Use the area filters below to find people who have done the thing you are trying to do. The most senior person available is not always the best match — somebody two steps ahead of you often remembers the hard parts better.',
  },
  {
    title: 'Say why you are asking',
    body:
      'When you send the request, write a line or two about what you are hoping to get out of it. A request with a reason is accepted far more often than one that just says "will you mentor me".',
  },
  {
    title: 'Agree two or three goals in the first meeting',
    body:
      'Write them down here with a date against each. A goal is a good one if you could show somebody that it is done. Goals that stay in your head quietly stop happening.',
  },
  {
    title: 'Keep the check-ins short and regular',
    body:
      'Thirty minutes every few weeks beats two hours twice a year. Log each one so you can both see how it is going, and say honestly when it is not.',
  },
  {
    title: 'Finish it properly',
    body:
      'Mentorships are meant to end. When the goals are met, or it is not working, close it off and say how it went. That is what tells us whether the programme is worth running.',
  },
]

/**
 * How mentorship works here.
 *
 * HR asked for this: people were landing on a list of names with no idea how
 * to choose, what to ask for, or what a goal should look like. Collapsed by
 * default so it stays out of the way once you know, and open for anyone who
 * has not started yet.
 */
export function MentorshipGuide({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <Card>
      <CardContent className="py-3">
        <Button
          variant="ghost"
          onClick={() => setOpen((v) => !v)}
          className="h-auto w-full justify-start gap-2 px-1 py-1 hover:bg-transparent"
          aria-expanded={open}
        >
          <Compass className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium">How mentorship works here</span>
          <ChevronDown
            className={cn(
              'ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-180'
            )}
          />
        </Button>

        {open && (
          <ol className="space-y-3 px-1 pt-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium">
                  {i + 1}
                </span>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-sm text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
