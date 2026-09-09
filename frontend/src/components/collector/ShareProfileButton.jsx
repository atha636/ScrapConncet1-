import { useState } from "react";

/**
 * Copies a collector's own public profile link (see routes/AppRoutes'
 * "/collector/:id" and the backend's /profile/public endpoint) to the
 * clipboard. Lives next to LeaderboardPanel in the Wallet tab — same place
 * a collector already checks their standing, so surfacing "here's your
 * shareable card" feels like a natural extension of it rather than a
 * separate feature to go find.
 */
export default function ShareProfileButton({ collectorId }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/collector/${collectorId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (older browser, permissions, non-HTTPS
      // context) — fall back to a prompt so the link is still obtainable
      // rather than the button silently doing nothing.
      window.prompt("Copy your profile link:", url);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="w-full flex items-center justify-center gap-2 px-3 py-2 mb-4 text-xs font-semibold text-inkSoft border border-line border-dashed rounded-ticket hover:border-rust/40 hover:text-rust transition-colors"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      {copied ? "Link copied!" : "Copy your profile link"}
    </button>
  );
}