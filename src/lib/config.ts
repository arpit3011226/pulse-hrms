/**
 * Everything Pulse needs told about the environment it is running in.
 *
 * ONE FILE. If you are porting Pulse somewhere — a staging box, production,
 * Azure — this is the only place that reads the environment, and the list
 * below is the whole of it. Nothing else in the codebase touches
 * import.meta.env.
 *
 * Set these as environment variables where the app is built or served. Vite
 * reads `.env.local` in development; a deployment sets them in its own way.
 *
 *   VITE_SUPABASE_URL        required   the backend
 *   VITE_SUPABASE_ANON_KEY   required   the public key for that backend
 *   VITE_PUBLIC_APP_URL      strongly   the address people type to reach Pulse
 *                            advised
 *   VITE_SSO_ENABLED         optional   'true' once company sign-on works
 *   VITE_SSO_DOMAIN          optional   e.g. augustinnovate.com, so Google only
 *                                       offers company accounts
 *
 * The one that bites quietly is VITE_PUBLIC_APP_URL. Set-password invitations
 * and alumni reactivation links are built from it. Leave it unset and they
 * are built from whatever the person generating them happens to be browsing
 * — http://localhost:5173 on a developer's machine. The link looks completely
 * normal and reaches nobody, so nothing goes wrong until a real candidate
 * says the link is broken.
 *
 * `problems()` exists so the app can say that out loud rather than wait for
 * somebody to notice.
 */

function env(name: string): string {
  return ((import.meta.env as Record<string, string | undefined>)[name] ?? '').trim()
}

const LOCAL_HOST = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|$)/

export const config = {
  supabaseUrl: env('VITE_SUPABASE_URL'),
  supabaseAnonKey: env('VITE_SUPABASE_ANON_KEY'),

  /** The address people actually reach Pulse at. */
  get publicAppUrl(): string {
    const configured = env('VITE_PUBLIC_APP_URL')
    if (configured) return configured.replace(/\/+$/, '')
    // Falls back so local development needs no setup at all.
    return typeof window !== 'undefined' ? window.location.origin : ''
  },

  /** Whether to offer company sign-on. Off until the provider genuinely works. */
  get ssoEnabled(): boolean {
    return env('VITE_SSO_ENABLED') === 'true'
  },

  /**
   * The company's Google Workspace domain, e.g. augustinnovate.com.
   *
   * Passed to Google as `hd` so the account chooser only offers company
   * accounts. A hint, not a control — somebody can still get past it, and
   * mayUseGoogle() is what actually stops them.
   */
  get ssoDomain(): string {
    return env('VITE_SSO_DOMAIN')
  },

  /** True when the app is being served from a developer's own machine. */
  get isLocal(): boolean {
    return LOCAL_HOST.test(
      typeof window !== 'undefined' ? window.location.origin : ''
    )
  },

  /** True when links we hand to other people would point somewhere private. */
  get linksArePrivate(): boolean {
    return LOCAL_HOST.test(this.publicAppUrl)
  },
}

/** A link into Pulse that is safe to send to somebody else. */
export function publicAppLink(path: string): string {
  return `${config.publicAppUrl}${path.startsWith('/') ? path : `/${path}`}`
}

export interface ConfigProblem {
  setting: string
  says: string
  fix: string
}

/**
 * What is misconfigured, in words an administrator can act on.
 *
 * Deliberately silent while running locally: a developer does not need to be
 * told that localhost is localhost. It speaks up when Pulse is served from a
 * real address and the links it hands out would still point at a machine
 * nobody else can reach.
 */
export function problems(): ConfigProblem[] {
  const found: ConfigProblem[] = []

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    found.push({
      setting: 'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY',
      says: 'Pulse has not been told where its backend is.',
      fix: 'Set both before building.',
    })
  }

  if (!config.isLocal && config.linksArePrivate) {
    found.push({
      setting: 'VITE_PUBLIC_APP_URL',
      says:
        'Invitation and reactivation links are being built with a localhost address, so anybody you send one to cannot open it.',
      fix: `Set VITE_PUBLIC_APP_URL to ${typeof window !== 'undefined' ? window.location.origin : 'the address people use'} and rebuild.`,
    })
  }

  return found
}
