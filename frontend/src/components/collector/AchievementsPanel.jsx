import { useEffect, useState } from "react";
import { getMyAchievements } from "../../services/pickupService";

/**
 * The locked/unlocked counterpart to BadgeRow — that component shows what
 * a collector *has* (on their profile, to anyone looking), this shows the
 * full catalog including what's still locked and how close they are,
 * visible only to the collector themselves. Lives in the Wallet tab next
 * to LeaderboardPanel and ShareProfileButton, same place a collector
 * already checks their own standing.
 */
export default function AchievementsPanel() {
  const [state, setState] = useState({ status: "loading", achievements: [] });

  useEffect(() => {
    let cancelled = false;
    getMyAchievements()
      .then((res) => {
        if (!cancelled) setState({ status: "ready", achievements: res.data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", achievements: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-ticket bg-line/30 animate-pulse" />
        ))}
      </div>
    );
  }

  // Fails quietly, same reasoning as CollectorProfileCard/LeaderboardPanel
  // — this is supplementary context for the Wallet tab, not something that
  // should ever visibly break the page if the lookup fails.
  if (state.status === "error" || state.achievements.length === 0) return null;

  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-inkFaint uppercase tracking-wide mb-2">Achievements</h3>
      <div className="grid grid-cols-2 gap-2">
        {state.achievements.map((a) => (
          <div
            key={a.id}
            className={`p-2.5 rounded-ticket border text-xs ${
              a.earned ? "border-rust/25 bg-rust/[0.05]" : "border-line bg-surfaceRaised"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className={`leading-none text-sm ${a.earned ? "" : "grayscale opacity-40"}`}>{a.icon}</span>
              <span className={`font-semibold truncate ${a.earned ? "text-ink" : "text-inkSoft"}`}>{a.label}</span>
            </div>

            {a.earned ? (
              <div className="text-inkFaint mt-1">Unlocked</div>
            ) : a.target != null ? (
              <>
                <div className="h-1.5 rounded-full bg-line/50 mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-rust/50 rounded-full"
                    style={{ width: `${Math.min(100, (a.current / a.target) * 100)}%` }}
                  />
                </div>
                <div className="text-inkFaint mt-1">
                  {a.current}/{a.target}
                </div>
              </>
            ) : (
              <div className="text-inkFaint mt-1 leading-snug">{a.hint}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}