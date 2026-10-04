import { useCallback, useEffect, useState } from "react";
import Card from "../ui/Card";
import Loader from "../common/Loader";
import ErrorBox from "../common/ErrorBox";
import {
  getVerifications,
  getVerificationDocument,
  reviewVerification,
} from "../../services/verificationService";

const FILTERS = ["pending", "approved", "rejected"];
const ID_LABELS = { aadhaar: "Aadhaar", driving_license: "Driving licence", voter_id: "Voter ID", pan: "PAN" };

export default function VerificationsTab() {
  const [status, setStatus] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [docUrl, setDocUrl] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getVerifications(status);
      setItems(res.data.verifications);
    } catch {
      setError("Couldn't load verifications.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  // Free the blob URL when the viewer closes
  useEffect(() => () => docUrl && URL.revokeObjectURL(docUrl), [docUrl]);

  const viewDoc = async (id) => {
    setBusyId(id);
    setError("");
    try {
      const res = await getVerificationDocument(id);
      setDocUrl(URL.createObjectURL(res.data));
    } catch {
      setError("Couldn't open that document.");
    } finally {
      setBusyId(null);
    }
  };

  const review = async (id, decision) => {
    if (decision === "reject" && !reason.trim()) return setError("Give a reason for rejecting.");
    setBusyId(id);
    setError("");
    try {
      await reviewVerification(id, decision, reason.trim());
      setRejectingId(null);
      setReason("");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save that decision.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setStatus(f)}
            className={`text-sm px-3 py-1.5 rounded-md border capitalize ${
              status === f ? "bg-rust text-white border-rust" : "border-line text-inkSoft hover:text-ink"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4">
          <ErrorBox>{error}</ErrorBox>
        </div>
      )}

      {loading ? (
        <Loader />
      ) : items.length === 0 ? (
        <p className="text-sm text-inkSoft py-8 text-center">No {status} verifications.</p>
      ) : (
        <div className="space-y-3">
          {items.map((v) => (
            <Card key={v.collectorId} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-ink">{v.name}</div>
                  <div className="text-xs text-inkSoft">
                    {v.email}
                    {v.phone ? ` · ${v.phone}` : ""}
                  </div>
                  <div className="text-xs text-inkFaint font-mono mt-1">
                    {ID_LABELS[v.idType] || v.idType} · ends {v.idLast4} · submitted{" "}
                    {v.submittedAt ? new Date(v.submittedAt).toLocaleDateString() : "—"}
                  </div>
                  {v.status === "rejected" && v.rejectionReason && (
                    <div className="text-xs text-inkSoft mt-1">Reason: {v.rejectionReason}</div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => viewDoc(v.collectorId)}
                    disabled={busyId === v.collectorId}
                    className="text-sm px-3 py-1.5 rounded-md border border-line text-ink"
                  >
                    View ID
                  </button>
                  {v.status === "pending" && (
                    <>
                      <button
                        onClick={() => review(v.collectorId, "approve")}
                        disabled={busyId === v.collectorId}
                        className="text-sm px-3 py-1.5 rounded-md bg-rust text-white disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setRejectingId(rejectingId === v.collectorId ? null : v.collectorId);
                          setReason("");
                        }}
                        className="text-sm px-3 py-1.5 rounded-md border border-rust text-rust"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>

              {rejectingId === v.collectorId && (
                <div className="mt-3 flex gap-2">
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={300}
                    placeholder="Reason (shown to the collector)"
                    className="flex-1 border border-line rounded-md px-3 py-1.5 text-sm bg-surface text-ink"
                  />
                  <button
                    onClick={() => review(v.collectorId, "reject")}
                    disabled={busyId === v.collectorId}
                    className="text-sm px-3 py-1.5 rounded-md bg-rust text-white disabled:opacity-50"
                  >
                    Confirm reject
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {docUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setDocUrl(null)}
        >
          <img src={docUrl} alt="ID document" className="max-h-full max-w-full rounded-md" />
        </div>
      )}
    </div>
  );
}