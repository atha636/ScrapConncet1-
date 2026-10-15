import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import useDocumentMeta from "../hooks/useDocumentMeta";
import { getPublicTrip } from "../services/safetyService";
import { formatSlot } from "../utils/pickupSlots";

const POLL_MS = 15000;

const HEADLINE = {
  accepted: "Collector is on the way",
  in_progress: "Pickup in progress",
  completed: "Pickup completed — all done",
  cancelled: "This pickup was cancelled",
};

function ago(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s ago`;
  return `${Math.round(s / 60)} min ago`;
}

export default function TripShare() {
  useDocumentMeta({ title: "Live pickup", noindex: true });
  const { token } = useParams();
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState("");
  const [seenText, setSeenText] = useState("");
  const [maxKm, setMaxKm] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () =>
      getPublicTrip(token)
        .then((res) => {
          if (!alive) return;
          const data = res.data;
          setTrip(data);
          setError("");
          if (data.distanceKm != null) setMaxKm((m) => Math.max(m, data.distanceKm));
          setSeenText(data.lastLocation?.at ? ago(Date.now() - new Date(data.lastLocation.at).getTime()) : "");
        })
        .catch((err) => {
          if (!alive) return;
          setError(err.response?.status === 404 ? "This link isn't active anymore." : "Couldn't load this trip. Retrying…");
        });
    load();
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, [token]);

  const progress = trip?.live && trip.distanceKm != null && maxKm > 0 ? Math.min(1, Math.max(0, 1 - trip.distanceKm / maxKm)) : trip && !trip.live && trip.status === "completed" ? 1 : 0;
  const loc = trip?.lastLocation;

  return (
    <div className="min-h-screen">
      <header className="bg-surface border-b border-line">
        <div className="max-w-md mx-auto px-5 h-14 flex items-center">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo-mark.png" alt="" className="w-7 h-7 rounded-md rotate-[-3deg]" />
            <span className="font-display font-bold text-ink">ScrapConnect</span>
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 py-8">
        {!trip && !error && <p className="text-center text-inkSoft text-sm">Loading trip…</p>}
        {error && !trip && <div className="ticket p-6 text-center text-inkSoft">{error}</div>}

        {trip && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="ticket p-5">
            <p className="text-[11px] font-mono tracking-wide text-inkFaint mb-1">SHARED PICKUP</p>
            <h1 className="font-display text-xl font-bold text-ink mb-1 flex items-center gap-2">
              {trip.live && (
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inset-0 rounded-full bg-rust animate-ping opacity-60" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-rust" />
                </span>
              )}
              {HEADLINE[trip.status] || "Pickup"}
            </h1>
            <p className="text-sm text-inkSoft mb-5">
              {trip.collectorName ? `${trip.collectorName} is collecting ${trip.scrapType} scrap.` : `A collector is assigned for ${trip.scrapType} scrap.`}
              {trip.slot?.start && ` Window: ${formatSlot(trip.slot)}.`}
            </p>

            {/* Route progress: the marker slides toward the destination as the collector gets closer. */}
            <div className="relative mb-2 h-8">
              <div className="absolute top-1/2 left-2 right-2 h-0.5 -translate-y-1/2 bg-line" />
              <motion.div
                className="absolute top-1/2 left-2 right-2 h-0.5 -translate-y-1/2 bg-rust origin-left"
                initial={false}
                animate={{ scaleX: progress }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
              <motion.div
                className="absolute top-1/2 left-2 w-4 h-4 -mt-2 rounded-full bg-rust border-2 border-surface shadow"
                initial={false}
                animate={{ left: `calc(0.5rem + (100% - 1.5rem) * ${progress})` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
              <div className="absolute top-1/2 right-0 w-4 h-4 -mt-2 rounded-full border-2 border-rust bg-surface" />
            </div>
            <div className="flex justify-between text-[11px] text-inkFaint mb-5">
              <span>Collector</span>
              <span>Pickup point</span>
            </div>

            {trip.live ? (
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <div className="rounded-lg border border-line bg-surface px-3 py-2.5">
                  <div className="text-[11px] text-inkFaint">Arrives in</div>
                  <div className="font-display font-bold text-ink">{trip.etaMinutes != null ? `~${trip.etaMinutes} min` : "—"}</div>
                </div>
                <div className="rounded-lg border border-line bg-surface px-3 py-2.5">
                  <div className="text-[11px] text-inkFaint">Distance</div>
                  <div className="font-display font-bold text-ink">{trip.distanceKm != null ? `${trip.distanceKm} km` : "—"}</div>
                </div>
              </div>
            ) : null}

            {loc ? (
              <a
                href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary !py-2 text-sm w-full text-center block"
              >
                See collector on map{seenText ? ` · updated ${seenText}` : ""}
              </a>
            ) : (
              trip.live && <p className="text-xs text-inkFaint text-center">Waiting for the collector's location…</p>
            )}

            <p className="text-[11px] text-inkFaint text-center mt-4">
              This page refreshes automatically. The link stops working a few hours after the pickup ends or if the person stops sharing.
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}