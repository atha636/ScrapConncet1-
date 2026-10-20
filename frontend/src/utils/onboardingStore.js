// Per-user, per-browser memory for the onboarding checklist. localStorage can
// throw or be empty (private windows, blocked storage), so every access is
// wrapped and the checklist simply shows again if it can't remember.
const key = (name) => `onboarding:${name}`;

export function readFlag(name) {
  try {
    return localStorage.getItem(key(name)) === "1";
  } catch {
    return false;
  }
}

export function writeFlag(name) {
  try {
    localStorage.setItem(key(name), "1");
  } catch {
    /* nothing to do — the checklist just can't remember this */
  }
}