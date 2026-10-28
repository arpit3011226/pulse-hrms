import { supabase } from '@/lib/supabase'

/**
 * Files live in Azure Blob Storage, reached through the `files` function.
 *
 * Nothing outside this file knows that. Every caller still asks for a bucket
 * and a path, still gets a path back from an upload, and still gets a link
 * that expires — the same four functions, the same shapes. Moving from
 * Supabase Storage to Blob changed only what is below.
 *
 * Who may touch which file is not decided here, and must not be. Those rules
 * are `can_access_file()` in migration 00091, checked by the function with
 * the caller's own token, and covered by QA/scripts/file_access_guard.sh.
 */

/** The readable reason a function refused, rather than its status code. */
async function readFunctionError(error: unknown): Promise<string> {
  const e = error as { message: string; context?: Response }
  if (e.context && typeof e.context.json === 'function') {
    try {
      const body = await e.context.json()
      if (body?.error) return body.error as string
    } catch {
      // fall through to the generic message
    }
  }
  return e.message
}

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

  // Two steps, on purpose. The `files` function checks who you are and
  // whether this path is yours, then hands back a URL that works for ten
  // minutes. The browser then PUTs straight to storage — the bytes never
  // pass through the function, so there is no size limit to tune and no
  // chance of a document ending up in a log.
  const { data, error } = await supabase.functions.invoke('files', {
    body: { action: 'upload', bucket, path, contentType: file.type },
  })
  if (error) throw new Error(await readFunctionError(error))
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error)

  const { uploadUrl, headers } = data as { uploadUrl: string; headers?: Record<string, string> }
  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'x-ms-blob-type': 'BlockBlob', ...(headers ?? {}) },
    body: file,
  })
  if (!put.ok) throw new Error(`Upload failed (${put.status})`)

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

  const { data, error } = await supabase.functions.invoke('files', {
    body: { action: 'link', bucket, path },
  })
  // A refusal is a null, not a throw: every caller treats null as "cannot be
  // opened" and says so to the person, which is the right outcome whether the
  // file is missing or not theirs.
  if (error) return null
  return (data as { url?: string })?.url ?? null
}

export async function deleteFile(bucket: string, path: string) {
  const { data, error } = await supabase.functions.invoke('files', {
    body: { action: 'delete', bucket, path: storagePathFromUrl(bucket, path) },
  })
  if (error) throw new Error(await readFunctionError(error))
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error)
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
  const readUrl = await getSignedUrl(fromBucket, fromPath)
  if (!readUrl) return null

  const got = await fetch(readUrl)
  if (!got.ok) return null
  const blob = await got.blob()

  const { data, error } = await supabase.functions.invoke('files', {
    body: { action: 'upload', bucket: toBucket, path: toPath, contentType: blob.type },
  })
  if (error) throw new Error(await readFunctionError(error))

  const { uploadUrl, headers } = data as { uploadUrl: string; headers?: Record<string, string> }
  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'x-ms-blob-type': 'BlockBlob', ...(headers ?? {}) },
    body: blob,
  })
  if (!put.ok) throw new Error(`Copy failed (${put.status})`)
  return toPath
}
