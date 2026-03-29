import { useState } from "react";
import { createPickup } from "../../services/pickupService";
import Navbar from "../../components/layout/Navbar";

const SCRAP_TYPES = [
  {
    value: "metal",
    label: "Metal",
    desc: "Iron, steel, copper, aluminium",
    color: "#22D3EE",
    dim: "rgba(34,211,238,0.12)",
    border: "rgba(34,211,238,0.3)",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
  {
    value: "plastic",
    label: "Plastic",
    desc: "Bottles, containers, bags",
    color: "#F59E0B",
    dim: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.3)",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    value: "paper",
    label: "Paper",
    desc: "Newspapers, cardboard, books",
    color: "#10B981",
    dim: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.3)",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    value: "electronics",
    label: "Electronics",
    desc: "Phones, wires, circuit boards",
    color: "#A78BFA",
    dim: "rgba(167,139,250,0.12)",
    border: "rgba(167,139,250,0.3)",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    ),
  },
];

function ScrapTypeCard({ option, selected, onClick }) {
  const active = selected === option.value;
  return (
    <button
      onClick={() => onClick(option.value)}
      style={{
        position: "relative",
        background: active
          ? `linear-gradient(135deg, ${option.dim}, rgba(0,0,0,0.3))`
          : "rgba(18,24,36,0.8)",
        border: active ? `1.5px solid ${option.border}` : "1.5px solid rgba(255,255,255,0.07)",
        borderRadius: "16px",
        padding: "20px 16px",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        transform: active ? "translateY(-3px)" : "translateY(0)",
        boxShadow: active ? `0 16px 40px rgba(0,0,0,0.5), 0 0 0 1px ${option.border}` : "0 2px 12px rgba(0,0,0,0.3)",
        outline: "none",
        width: "100%",
        overflow: "hidden",
      }}
    >
      {active && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: "2px",
          background: `linear-gradient(90deg, transparent, ${option.color}, transparent)`,
          borderRadius: "16px 16px 0 0",
        }} />
      )}
      <div style={{
        width: "46px", height: "46px",
        borderRadius: "13px",
        background: active ? option.dim : "rgba(255,255,255,0.04)",
        border: active ? `1px solid ${option.border}` : "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: active ? option.color : "#475569",
        marginBottom: "12px",
        transition: "all 0.25s ease",
      }}>
        {option.icon}
      </div>
      <div style={{
        fontSize: "15px", fontWeight: 700,
        color: active ? "#F1F5F9" : "#94A3B8",
        fontFamily: "'Syne', sans-serif",
        marginBottom: "3px",
        transition: "color 0.2s",
      }}>
        {option.label}
      </div>
      <div style={{ fontSize: "11.5px", color: active ? "#64748B" : "#334155", transition: "color 0.2s" }}>
        {option.desc}
      </div>
      {active && (
        <div style={{
          position: "absolute", top: "14px", right: "14px",
          width: "20px", height: "20px",
          borderRadius: "50%",
          background: option.color,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
      )}
    </button>
  );
}

function UploadZone({ file, setFile }) {
  const [dragging, setDragging] = useState(false);
  const preview = file ? URL.createObjectURL(file) : null;

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) setFile(f);
  };

  return (
    <div>
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          display: "block",
          position: "relative",
          border: dragging
            ? "2px dashed rgba(34,211,238,0.7)"
            : file
            ? "2px solid rgba(16,185,129,0.4)"
            : "2px dashed rgba(255,255,255,0.1)",
          borderRadius: "18px",
          background: dragging
            ? "rgba(34,211,238,0.06)"
            : file
            ? "rgba(16,185,129,0.06)"
            : "rgba(14,20,32,0.8)",
          minHeight: "170px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.25s ease",
          overflow: "hidden",
          padding: "20px",
        }}
      >
        <input
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => setFile(e.target.files[0])}
        />

        {preview ? (
          <>
            <img
              src={preview}
              alt="preview"
              style={{
                width: "100%", maxHeight: "180px",
                objectFit: "cover",
                borderRadius: "12px",
                marginBottom: "12px",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{
                width: "20px", height: "20px", borderRadius: "50%",
                background: "rgba(16,185,129,0.2)",
                border: "1px solid rgba(16,185,129,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <span style={{ fontSize: "12.5px", color: "#10B981", fontWeight: 600 }}>{file.name}</span>
            </div>
            <span style={{ fontSize: "11px", color: "#475569", marginTop: "4px" }}>Tap to change</span>
          </>
        ) : (
          <>
            <div style={{
              width: "56px", height: "56px",
              borderRadius: "16px",
              background: dragging ? "rgba(34,211,238,0.15)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${dragging ? "rgba(34,211,238,0.4)" : "rgba(255,255,255,0.08)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: dragging ? "#22D3EE" : "#475569",
              marginBottom: "14px",
              transition: "all 0.2s ease",
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="3" y="3" width="18" height="18" rx="3"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
            <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 600, color: "#94A3B8" }}>
              {dragging ? "Drop your image here" : "Upload scrap photo"}
            </p>
            <p style={{ margin: 0, fontSize: "12px", color: "#475569" }}>
              Drag & drop or tap to browse
            </p>
          </>
        )}
      </label>
    </div>
  );
}

function LocationRow({ status }) {
  const colors = {
    idle: { color: "#475569", bg: "rgba(71,85,105,0.1)", border: "rgba(71,85,105,0.25)", label: "Location will be captured on submit" },
    loading: { color: "#F59E0B", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)", label: "Getting your location…" },
    success: { color: "#10B981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)", label: "Location captured successfully" },
    error: { color: "#EF4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)", label: "Location access denied" },
  }[status];

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "10px",
      padding: "12px 16px",
      borderRadius: "12px",
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      transition: "all 0.3s ease",
    }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.color} strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
      <span style={{ fontSize: "13px", color: colors.color, fontWeight: 500 }}>{colors.label}</span>
      {status === "loading" && (
        <div style={{
          marginLeft: "auto",
          width: "14px", height: "14px",
          border: `2px solid rgba(245,158,11,0.3)`,
          borderTop: `2px solid #F59E0B`,
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
      )}
      {status === "success" && (
        <div style={{
          marginLeft: "auto",
          width: "18px", height: "18px", borderRadius: "50%",
          background: "rgba(16,185,129,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
      )}
    </div>
  );
}

export default function RequestPickup() {
  const [file, setFile] = useState(null);
  const [type, setType] = useState("metal");
  const [locStatus, setLocStatus] = useState("idle");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const selectedOption = SCRAP_TYPES.find((s) => s.value === type);

  const handleSubmit = async () => {
    if (!file) return;
    setSubmitting(true);
    setLocStatus("loading");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocStatus("success");
        const form = new FormData();
        form.append("scrapType", type);
        form.append("image", file);
        form.append("lat", pos.coords.latitude);
        form.append("lng", pos.coords.longitude);

        await createPickup(form);
        setSubmitting(false);
        setSubmitted(true);
      },
      () => {
        setLocStatus("error");
        setSubmitting(false);
      }
    );
  };

  if (submitted) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
          @keyframes riseUp { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }
          @keyframes scaleIn { from { opacity:0; transform:scale(0.6); } to { opacity:1; transform:scale(1); } }
          * { box-sizing:border-box; }
        `}</style>
        <Navbar />
        <div style={{
          minHeight: "100vh",
          background: "linear-gradient(160deg, #080C14 0%, #0C1120 55%, #080C14 100%)",
          fontFamily: "'DM Sans', sans-serif",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px",
        }}>
          <div style={{ textAlign: "center", animation: "riseUp 0.5s ease both" }}>
            <div style={{
              width: "90px", height: "90px",
              borderRadius: "24px",
              background: "rgba(16,185,129,0.15)",
              border: "1.5px solid rgba(16,185,129,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 24px",
              animation: "scaleIn 0.4s 0.1s ease both",
              color: "#10B981",
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: "26px", fontWeight: 800, color: "#F8FAFC", fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}>
              Request Sent!
            </h2>
            <p style={{ margin: "0 0 28px", fontSize: "14px", color: "#64748B" }}>
              Your scrap pickup has been scheduled.
            </p>
            <button
              onClick={() => { setSubmitted(false); setFile(null); setType("metal"); setLocStatus("idle"); }}
              style={{
                padding: "12px 28px",
                borderRadius: "12px",
                background: "rgba(16,185,129,0.15)",
                border: "1.5px solid rgba(16,185,129,0.35)",
                color: "#10B981",
                fontSize: "14px", fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              New Request
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes riseUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes floatOrb { 0%,100% { transform:translateY(0) scale(1); } 50% { transform:translateY(-18px) scale(1.04); } }
        * { box-sizing:border-box; }
      `}</style>

     

      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #080C14 0%, #0C1120 55%, #080C14 100%)",
        fontFamily: "'DM Sans', sans-serif",
        paddingBottom: "80px",
        position: "relative",
        overflow: "hidden",
      }}>

        {/* Ambient orbs */}
        <div style={{ position:"absolute", top:"5%", right:"5%", width:"350px", height:"350px", borderRadius:"50%", background:"radial-gradient(circle, rgba(34,211,238,0.05) 0%, transparent 70%)", animation:"floatOrb 10s ease-in-out infinite", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:"10%", left:"2%", width:"280px", height:"280px", borderRadius:"50%", background:"radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)", animation:"floatOrb 13s ease-in-out infinite reverse", pointerEvents:"none" }} />

        <div style={{ maxWidth: "680px", margin: "0 auto", padding: "48px 24px 0" }}>

          {/* Header */}
          <div style={{ marginBottom: "36px", animation: "riseUp 0.45s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <div style={{ width: "3px", height: "22px", background: "linear-gradient(180deg,#22D3EE,#6366F1)", borderRadius: "2px" }} />
              <h1 style={{ margin:0, fontSize:"26px", fontWeight:800, color:"#F8FAFC", fontFamily:"'Syne', sans-serif", letterSpacing:"-0.02em" }}>
                Request Pickup
              </h1>
            </div>
            <p style={{ margin:"4px 0 0 11px", fontSize:"13.5px", color:"#64748B" }}>
              Tell us what you have and we'll come to you
            </p>
          </div>

          {/* Step 1: Scrap Type */}
          <div style={{ marginBottom: "32px", animation: "riseUp 0.5s 0.05s ease both" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"16px" }}>
              <div style={{
                width:"22px", height:"22px", borderRadius:"50%",
                background:"rgba(34,211,238,0.15)",
                border:"1px solid rgba(34,211,238,0.35)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"11px", fontWeight:700, color:"#22D3EE",
              }}>1</div>
              <span style={{ fontSize:"13px", fontWeight:700, color:"#94A3B8", letterSpacing:"0.06em", textTransform:"uppercase" }}>
                Scrap Type
              </span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:"10px" }}>
              {SCRAP_TYPES.map((opt) => (
                <ScrapTypeCard key={opt.value} option={opt} selected={type} onClick={setType} />
              ))}
            </div>
          </div>

          {/* Step 2: Photo */}
          <div style={{ marginBottom: "32px", animation: "riseUp 0.5s 0.12s ease both" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"16px" }}>
              <div style={{
                width:"22px", height:"22px", borderRadius:"50%",
                background:"rgba(245,158,11,0.15)",
                border:"1px solid rgba(245,158,11,0.35)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"11px", fontWeight:700, color:"#F59E0B",
              }}>2</div>
              <span style={{ fontSize:"13px", fontWeight:700, color:"#94A3B8", letterSpacing:"0.06em", textTransform:"uppercase" }}>
                Upload Photo
              </span>
            </div>
            <UploadZone file={file} setFile={setFile} />
          </div>

          {/* Step 3: Location */}
          <div style={{ marginBottom: "36px", animation: "riseUp 0.5s 0.18s ease both" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"16px" }}>
              <div style={{
                width:"22px", height:"22px", borderRadius:"50%",
                background:"rgba(16,185,129,0.15)",
                border:"1px solid rgba(16,185,129,0.35)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"11px", fontWeight:700, color:"#10B981",
              }}>3</div>
              <span style={{ fontSize:"13px", fontWeight:700, color:"#94A3B8", letterSpacing:"0.06em", textTransform:"uppercase" }}>
                Location
              </span>
            </div>
            <LocationRow status={locStatus} />
          </div>

          {/* Submit */}
          <div style={{ animation: "riseUp 0.5s 0.24s ease both" }}>
            <button
              onClick={handleSubmit}
              disabled={!file || submitting}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: "16px",
                border: "none",
                background: !file || submitting
                  ? "rgba(255,255,255,0.05)"
                  : `linear-gradient(135deg, ${selectedOption.color}22, rgba(0,0,0,0))`,
                borderTop: !file || submitting ? "1px solid rgba(255,255,255,0.07)" : `1px solid ${selectedOption.border}`,
                borderLeft: !file || submitting ? "1px solid rgba(255,255,255,0.07)" : `1px solid ${selectedOption.border}`,
                borderRight: !file || submitting ? "1px solid rgba(255,255,255,0.07)" : `1px solid ${selectedOption.border}`,
                borderBottom: !file || submitting ? "1px solid rgba(255,255,255,0.07)" : `1px solid ${selectedOption.border}`,
                color: !file || submitting ? "#334155" : selectedOption.color,
                fontSize: "15px",
                fontWeight: 700,
                fontFamily: "'Syne', sans-serif",
                letterSpacing: "0.01em",
                cursor: !file || submitting ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                transition: "all 0.25s ease",
                boxShadow: !file || submitting ? "none" : `0 0 40px rgba(${selectedOption.color === "#22D3EE" ? "34,211,238" : selectedOption.color === "#F59E0B" ? "245,158,11" : selectedOption.color === "#10B981" ? "16,185,129" : "167,139,250"},0.15)`,
              }}
            >
              {submitting ? (
                <>
                  <div style={{ width:"18px", height:"18px", border:`2px solid rgba(${selectedOption.color === "#22D3EE" ? "34,211,238" : "245,158,11"},0.3)`, borderTop:`2px solid ${selectedOption.color}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
                  Processing…
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  {!file ? "Add a photo to continue" : "Submit Pickup Request"}
                </>
              )}
            </button>

            {!file && (
              <p style={{ textAlign:"center", fontSize:"12px", color:"#334155", marginTop:"10px" }}>
                A photo is required to submit your request
              </p>
            )}
          </div>

        </div>
      </div>
    </>
  );
}