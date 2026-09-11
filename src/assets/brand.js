// Logos imported as modules, not referenced as "/axis-finance-logo.png".
//
// A root-absolute path only resolves when the app is served from the domain
// root; hosted under a sub-path it 404s and the sidebar renders empty. Going
// through the bundler makes the URL relative to the configured base and gives
// the file a content hash, so a stale cached copy can never win either.
import wordmarkUrl from './axis-finance-logo.png'
import iconUrl from './axis-icon.png'

export const LOGO_WORDMARK = wordmarkUrl
export const LOGO_ICON = iconUrl

/** Paints the maroon artwork white for use on the brand-gradient surfaces. */
export const LOGO_ON_DARK = { filter: 'brightness(0) invert(1)' }
