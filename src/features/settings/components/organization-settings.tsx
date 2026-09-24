import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { TIMEZONE_OPTIONS, CURRENCY_OPTIONS, MONTH_OPTIONS } from '@/lib/constants'

export function OrganizationSettings() {
  const { organization, refreshProfile } = useAuth()
  const { isAdmin } = usePermissions()
  const canEditRegional = isAdmin
  const [isLoading, setIsLoading] = useState(false)
  const [fiscalYear, setFiscalYear] = useState(String(organization?.fiscal_year_start || 4))
  const [timezone, setTimezone] = useState(organization?.timezone || 'Asia/Kolkata')
  const [currency, setCurrency] = useState(organization?.currency || 'INR')
  const [signature, setSignature] = useState<string | null>(organization?.signature_image || null)
  const signatureInput = useRef<HTMLInputElement>(null)

  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: organization?.name || '',
      email: organization?.email || '',
      phone: organization?.phone || '',
      website: organization?.website || '',
      cin: organization?.cin || '',
      signatory_name: organization?.signatory_name || '',
      signatory_designation: organization?.signatory_designation || '',
      line1: organization?.address?.line1 || '',
      line2: organization?.address?.line2 || '',
      city: organization?.address?.city || '',
      state: organization?.address?.state || '',
      pincode: organization?.address?.pincode || '',
    },
  })

  const onSubmit = async (data: Record<string, string>) => {
    if (!organization) return
    setIsLoading(true)
    try {
      // The address is one JSONB column, so pull its parts out of the flat form.
      const { line1, line2, city, state, pincode, ...rest } = data
      const addressParts = { line1, line2, city, state, pincode }
      const hasAddress = Object.values(addressParts).some((v) => v?.trim())

      const cleaned = Object.fromEntries(
        Object.entries(rest).map(([k, v]) => [k, v || null])
      )
      const withAddress = {
        ...cleaned,
        address: hasAddress
          ? Object.fromEntries(
              Object.entries(addressParts)
                .filter(([, v]) => v?.trim())
                .map(([k, v]) => [k, v.trim()])
            )
          : null,
      }
      const withSignature = { ...withAddress, signature_image: signature }
      const updateData = canEditRegional
        ? { ...withSignature, fiscal_year_start: Number(fiscalYear), timezone, currency }
        : withSignature
      const { error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', organization.id)

      if (error) throw error
      await refreshProfile()
      toast.success('Organization updated')
    } catch {
      toast.error('Failed to update organization')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * The signature is stored as a data URI on the organisation record because the
   * PDF is built in the browser and needs the bytes without a second round trip.
   *
   * People upload a scan or a photo of a signature on paper, which means a mostly
   * blank image with the signature somewhere in the middle, often as a JPEG with
   * no transparency. Dropped straight onto a letter that shows up as a small mark
   * inside a visible white box. So before storing it we trim away the blank
   * border and make the paper transparent, and keep the result as a PNG.
   */
  const prepareSignature = (dataUrl: string): Promise<string> =>
    new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext('2d')
          if (!ctx) return resolve(dataUrl)
          ctx.drawImage(img, 0, 0)
          const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)

          // Anything this light counts as paper rather than ink.
          const PAPER = 230
          let minX = width, minY = height, maxX = -1, maxY = -1
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const i = (y * width + x) * 4
              const isInk = data[i + 3] > 20 && (data[i] < PAPER || data[i + 1] < PAPER || data[i + 2] < PAPER)
              if (!isInk) {
                data[i + 3] = 0   // paper disappears
              } else {
                if (x < minX) minX = x
                if (x > maxX) maxX = x
                if (y < minY) minY = y
                if (y > maxY) maxY = y
              }
            }
          }
          // Nothing found — an already-clean transparent image, or a blank scan.
          if (maxX < 0) return resolve(dataUrl)

          ctx.putImageData(new ImageData(data, width, height), 0, 0)
          const pad = 4
          const sx = Math.max(0, minX - pad)
          const sy = Math.max(0, minY - pad)
          const sw = Math.min(width - sx, maxX - minX + pad * 2)
          const sh = Math.min(height - sy, maxY - minY + pad * 2)

          const out = document.createElement('canvas')
          out.width = sw
          out.height = sh
          const octx = out.getContext('2d')
          if (!octx) return resolve(dataUrl)
          octx.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh)
          resolve(out.toDataURL('image/png'))
        } catch {
          resolve(dataUrl)   // never block on a signature we could not tidy
        }
      }
      img.onerror = () => resolve(dataUrl)
      img.src = dataUrl
    })

  const onSignatureChosen = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    if (file.size > 2_000_000) {
      toast.error('That image is too large. Please use one under 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      const cleaned = await prepareSignature(String(reader.result))
      setSignature(cleaned)
    }
    reader.onerror = () => toast.error('Could not read that file')
    reader.readAsDataURL(file)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Details</CardTitle>
        <CardDescription>Update your company information</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="org_name">Company Name</Label>
            <Input id="org_name" {...register('name')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org_email">Company Email</Label>
            <Input id="org_email" type="email" {...register('email')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org_phone">Phone</Label>
            <Input id="org_phone" {...register('phone')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org_website">Website</Label>
            <Input id="org_website" {...register('website')} />
          </div>

          <div className="pt-4 border-t space-y-4">
            <div>
              <h4 className="text-sm font-medium">Registered Address</h4>
              <p className="text-xs text-muted-foreground">
                This is printed on letters, offer letters and payslips.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="org_line1">Address Line 1</Label>
              <Input id="org_line1" {...register('line1')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org_line2">Address Line 2</Label>
              <Input id="org_line2" {...register('line2')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="org_city">City</Label>
                <Input id="org_city" {...register('city')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org_state">State</Label>
                <Input id="org_state" {...register('state')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org_pincode">PIN Code</Label>
              <Input id="org_pincode" {...register('pincode')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="org_cin">CIN</Label>
              <Input id="org_cin" placeholder="e.g. U72900KA2023PTC000000" {...register('cin')} />
              <p className="text-xs text-muted-foreground">
                Corporate Identity Number. Shown in the document footer. Leave it blank to
                keep it off the documents.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t space-y-4">
            <div>
              <h4 className="text-sm font-medium">Authorised Signatory</h4>
              <p className="text-xs text-muted-foreground">
                Signs letters and offer letters. Payslips are not signed.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="org_signatory_name">Name</Label>
              <Input id="org_signatory_name" {...register('signatory_name')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org_signatory_designation">Designation</Label>
              <Input
                id="org_signatory_designation"
                placeholder="e.g. Director"
                {...register('signatory_designation')}
              />
            </div>

            <div className="space-y-2">
              <Label>Signature</Label>
              {signature ? (
                <div className="rounded-md border bg-white p-3">
                  <img src={signature} alt="Signature" className="h-14 object-contain" />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No signature uploaded. Documents will show an empty line to sign by hand.
                </p>
              )}
              <input
                ref={signatureInput}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => onSignatureChosen(e.target.files?.[0])}
              />
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => signatureInput.current?.click()}>
                  {signature ? 'Replace' : 'Upload'} signature
                </Button>
                {signature && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSignature(null)}>
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                A scan or a clear photo of a signature on white paper is fine. The blank
                border is trimmed off and the paper made see-through automatically. Under 2 MB.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t space-y-4">
            <h4 className="text-sm font-medium">Regional Settings</h4>

            {canEditRegional ? (
              <>
                <div className="space-y-2">
                  <Label>Fiscal Year Start</Label>
                  <Select value={fiscalYear} onValueChange={setFiscalYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTH_OPTIONS.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Fiscal Year Start</Label>
                  <Input
                    value={MONTH_OPTIONS.find((m) => String(m.value) === fiscalYear)?.label || fiscalYear}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Input
                    value={TIMEZONE_OPTIONS.find((tz) => tz.value === timezone)?.label || timezone}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input
                    value={CURRENCY_OPTIONS.find((c) => c.value === currency)?.label || currency}
                    disabled
                  />
                </div>
              </>
            )}
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
