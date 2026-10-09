import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Loader from "../components/common/Loader";
import ErrorBox from "../components/common/ErrorBox";
import useDocumentMeta from "../hooks/useDocumentMeta";
import { getReceipt } from "../services/receiptService";
import { SCRAP_TYPE_LABELS } from "../utils/pickupItems";
import { formatPrice } from "../utils/formatPrice";

const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm py-1.5">
      <span className="text-inkSoft">{label}</span>
      <span className="text-ink text-right">{children}</span>
    </div>
  );
}

// Printable summary of a completed pickup. "Save as PDF" is the browser's
// own print dialog — no PDF library, and the buttons/nav are hidden in print.
export default function Receipt() {
  useDocumentMeta({ title: "Receipt", noindex: true });
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getReceipt(id)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load this receipt."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loader />;
  if (error) {
    return (
      <div className="max-w-xl mx-auto">
        <ErrorBox>{error}</ErrorBox>
        <Link to="/" className="text-sm text-rust underline mt-3 inline-block">
          Back to home
        </Link>
      </div>
    );
  }

  const variance = data.finalPrice !== null ? data.finalPrice - data.agreedPrice : null;

  return (
    <div className="max-w-xl mx-auto">
      <Card className="p-6">
        <div className="flex items-center justify-between gap-4 border-b border-line pb-4 mb-4">
          <div className="flex items-center gap-3">
            <img src="/logo-mark.png" alt="" className="w-10 h-10 rounded-md" />
            <div>
              <div className="font-display text-lg font-bold text-ink leading-tight">ScrapConnect</div>
              <div className="text-xs text-inkSoft">Digital receipt</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-inkFaint">Receipt no.</div>
            <div className="font-mono text-sm text-ink">{data.receiptNo}</div>
          </div>
        </div>

        {!data.isFinal && (
          <div className="mb-4 rounded-md border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-ink">
            Provisional — the final amount isn't confirmed yet
            {data.settlementStatus === "disputed" ? " (this pickup is under dispute)." : " (waiting for the requester to confirm the weighed amount)."}
          </div>
        )}

        <Row label="Requester">{data.requester || "—"}</Row>
        <Row label="Collector">
          {data.collector ? (
            <>
              {data.collector.name}
              {data.collector.ratingCount > 0 && (
                <span className="text-inkFaint"> · ⭐ {Number(data.collector.rating).toFixed(1)}</span>
              )}
            </>
          ) : (
            "—"
          )}
        </Row>
        {data.address && <Row label="Pickup address">{data.address}</Row>}
        <Row label="Completed">{fmtDateTime(data.timeline.completed)}</Row>

        <h2 className="text-sm font-semibold text-ink mt-5 mb-2">What was collected</h2>
        <div className="border border-line rounded-md divide-y divide-line">
          <div className="grid grid-cols-3 px-3 py-2 text-xs text-inkFaint">
            <span>Material</span>
            <span className="text-right">Estimated</span>
            <span className="text-right">Weighed</span>
          </div>
          {data.lines.map((l, i) => (
            <div key={i} className="grid grid-cols-3 px-3 py-2 text-sm text-ink">
              <span>{SCRAP_TYPE_LABELS[l.scrapType] || l.scrapType}</span>
              <span className="text-right text-inkSoft">{l.estimatedKg != null ? `${l.estimatedKg} kg` : "—"}</span>
              <span className="text-right">{l.actualKg != null ? `${l.actualKg} kg` : "—"}</span>
            </div>
          ))}
        </div>

        <h2 className="text-sm font-semibold text-ink mt-5 mb-1">Payment</h2>
        <Row label="Agreed price">{formatPrice(data.agreedPrice)}</Row>
        {variance !== null && variance !== 0 && (
          <Row label="Adjusted for weighed amount">
            {variance > 0 ? "+" : "−"}
            {formatPrice(Math.abs(variance))}
          </Row>
        )}
        <div className="flex items-center justify-between border-t border-line mt-2 pt-3">
          <span className="text-sm font-semibold text-ink">{data.isFinal ? "Final amount" : "Proposed amount"}</span>
          <span className="font-display text-2xl font-bold text-rust">
            {formatPrice(data.isFinal ? data.finalPrice : data.proposedPrice ?? data.agreedPrice)}
          </span>
        </div>

        <h2 className="text-sm font-semibold text-ink mt-5 mb-2">Timeline</h2>
        <Row label="Requested">{fmtDateTime(data.timeline.requested)}</Row>
        <Row label="Accepted">{fmtDateTime(data.timeline.accepted)}</Row>
        <Row label="Collection started">{fmtDateTime(data.timeline.started)}</Row>
        <Row label="Completed">{fmtDateTime(data.timeline.completed)}</Row>

        <h2 className="text-sm font-semibold text-ink mt-5 mb-2">Recycling destination</h2>
        {data.destination ? (
          <div className="border border-line rounded-md p-3 flex items-center gap-3">
            {data.destination.photo && (
              <a href={data.destination.photo} target="_blank" rel="noopener noreferrer" className="shrink-0">
                <img src={data.destination.photo} alt="Delivery at recycling partner" className="w-20 h-16 object-cover rounded-md border border-line" />
              </a>
            )}
            <div className="text-sm">
              <div className="text-ink font-medium">Delivered to {data.destination.partnerName}</div>
              <div className="text-xs text-inkSoft">
                {data.destination.city} · {fmtDateTime(data.destination.deliveredAt)}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-inkSoft">Not recorded yet — the collector adds this once the load reaches a recycling partner.</p>
        )}

        {(data.photos.completion || data.photos.weighing) && (
          <>
            <h2 className="text-sm font-semibold text-ink mt-5 mb-2">Proof</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { src: data.photos.completion, label: "Collected scrap" },
                { src: data.photos.weighing, label: "Scale / weighed load" },
              ].map(
                (p) =>
                  p.src && (
                    <a key={p.label} href={p.src} target="_blank" rel="noopener noreferrer" className="block">
                      <img src={p.src} alt={p.label} className="w-full h-32 object-cover rounded-md border border-line" />
                      <div className="text-xs text-inkSoft mt-1">{p.label}</div>
                    </a>
                  )
              )}
            </div>
          </>
        )}

        <p className="text-[11px] text-inkFaint mt-6">
          This receipt is generated by ScrapConnect from the recorded pickup, weights and photos.
        </p>
      </Card>

      <div className="flex gap-3 mt-4 print:hidden">
        <button onClick={() => window.print()} className="bg-rust text-white text-sm font-medium px-5 py-2 rounded-md">
          Print / Save as PDF
        </button>
        <button onClick={() => window.history.back()} className="text-sm px-4 py-2 rounded-md border border-line text-ink">
          Back
        </button>
      </div>
    </div>
  );
}