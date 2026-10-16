import { useState } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSignedUrl } from '@/lib/storage'
import { toast } from 'sonner'

/**
 * Opens a stored file through a link that expires.
 *
 * Documents used to be rendered as a plain anchor to a permanent public URL.
 * Both buckets were public, so those addresses worked for anybody at all —
 * no sign-in, no API key — which made the row-level security on storage
 * pointless. An employee's PAN card was one guessed URL away.
 *
 * The link is now minted when somebody actually clicks, and it lasts ten
 * minutes. If the person is not allowed the file, storage refuses and they are
 * told, rather than being sent to a broken tab.
 */
interface StoredFileLinkProps {
  bucket: string
  /** A storage path, or an old public URL from before the buckets were closed. */
  path: string | null | undefined
  children?: React.ReactNode
  className?: string
  /** Shown when there is no file. Nothing renders if this is absent. */
  emptyLabel?: string
}

export function StoredFileLink({
  bucket, path, children, className, emptyLabel,
}: StoredFileLinkProps) {
  const [opening, setOpening] = useState(false)

  if (!path) {
    return emptyLabel ? <span className="text-xs text-muted-foreground">{emptyLabel}</span> : null
  }

  async function open() {
    if (!path) return
    setOpening(true)
    try {
      const url = await getSignedUrl(bucket, path)
      if (!url) {
        toast.error('That file could not be opened. You may not have access to it.')
        return
      }
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open the file')
    } finally {
      setOpening(false)
    }
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={opening}
      className={cn(
        'inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline disabled:opacity-60',
        className
      )}
    >
      {opening ? <Loader2 className="h-3 w-3 animate-spin" /> : children ?? <ExternalLink className="h-3 w-3" />}
      {opening && <span className="text-xs">Opening…</span>}
    </button>
  )
}
