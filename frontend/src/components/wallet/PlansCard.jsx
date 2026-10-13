import { useCallback, useEffect, useState } from "react";
import Card from "../ui/Card";
import Loader from "../common/Loader";
import ErrorBox from "../common/ErrorBox";
import { formatPrice } from "../../utils/formatPrice";
import { getPlans, subscribeToPlan } from "../../services/planService";

const fmtDate = (iso) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// Collector-facing plans: what each costs, the commission it carries, and a
// pay-from-wallet button. Commission only applies once the platform turns it
// on, and the card says so honestly until then.
export default function PlansCard({ onPurchased }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    getPlans()
      .then((res) => setData(res.data))
      .catch(() => setError("Couldn't load plans."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const buy = async (plan) => {
    setBusy(plan.key);
    setError("");
    try {
      await subscribeToPlan(plan.key);
      load();
      onPurchased?.();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't activate the plan.");
    } finally {
      setBusy(null);
    }
  };

  if (!data) return error ? <ErrorBox>{error}</ErrorBox> : <Loader />;

  const current = data.current.planKey;

  return (
    <Card className="p-5 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
        <h3 className="font-display font-semibold text-ink text-sm">Your plan</h3>
        {current !== "free" && (
          <span className="text-xs text-inkSoft">Active until {fmtDate(data.current.expiresAt)}</span>
        )}
      </div>
      <p className="text-xs text-inkSoft mb-4">
        {data.commissionEnabled
          ? "ScrapConnect keeps a small commission from each completed pickup. Higher plans keep less."
          : "No commission is being charged right now. Plans take effect when commission starts."}
      </p>

      {error && (
        <div className="mb-3">
          <ErrorBox>{error}</ErrorBox>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-3">
        {data.plans.map((p) => {
          const isCurrent = p.key === current;
          const short = data.available < p.priceMonthly;
          return (
            <div key={p.key} className={`rounded-ticket border p-4 ${isCurrent ? "border-rust/60 bg-rust/[0.05]" : "border-line"}`}>
              <p className="font-display font-bold text-ink">{p.name}</p>
              <p className="text-2xl font-bold text-rust mt-1">
                {p.priceMonthly === 0 ? "Free" : formatPrice(p.priceMonthly)}
                {p.priceMonthly > 0 && <span className="text-xs font-normal text-inkSoft"> / {data.days} days</span>}
              </p>
              <p className="text-sm text-ink mt-2">{p.commissionPct}% commission</p>
              <div className="mt-3">
                {isCurrent ? (
                  <span className="text-xs font-semibold text-rust">{p.key === "free" ? "Your current plan" : "Current plan"}</span>
                ) : p.key === "free" ? (
                  <span className="text-xs text-inkFaint">Applies when a paid plan ends</span>
                ) : (
                  <>
                    <button
                      onClick={() => buy(p)}
                      disabled={busy !== null || short}
                      className="btn-primary !py-1.5 !px-3 text-xs disabled:opacity-50"
                    >
                      {busy === p.key ? "Activating…" : current === "free" ? "Pay from wallet" : `Switch to ${p.name}`}
                    </button>
                    {short && (
                      <p className="text-[11px] text-inkFaint mt-1.5">
                        Wallet {formatPrice(data.available)} — need {formatPrice(p.priceMonthly - data.available)} more
                      </p>
                    )}
                  </>
                )}
                {isCurrent && p.key !== "free" && (
                  <button
                    onClick={() => buy(p)}
                    disabled={busy !== null || short}
                    className="block mt-2 text-xs font-semibold text-rust disabled:opacity-50"
                  >
                    {busy === p.key ? "Renewing…" : `Renew +${data.days} days`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-inkFaint mt-3">
        Paid from your wallet balance. Switching plans starts the new one now; unused days of the old plan aren't carried over. Paid outside the app? Ask an admin to activate it.
      </p>
    </Card>
  );
}