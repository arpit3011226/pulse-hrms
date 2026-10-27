import { supabase } from '@/lib/supabase'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']

/** How long a link to a document stays good for. Long enough to open and read. */
const SIGNED_URL_SECONDS = 60 * 10

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FileValidationError'
  }
}

/**
 * Checked here for a good error message, and again by the bucket itself.
 *
 * This function is a courtesy, not a control: anything posting straight to the
 * storage API skips it. The bucket now carries its own size limit and allowed
 * types, which is the check that actually holds.
 */
export function validateFile(file: File) {
  if (file.size > MAX_FILE_SIZE) {
    throw new FileValidationError(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum of 5MB`)
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new FileValidationError('Only JPG, PNG, and PDF files are allowed')
  }
}

/**
 * Store a file and return its PATH, not a URL.
 *
 * It used to return getPublicUrl(), and that URL was written into the database
 * and rendered straight into an anchor. Both buckets were public, so those
 * links worked for anybody at all — no sign-in, no API key. An employee's PAN
 * card was fetchable by anyone who had or guessed the address, which defeated
 * the row-level security on storage.objects entirely.
 *
 * The path is the durable thing worth keeping. A link is minted when somebody
 * actually opens the file, and expires.
 */
export async function uploadFile(bucket: string, path: string, file: File): Promise<string> {
  validateFile(file)

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true })

  if (error) throw error
  return path
}

/**
 * The storage path for something that may be a path or an old public URL.
 *
 * Rows written before the buckets were closed hold a full public URL. Rather
 * than rewrite that data, the path is recovered from it, so old and new rows
 * both open.
 */
export function storagePathFromUrl(bucket: string, value: string): string {
  if (!value) return value
  const marker = `/storage/v1/object/public/${bucket}/`
  const at = value.indexOf(marker)
  if (at !== -1) return decodeURIComponent(value.slice(at + marker.length))
  // Some rows hold the signed form instead.
  const signed = `/storage/v1/object/sign/${bucket}/`
  const atSigned = value.indexOf(signed)
  if (atSigned !== -1) return decodeURIComponent(value.slice(atSigned + signed.length).split('?')[0])
  return value
}

/**
 * A short-lived link to a stored file.
 *
 * Returns null when the file cannot be reached — which, for a private bucket,
 * is what a person without permission gets. The caller should say so rather
 * than opening a broken tab.
 */
export async function getSignedUrl(bucket: string, pathOrUrl: string): Promise<string | null> {
  const path = storagePathFromUrl(bucket, pathOrUrl)
  if (!path) return null

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_SECONDS)

  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

export async function deleteFile(bucket: string, path: string) {
  const { error } = await supabase.storage.from(bucket).remove([storagePathFromUrl(bucket, path)])
  if (error) throw error
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Move a copy of a file from one bucket to another.
 *
 * Used when a candidate joins: what they uploaded before starting becomes part
 * of their employee record, so nobody is asked for the same certificate twice.
 *
 * Done by reading and writing rather than a server-side copy, because the two
 * buckets have different owners and different rules — candidate-documents is
 * keyed by candidate, employee-documents by employee. It also keeps the whole
 * operation inside this one adapter, which is the file that gets rewritten
 * when Pulse moves to Azure Blob.
 *
 * Returns the new path, or null if the source could not be read.
 */
export async function copyBetweenBuckets(
  fromBucket: string,
  fromPath: string,
  toBucket: string,
  toPath: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(fromBucket)
    .download(storagePathFromUrl(fromBucket, fromPath))

  if (error || !data) return null

  const { error: upErr } = await supabase.storage
    .from(toBucket)
    .upload(toPath, data, { upsert: true })

  if (upErr) throw upErr
  return toPath
}
