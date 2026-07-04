import { useCallback, useEffect, useState } from "react";
import {
  getAvailable,
  getCollectorJobs,
  acceptPickup,
  updateStatus,
} from "../../services/pickupService";
import useSocket from "../../hooks/useSocket";
import Card from "../../components/ui/Card";
import Loader from "../../components/common/Loader";
import ErrorBox from "../../components/common/ErrorBox";
import StatusStamp from "../../components/ui/StatusStamp";
import { formatPrice } from "../../utils/formatPrice";

const NEXT_ACTION = {
  accepted: { label: "Start pickup", next: "in_progress" },
  in_progress: { label: "Mark completed", next: "completed" },
};

export default function CollectorDashboard() {
  const [tab, setTab] = useState("available");
  const [available, setAvailable] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [a, m] = await Promise.all([
        getAvailable({ limit: 20 }),
        getCollectorJobs({ limit: 20 }),
      ]);
      setAvailable(a.data.data);
      setMyJobs(m.data.data);
    } catch {
      setError("Couldn't load pickups. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // New request comes in -> add it to the available list live
  useSocket("newPickup", (pickup) => {
    setAvailable((prev) => [pickup, ...prev]);
  });

  // Any pickup updated (by this collector or another) -> reconcile both lists
  useSocket("updatePickup", (updated) => {
    setAvailable((prev) => prev.filter((p) => p._id !== updated._id));
    setMyJobs((prev) => {
      const exists = prev.some((p) => p._id === updated._id);
      return exists ? prev.map((p) => (p._id === updated._id ? updated : p)) : prev;
    });
  });

  const handleAccept = async (id) => {
    setActingId(id);
    try {
      const res = await acceptPickup(id);
      setAvailable((prev) => prev.filter((p) => p._id !== id));
      setMyJobs((prev) => [res.data, ...prev]);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't accept this pickup — it may already be taken.");
    } finally {
      setActingId(null);
    }
  };

  const handleAdvance = async (id, next) => {
    setActingId(id);
    try {
      const res = await updateStatus(id, next);
      setMyJobs((prev) => prev.map((p) => (p._id === id ? res.data : p)));
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't update the status.");
    } finally {
      setActingId(null);
    }
  };

  const activeJobs = myJobs.filter((j) => ["accepted", "in_progress"].includes(j.status));
  const pastJobs = myJobs.filter((j) => ["completed", "cancelled"].includes(j.status));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Collector dashboard</h1>
      <p className="text-sm text-inkSoft mb-6">Pick up nearby scrap and manage your jobs.</p>

      <div className="flex gap-1 mb-6 border-b border-line">
        {[
          { key: "available", label: `Available (${available.length})` },
          { key: "mine", label: `My jobs (${activeJobs.length})` },
          { key: "history", label: `History (${pastJobs.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? "border-rust text-rust" : "border-transparent text-inkSoft hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="mb-5"><ErrorBox>{error}</ErrorBox></div>}

      {loading ? (
        <Loader />
      ) : (
        <div className="space-y-3">
          {tab === "available" && (
            available.length === 0 ? (
              <Card className="p-10 text-center text-inkSoft">No pickups available right now — check back soon.</Card>
            ) : (
              available.map((item) => (
                <Card key={item._id} className="p-5 pt-6 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex gap-4">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.scrapType}
                        className="w-16 h-16 rounded-md object-cover shrink-0 border border-line"
                      />
                    )}
                    <div>
                      <div className="font-display font-semibold text-ink capitalize">
                        {item.scrapType}{item.estimatedWeightKg ? ` · ${item.estimatedWeightKg}kg` : ""}
                      </div>
                      <div className="text-xs text-inkFaint mt-0.5">
                        {item.location?.address || `${item.location.lat.toFixed(3)}, ${item.location.lng.toFixed(3)}`}
                      </div>
                      {item.user?.name && <div className="text-xs text-inkSoft mt-1">Requested by {item.user.name}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-ink">{formatPrice(item.price)}</span>
                    <button
                      onClick={() => handleAccept(item._id)}
                      disabled={actingId === item._id}
                      className="btn-primary !py-2 !px-4 text-sm"
                    >
                      {actingId === item._id ? "Accepting…" : "Accept"}
                    </button>
                  </div>
                </Card>
              ))
            )
          )}

          {tab === "mine" && (
            activeJobs.length === 0 ? (
              <Card className="p-10 text-center text-inkSoft">No active jobs — accept a pickup to get started.</Card>
            ) : (
              activeJobs.map((item) => {
                const action = NEXT_ACTION[item.status];
                return (
                  <Card key={item._id} className="p-5 pt-6 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex gap-4">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.scrapType}
                          className="w-16 h-16 rounded-md object-cover shrink-0 border border-line"
                        />
                      )}
                      <div>
                        <div className="font-display font-semibold text-ink capitalize">{item.scrapType}</div>
                        {item.user?.name && <div className="text-xs text-inkSoft mt-1">For {item.user.name}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusStamp status={item.status} />
                      {action && (
                        <button
                          onClick={() => handleAdvance(item._id, action.next)}
                          disabled={actingId === item._id}
                          className="btn-primary !py-2 !px-4 text-sm"
                        >
                          {actingId === item._id ? "Updating…" : action.label}
                        </button>
                      )}
                    </div>
                  </Card>
                );
              })
            )
          )}

          {tab === "history" && (
            pastJobs.length === 0 ? (
              <Card className="p-10 text-center text-inkSoft">No completed jobs yet.</Card>
            ) : (
              pastJobs.map((item) => (
                <Card key={item._id} className="p-4 pt-5 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex gap-4">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.scrapType}
                        className="w-12 h-12 rounded-md object-cover shrink-0 border border-line"
                      />
                    )}
                    <div className="font-medium text-ink capitalize self-center">{item.scrapType}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-ink">{formatPrice(item.price)}</span>
                    <StatusStamp status={item.status} />
                  </div>
                </Card>
              ))
            )
          )}
        </div>
      )}
    </div>
  );
}