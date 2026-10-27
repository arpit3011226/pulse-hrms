/**
 * Kept so existing imports keep working. The one place that reads the
 * environment is now src/lib/config.ts — put new settings there, not here.
 */
export { publicAppLink, config } from './config'
export { config as appConfig } from './config'

import { config } from './config'

/** The address Pulse is reachable at, for links we put in front of others. */
export function publicAppUrl(): string {
  return config.publicAppUrl
}

/** True when links would point somewhere only this machine can reach. */
export function appUrlIsLocal(): boolean {
  return config.linksArePrivate
}
