import { useEffect, useState } from "react";
import Card from "../ui/Card";
import { getMyReferrals } from "../../services/referralService";

/**
 * A user's invite code, shareable link, reward total, and the list of
 * people they've referred. Shown on the shared Profile page for every
 * role — anyone can refer anyone (see referralController), though only a
 * collector-role referrer has a wallet for the cash reward to land in,
 * which is why the reward line below only renders when there's actually
 * something to show.
 */
export default function ReferralCard() {
  const [state, setState] = useState({ status: "loading", data: null });
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getMyReferrals()
      .then((res) => {
        if (!cancelled) setState({ status: "ready", data: res.data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", data: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const inviteLink = state.data ? `${window.location.origin}/register?ref=${state.data.code}` : "";

  const copy = async (text, which) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard can fail on older browsers, denied permissions, or a
      // non-HTTPS context — fall back to a prompt so the value is still
      // obtainable rather than the button silently doing nothing (same
      // approach as ShareProfileButton).
      window.prompt("Copy this:", text);
    }
  };

  // Fails quietly — supplementary content on an account page, not
  // something that should visibly break Profile if the lookup fails.
  if (state.status === "error") return null;

  return (
    <Card className="p-6 sm:p-8">
      <h2 className="font-display font-semibold text-ink mb-1.5">Invite friends</h2>
      <p className="text-sm text-inkSoft mb-5">
        Share your code. When someone you invite completes their first pickup, you both become part of the
        ScrapConnect community — and collectors earn a bonus.
      </p>

      {state.status === "loading" && (
        <div className="space-y-3">
          <div className="h-11 rounded-ticket bg-line/30 animate-pulse" />
          <div className="h-4 w-1/3 rounded bg-line/30 animate-pulse" />
        </div>
      )}

      {state.status === "ready" && state.data && (
        <>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-2.5 rounded-ticket border border-dashed border-line bg-surfaceRaised font-mono font-semibold text-ink tracking-widest text-center">
              {state.data.code}
            </div>
            <button
              onClick={() => copy(state.data.code, "code")}
              className="px-3 py-2.5 text-xs font-semibold text-inkSoft border border-line rounded-ticket hover:border-rust/40 hover:text-rust transition-colors shrink-0"
            >
              {copied === "code" ? "Copied!" : "Copy"}
            </button>
          </div>

          <button
            onClick={() => copy(inviteLink, "link")}
            className="w-full mt-2 py-2 text-xs font-semibold text-rust border border-dashed border-rust/30 rounded-ticket hover:bg-rust/[0.04] transition-colors"
          >
            {copied === "link" ? "Invite link copied!" : "Copy invite link"}
          </button>

          {state.data.totalRewardEarned > 0 && (
            <div className="mt-4 pt-4 border-t border-dashed border-line text-sm text-inkSoft">
              You've earned <span className="font-semibold text-ink">₹{state.data.totalRewardEarned}</span> from
              referrals
            </div>
          )}

          {state.data.referrals.length > 0 && (
            <div className="mt-4 pt-4 border-t border-dashed border-line space-y-2">
              <div className="text-xs font-semibold text-inkFaint uppercase tracking-wide">
                {state.data.referrals.length} invited
              </div>
              {state.data.referrals.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-ink truncate">{r.refereeName}</span>
                  <span
                    className={`text-xs shrink-0 ${r.status === "completed" ? "text-rust font-semibold" : "text-inkFaint"}`}
                  >
                    {r.status === "completed"
                      ? r.rewardAmount > 0
                        ? `+₹${r.rewardAmount}`
                        : "Completed"
                      : "Pending first pickup"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}