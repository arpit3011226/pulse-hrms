import { useState } from 'react'
import {
  BookOpen, CalendarDays, CircleHelp, FileText, LifeBuoy, Sparkles, Users, Wallet, X,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

/**
 * F52 — in-app help and a first-run tour.
 *
 * Fifty people learning fourteen modules at once generates a lot of questions
 * that a short answer in the right place would have prevented.
 */

const TOUR_KEY = 'pulse.tour.seen.v1'

const QUICK_LINKS = [
  { icon: CalendarDays, label: 'Apply for leave', to: '/leave', hint: 'Leave → My Leaves → Apply' },
  { icon: Users, label: 'Clock in or out', to: '/attendance', hint: 'Attendance → My Attendance' },
  { icon: Wallet, label: 'Get my payslip', to: '/payroll', hint: 'Payroll → My Payslips' },
  { icon: FileText, label: 'Request a letter', to: '/self-service', hint: 'Self Service → My Letters' },
  { icon: LifeBuoy, label: 'Ask HR something', to: '/helpdesk', hint: 'Helpdesk → Raise ticket' },
  { icon: Sparkles, label: 'Thank a colleague', to: '/recognition', hint: 'Recognition' },
]

const TOUR_STEPS = [
  {
    title: 'Welcome to Pulse',
    body: 'Everything to do with your work life lives here — leave, attendance, payslips, requests and reviews. This takes about thirty seconds.',
  },
  {
    title: 'The sidebar is the whole app',
    body: 'Each item on the left is a module. You will only see the ones your role can open, so the list is shorter for most people than it looks in a demo.',
  },
  {
    title: 'Search finds anything',
    body: 'Press Cmd+K, or Ctrl+K on Windows, from anywhere. Type a colleague’s name to open their profile, or a screen name to jump straight there.',
  },
  {
    title: 'Self Service is where you ask for things',
    body: 'Letters, reimbursements, travel and general requests all start there. The Helpdesk is for questions rather than requests.',
  },
  {
    title: 'The help button stays put',
    body: 'The question mark in the top bar brings back this tour and the common how-do-I answers whenever you need them.',
  },
]

export function HelpMenu() {
  // First run only, decided once on mount. Read lazily rather than in an effect
  // so it does not trigger a second render, and wrapped because storage throws
  // in some private modes.
  const [tourOpen, setTourOpen] = useState(() => {
    try {
      return !localStorage.getItem(TOUR_KEY)
    } catch {
      return false
    }
  })
  const [step, setStep] = useState(0)

  function finishTour() {
    try { localStorage.setItem(TOUR_KEY, '1') } catch { /* ignore */ }
    setTourOpen(false)
    setStep(0)
  }

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" title="Help">
            <CircleHelp className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-medium">How do I…</p>
          </div>
          <div className="p-1.5">
            {QUICK_LINKS.map((q) => (
              <Link
                key={q.label}
                to={q.to}
                className="flex items-start gap-3 rounded-md px-2.5 py-2 hover:bg-muted"
              >
                <q.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm">{q.label}</p>
                  <p className="text-xs text-muted-foreground">{q.hint}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="border-t p-1.5">
            <button
              type="button"
              onClick={() => { setStep(0); setTourOpen(true) }}
              className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left hover:bg-muted"
            >
              <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm">Show me around again</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={tourOpen} onOpenChange={(o) => { if (!o) finishTour() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{TOUR_STEPS[step].title}</DialogTitle>
            <DialogDescription className="pt-1 text-sm leading-relaxed">
              {TOUR_STEPS[step].body}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-1.5">
              {TOUR_STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-6 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={finishTour}>
                <X className="mr-1.5 h-3.5 w-3.5" /> Skip
              </Button>
              {step < TOUR_STEPS.length - 1 ? (
                <Button size="sm" onClick={() => setStep((s) => s + 1)}>Next</Button>
              ) : (
                <Button size="sm" onClick={finishTour}>Got it</Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
