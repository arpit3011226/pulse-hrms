import { supabase } from '@/lib/supabase'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FileValidationError'
  }
}

export function validateFile(file: File) {
  if (file.size > MAX_FILE_SIZE) {
    throw new FileValidationError(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum of 5MB`)
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new FileValidationError('Only JPG, PNG, and PDF files are allowed')
  }
}

export async function uploadFile(bucket: string, path: string, file: File): Promise<string> {
  validateFile(file)

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true })

  if (error) throw error

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
  return urlData.publicUrl
}

export async function deleteFile(bucket: string, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw error
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
