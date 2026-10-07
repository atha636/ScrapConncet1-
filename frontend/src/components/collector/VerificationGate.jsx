import { useEffect, useState } from "react";
import Card from "../ui/Card";
import Loader from "../common/Loader";
import ErrorBox from "../common/ErrorBox";
import { getMyVerification, submitVerification } from "../../services/verificationService";

const ID_TYPES = [
  { value: "aadhaar", label: "Aadhaar card" },
  { value: "driving_license", label: "Driving licence" },
  { value: "voter_id", label: "Voter ID" },
  { value: "pan", label: "PAN card" },
];

// Wraps the collector dashboard. A collector can log in normally, but only
// sees the dashboard once an admin has approved their ID; until then they
// get the upload form / "under review" / "rejected, try again" screen.
export default function VerificationGate({ children }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [idType, setIdType] = useState("aadhaar");
  const [idLast4, setIdLast4] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getMyVerification();
      setInfo(res.data);
    } catch {
      setError("Couldn't check your verification status. Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\d{4}$/.test(idLast4)) return setError("Enter only the last 4 digits of the ID number.");
    if (!file) return setError("Upload a clear photo of your ID.");
    setSubmitting(true);
    try {
      const res = await submitVerification({ idType, idLast4, file });
      setInfo(res.data);
      setFile(null);
      setIdLast4("");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't submit your ID. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader />;
  if (info?.status === "approved") {
    // Heads-up when the approval is about to lapse; the ID can be uploaded
    // again once it expires (or sooner if an admin asks for re-verification).
    const daysLeft = info.expiresAt ? Math.ceil((new Date(info.expiresAt) - new Date()) / 86400000) : null;
    if (daysLeft !== null && daysLeft <= 30) {
      return (
        <>
          <div className="max-w-3xl mx-auto mb-4 rounded-md border border-amber/40 bg-amber/10 px-4 py-2 text-sm text-ink">
            Your ID verification expires on {new Date(info.expiresAt).toLocaleDateString()} ({daysLeft} day
            {daysLeft === 1 ? "" : "s"} left). After that you'll need to upload your ID again to keep taking pickups.
          </div>
          {children}
        </>
      );
    }
    return children;
  }

  if (!info) {
    return (
      <div className="max-w-md mx-auto">
        <ErrorBox>{error}</ErrorBox>
        <button onClick={load} className="mt-3 text-sm text-rust underline">
          Retry
        </button>
      </div>
    );
  }

  if (info.status === "pending") {
    return (
      <div className="max-w-md mx-auto">
        <Card className="p-6 text-center">
          <h1 className="font-display text-xl font-bold text-ink mb-2">ID under review</h1>
          <p className="text-sm text-inkSoft mb-4">
            We got your {ID_TYPES.find((t) => t.value === info.idType)?.label || "ID"} (ending {info.idLast4}). An admin
            will check it soon — you'll get a notification and can start taking pickups once it's approved.
          </p>
          <button onClick={load} className="text-sm text-rust underline">
            Refresh status
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <Card className="p-6">
        <h1 className="font-display text-xl font-bold text-ink mb-1">
          {info.status === "expired" ? "Verify your ID again" : "Verify your ID"}
        </h1>
        <p className="text-sm text-inkSoft mb-4">
          Before you can see or accept pickups, an admin needs to verify your identity. This keeps customers safe.
        </p>

        {info.status === "expired" && (
          <div className="mb-4">
            <ErrorBox>
              Your ID verification expired{info.expiresAt ? ` on ${new Date(info.expiresAt).toLocaleDateString()}` : ""}.
              Upload your ID again to keep taking pickups.
            </ErrorBox>
          </div>
        )}
        {info.status === "rejected" && (
          <div className="mb-4">
            <ErrorBox>Your last upload wasn't approved: {info.rejectionReason}. Please upload it again.</ErrorBox>
          </div>
        )}
        {error && (
          <div className="mb-4">
            <ErrorBox>{error}</ErrorBox>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm text-ink">
            ID type
            <select
              value={idType}
              onChange={(e) => setIdType(e.target.value)}
              className="mt-1 w-full border border-line rounded-md px-3 py-2 text-sm bg-surface text-ink"
            >
              {ID_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-ink">
            Last 4 digits of ID number
            <input
              inputMode="numeric"
              maxLength={4}
              value={idLast4}
              onChange={(e) => setIdLast4(e.target.value.replace(/\D/g, ""))}
              placeholder="1234"
              className="mt-1 w-full border border-line rounded-md px-3 py-2 text-sm bg-surface text-ink"
            />
            <span className="text-xs text-inkFaint">We never store the full number.</span>
          </label>

          <label className="block text-sm text-ink">
            Photo of your ID
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-sm text-inkSoft"
            />
            <span className="text-xs text-inkFaint">
              Name and photo must be readable. For Aadhaar, you may mask the first 8 digits.
            </span>
          </label>

          {preview && <img src={preview} alt="ID preview" className="max-h-48 rounded-md border border-line" />}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-rust text-white text-sm font-medium py-2 rounded-md disabled:opacity-50"
          >
            {submitting ? "Uploading…" : "Submit for verification"}
          </button>
        </form>
      </Card>
    </div>
  );
}