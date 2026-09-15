// A short two-tone chime synthesized with the Web Audio API rather than an
// audio file — no asset to bundle, host, or lose track of between commits
// (this codebase has had more than one delivered-file-went-missing
// incident already), and it's a handful of lines either way.

const STORAGE_KEY = "notificationSoundMuted";

let audioCtx = null;
function getAudioContext() {
  if (audioCtx) return audioCtx;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  audioCtx = new Ctx();
  return audioCtx;
}

export function isNotificationSoundMuted() {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function setNotificationSoundMuted(muted) {
  localStorage.setItem(STORAGE_KEY, muted ? "true" : "false");
}

/**
 * Plays a brief, gentle two-note chime (880Hz -> 1175Hz) for incoming
 * notifications. Every failure mode here is swallowed rather than thrown —
 * a browser blocking audio before the user has interacted with the page,
 * an unsupported browser, a suspended context — none of that should ever
 * surface as a visible error for what's a pure nice-to-have.
 */
export function playNotificationSound() {
  if (isNotificationSoundMuted()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Browsers suspend a freshly created (or backgrounded-tab) context
    // until a user gesture resumes it — by the time a notification
    // arrives the person has almost always already interacted with the
    // page, so this resolves immediately in practice. If it's ever
    // rejected (no prior gesture yet), the catch below just skips the
    // sound for this one notification rather than erroring.
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const now = ctx.currentTime;
    const notes = [
      { freq: 880, start: 0, duration: 0.11 },
      { freq: 1175, start: 0.09, duration: 0.15 },
    ];

    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = note.freq;

      // Quick fade in/out on each note (not a hard on/off) — avoids the
      // audible click a sudden gain jump produces, and keeps the overall
      // chime soft rather than harsh.
      const noteStart = now + note.start;
      const noteEnd = noteStart + note.duration;
      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(0.15, noteStart + 0.015);
      gain.gain.linearRampToValueAtTime(0, noteEnd);

      osc.connect(gain).connect(ctx.destination);
      osc.start(noteStart);
      osc.stop(noteEnd);
    }
  } catch {
    // See function comment — sound is strictly cosmetic.
  }
}