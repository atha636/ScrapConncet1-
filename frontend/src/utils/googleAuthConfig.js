// Single source of truth for "is Google sign-in configured on this build" —
// used by both the button itself and the pages that decide whether to show
// the "or" divider around it, so the two can never disagree (e.g. a divider
// with nothing rendered beneath it).
export const hasGoogleAuth = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);