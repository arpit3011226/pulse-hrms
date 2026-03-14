import { useState, useRef } from 'react'
import { Upload, Download, FileText, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { createEmployee, generateNextEmployeeCode } from '../api/employees.api'
import { useQueryClient } from '@tanstack/react-query'

interface CsvUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ParsedRow {
  rowNum: number
  data: Record<string, string>
  errors: string[]
}

const CSV_TEMPLATE_HEADERS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'personal_email',
  'gender',
  'date_of_birth',
  'employment_type',
  'date_of_joining',
  'nationality',
  'pan_number',
  'aadhar_number',
  'father_name',
  'mother_name',
]

const REQUIRED_FIELDS = ['first_name', 'last_name', 'email']

function downloadTemplate() {
  const header = CSV_TEMPLATE_HEADERS.join(',')
  const sampleRow = [
    'John', 'Doe', 'john.doe@company.com', '+91 9876543210', 'john@gmail.com',
    'male', '1990-01-15', 'full_time', '2026-04-01', 'Indian', 'ABCDE1234F',
    '123456789012', 'Robert Doe', 'Mary Doe',
  ].join(',')
  const csv = `${header}\n${sampleRow}\n`
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'employee_upload_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const rows = lines.slice(1).map((line) => {
    // Simple CSV parsing (handles basic cases)
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue }
      if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue }
      current += char
    }
    values.push(current.trim())
    return values
  })
  return { headers, rows }
}

function validateRows(headers: string[], rows: string[][]): ParsedRow[] {
  return rows.map((values, idx) => {
    const data: Record<string, string> = {}
    headers.forEach((h, i) => { data[h] = values[i] || '' })
    const errors: string[] = []

    for (const field of REQUIRED_FIELDS) {
      if (!data[field]) errors.push(`Missing required field: ${field}`)
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format')
    }
    if (data.employment_type && !['full_time', 'part_time', 'contract', 'intern', 'probation'].includes(data.employment_type)) {
      errors.push(`Invalid employment_type: ${data.employment_type}`)
    }

    return { rowNum: idx + 2, data, errors }
  })
}

export function CsvUploadDialog({ open, onOpenChange }: CsvUploadDialogProps) {
  const { organization } = useAuth()
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [fileName, setFileName] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [results, setResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null)

  const validRows = parsedRows.filter((r) => r.errors.length === 0)
  const invalidRows = parsedRows.filter((r) => r.errors.length > 0)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResults(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const { headers, rows } = parseCSV(text)
      if (headers.length === 0) {
        toast.error('Invalid CSV file — no headers found')
        return
      }
      const missing = REQUIRED_FIELDS.filter((f) => !headers.includes(f))
      if (missing.length > 0) {
        toast.error(`Missing required columns: ${missing.join(', ')}`)
        return
      }
      setParsedRows(validateRows(headers, rows))
    }
    reader.readAsText(file)
  }

  const handleUpload = async () => {
    if (!organization) return
    setIsUploading(true)
    const errors: string[] = []
    let success = 0
    let currentCode = await generateNextEmployeeCode(organization.id)

    for (const row of validRows) {
      try {
        const payload: Record<string, unknown> = {
          organization_id: organization.id,
          employee_code: currentCode,
          status: 'active',
        }
        for (const [key, val] of Object.entries(row.data)) {
          if (val && CSV_TEMPLATE_HEADERS.includes(key)) {
            payload[key] = val
          }
        }
        await createEmployee(payload as any)
        success++
        // Increment the code number
        const num = parseInt(currentCode.replace('EMP-', ''), 10)
        currentCode = `EMP-${String(num + 1).padStart(4, '0')}`
      } catch (err) {
        errors.push(`Row ${row.rowNum}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    setResults({ success, failed: errors.length, errors })
    setIsUploading(false)
    queryClient.invalidateQueries({ queryKey: ['employees'] })
    queryClient.invalidateQueries({ queryKey: ['next-employee-code'] })
    if (success > 0) toast.success(`${success} employee(s) created successfully`)
    if (errors.length > 0) toast.error(`${errors.length} row(s) failed`)
  }

  const handleClose = () => {
    setParsedRows([])
    setFileName('')
    setResults(null)
    if (fileRef.current) fileRef.current.value = ''
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] flex flex-col mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Bulk Employee Upload
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to create multiple employees at once. Employee codes will be auto-generated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0">
          {/* Step 1: Download template */}
          <div className="flex items-center gap-3 rounded-lg border border-dashed p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Download className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Step 1: Download Template</p>
              <p className="text-xs text-muted-foreground">Get the CSV template with required columns</p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" /> Template
            </Button>
          </div>

          {/* Step 2: Upload CSV */}
          <div className="flex items-center gap-3 rounded-lg border border-dashed p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
              <FileText className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Step 2: Upload CSV File</p>
              {fileName ? (
                <p className="text-xs text-emerald-600 font-medium">{fileName} — {parsedRows.length} row(s) found</p>
              ) : (
                <p className="text-xs text-muted-foreground">Select your filled CSV file</p>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Choose File
            </Button>
          </div>

          {/* Validation results */}
          {parsedRows.length > 0 && !results && (
            <ScrollArea className="max-h-[30vh]">
              <div className="space-y-2">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" /> {validRows.length} valid
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="flex items-center gap-1 text-red-600">
                      <AlertCircle className="h-4 w-4" /> {invalidRows.length} with errors
                    </span>
                  )}
                </div>
                {invalidRows.map((row) => (
                  <div key={row.rowNum} className="rounded border border-red-200 bg-red-50 p-2 text-xs dark:bg-red-900/10 dark:border-red-800">
                    <span className="font-medium">Row {row.rowNum}:</span>{' '}
                    {row.errors.join('; ')}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Upload results */}
          {results && (
            <div className="space-y-2 rounded-lg border p-4">
              <p className="text-sm font-medium">Upload Complete</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> {results.success} created
                </span>
                {results.failed > 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    <X className="h-4 w-4" /> {results.failed} failed
                  </span>
                )}
              </div>
              {results.errors.length > 0 && (
                <ScrollArea className="max-h-24">
                  {results.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600">{err}</p>
                  ))}
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={handleClose}>
            {results ? 'Close' : 'Cancel'}
          </Button>
          {!results && (
            <Button
              onClick={handleUpload}
              disabled={validRows.length === 0 || isUploading}
            >
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload {validRows.length} Employee{validRows.length !== 1 ? 's' : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
