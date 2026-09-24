import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Copy, KeyRound, Loader2, Search, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useCreateLogin } from '@/features/auth/hooks/use-user-admin'

/** Roles a login can be given here. Super admin is deliberately not on the list. */
const ASSIGNABLE_ROLES = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'hr_admin', label: 'HR Admin' },
  { value: 'payroll_admin', label: 'Payroll Admin' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'alumni', label: 'Alumni' },
] as const

const EXITED = ['terminated', 'resigned']

interface Row {
  id: string
  first_name: string
  last_name: string
  email: string | null
  personal_email: string | null
  employee_code: string | null
  status: string
  profile_id: string | null
}

export function LoginSettings() {
  const { organization } = useAuth()
  const createLogin = useCreateLogin()

  const [search, setSearch] = useState('')
  const [target, setTarget] = useState<Row | null>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('employee')
  const [link, setLink] = useState<string | null>(null)
  const [linkProblem, setLinkProblem] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [linkedExisting, setLinkedExisting] = useState(false)

  const { data: people, isLoading, refetch } = useQuery({
    queryKey: ['logins-people', organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, personal_email, employee_code, status, profile_id')
        .eq('organization_id', organization!.id)
        .order('first_name')
      if (error) throw error
      return (data ?? []) as Row[]
    },
  })

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const all = people ?? []
    if (!q) return all
    return all.filter((p) =>
      `${p.first_name} ${p.last_name} ${p.employee_code ?? ''} ${p.email ?? ''}`
        .toLowerCase()
        .includes(q)
    )
  }, [people, search])

  const withoutLogin = (people ?? []).filter((p) => !p.profile_id).length

  function openFor(person: Row) {
    setTarget(person)
    // An alumnus signs in on the address they keep after leaving.
    const exited = EXITED.includes(person.status)
    setEmail((exited ? person.personal_email : person.email) || person.email || '')
    setRole(exited ? 'alumni' : 'employee')
    setLink(null)
    setLinkProblem(null)
    setDone(false)
    setLinkedExisting(false)
  }

  async function handleCreate() {
    if (!target) return
    try {
      const result = await createLogin.mutateAsync({
        email: email.trim(),
        first_name: target.first_name,
        last_name: target.last_name,
        role,
        employee_id: target.id,
        personal_email: target.personal_email,
      })
      setLink(result.set_password_link)
      setLinkedExisting(!!result.linked_existing)
      setLinkProblem(
        result.set_password_link || result.linked_existing
          ? null
          : result.link_error ?? 'Unknown reason'
      )
      setDone(true)
      toast.success(result.linked_existing ? 'Existing login linked' : 'Login created')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the login')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" /> Logins
          </CardTitle>
          <CardDescription>
            Nobody can sign themselves up. Create a login here and the person sets their own
            password through the link. {withoutLogin > 0 && (
              <span className="font-medium">{withoutLogin} without a login.</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search by name, code or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {isLoading ? (
            <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : rows.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">Nobody matches that search.</p>
          ) : (
            <div className="divide-y">
              {rows.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {p.first_name} {p.last_name}
                      {p.employee_code ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {p.employee_code}
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.email || p.personal_email || 'No email on record'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {EXITED.includes(p.status) && <Badge variant="secondary">Exited</Badge>}
                    {p.profile_id ? (
                      <Badge className="bg-emerald-100 text-emerald-800">Has login</Badge>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => openFor(p)}>
                        <KeyRound className="mr-2 h-3.5 w-3.5" /> Create login
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!target} onOpenChange={() => setTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create a login</DialogTitle>
            <DialogDescription>
              {target ? `For ${target.first_name} ${target.last_name}.` : ''} They will set their
              own password, so you never handle it.
            </DialogDescription>
          </DialogHeader>

          {done ? (
            <div className="space-y-3 py-2">
              {link ? (
                <>
                  <p className="text-sm">
                    The login is ready. Send this link to the person so they can set a password.
                  </p>
                  <div className="rounded-md border bg-muted p-2">
                    <p className="break-all font-mono text-xs">{link}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(link)
                      toast.success('Link copied')
                    }}
                  >
                    <Copy className="mr-2 h-3.5 w-3.5" /> Copy link
                  </Button>
                </>
              ) : linkedExisting ? (
                <p className="text-sm">
                  This person already had a login, so it has been attached to their employee
                  record. Nothing else to do.
                </p>
              ) : (
                <>
                  <p className="text-sm">
                    The login is created, but the set-password link could not be made. Ask the
                    person to use <span className="font-medium">Forgot password</span> on the
                    sign-in page instead.
                  </p>
                  {linkProblem && (
                    <p className="text-xs text-muted-foreground">Reason: {linkProblem}</p>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-4 py-2">
              <div className="space-y-1.5">
                <Label>Email to sign in with *</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  Someone who has left should use a personal address they keep.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSIGNABLE_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              {done ? 'Done' : 'Cancel'}
            </Button>
            {!done && (
              <Button onClick={handleCreate} disabled={!email.trim() || createLogin.isPending}>
                {createLogin.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create login
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
