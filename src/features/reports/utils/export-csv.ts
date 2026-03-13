interface CsvColumn<T> {
  header: string
  accessor: (row: T) => string | number | null | undefined
}

export function exportToCSV<T>(data: T[], columns: CsvColumn<T>[], filename: string) {
  const headers = columns.map((c) => c.header)
  const rows = data.map((row) =>
    columns.map((col) => {
      const val = col.accessor(row)
      if (val == null) return ''
      const str = String(val)
      // Escape quotes and wrap in quotes if contains comma/quote/newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    })
  )

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
