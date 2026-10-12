import { useCallback, useEffect, useState } from "react";
import Card from "../ui/Card";
import Loader from "../common/Loader";
import ErrorBox from "../common/ErrorBox";
import { formatPrice } from "../../utils/formatPrice";
import {
  getMyTeam,
  createTeam,
  inviteMember,
  removeMember,
  setMemberVehicle,
  addVehicle,
  removeVehicle,
  getTeamJobs,
  assignJob,
  getTeamStats,
  acceptTeamInvite,
  declineTeamInvite,
  leaveTeam,
} from "../../services/teamService";

const inputCls = "mt-1 w-full border border-line rounded-md px-3 py-2 text-sm bg-surface text-ink";
const VEHICLE_TYPES = { bike: "Bike", auto: "Auto", van: "Van", truck: "Truck" };
const VERIFY_LABEL = { approved: "ID verified", pending: "ID pending", rejected: "ID rejected", expired: "ID expired", unsubmitted: "No ID yet", none: "No ID yet" };
const errMsg = (err, fallback) => err.response?.data?.details?.[0]?.message || err.response?.data?.message || fallback;

/* ------------------------------ owner views ------------------------------ */

function Members({ team, onChange, setError }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (fn, fail) => {
    setError("");
    try {
      onChange((await fn()).data);
      return true;
    } catch (err) {
      setError(errMsg(err, fail));
      return false;
    }
  };

  const invite = async (e) => {
    e.preventDefault();
    setBusy(true);
    if (await run(() => inviteMember(email.trim()), "Couldn't send the invite.")) setEmail("");
    setBusy(false);
  };

  return (
    <div>
      <form onSubmit={invite} className="flex gap-2 mb-4">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Collector's email" className="input flex-1" />
        <button type="submit" disabled={busy} className="btn-primary text-sm disabled:opacity-50">
          {busy ? "Inviting…" : "Invite"}
        </button>
      </form>
      <p className="text-xs text-inkFaint mb-3">They need their own collector account with an approved ID. They'll get a notification to accept.</p>

      <div className="space-y-2">
        {team.members.length === 0 && <p className="text-sm text-inkSoft">No members yet.</p>}
        {team.members.map((m) => (
          <Card key={m.userId} className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{m.name}</p>
                <p className="text-xs text-inkSoft">
                  {m.status === "invited" ? "Invite sent" : "Active"} · {VERIFY_LABEL[m.verification] || m.verification}
                  {m.phone ? ` · ${m.phone}` : ""}
                </p>
              </div>
              <button onClick={() => run(() => removeMember(m.userId), "Couldn't remove.")} className="text-xs font-semibold text-rust shrink-0">
                {m.status === "invited" ? "Cancel" : "Remove"}
              </button>
            </div>
            {m.status === "active" && team.vehicles.length > 0 && (
              <label className="block text-xs text-inkSoft mt-2">
                Vehicle
                <select
                  value={m.vehicle?.id || ""}
                  onChange={(e) => run(() => setMemberVehicle(m.userId, e.target.value || null), "Couldn't set vehicle.")}
                  className={inputCls}
                >
                  <option value="">None</option>
                  {team.vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.label}{v.plate ? ` (${v.plate})` : ""}</option>
                  ))}
                </select>
              </label>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function Fleet({ team, onChange, setError }) {
  const [label, setLabel] = useState("");
  const [plate, setPlate] = useState("");
  const [type, setType] = useState("van");

  const add = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await addVehicle({ label: label.trim(), plate: plate.trim() || undefined, type });
      onChange(res.data);
      setLabel("");
      setPlate("");
    } catch (err) {
      setError(errMsg(err, "Couldn't add the vehicle."));
    }
  };

  const remove = async (id) => {
    setError("");
    try {
      onChange((await removeVehicle(id)).data);
    } catch (err) {
      setError(errMsg(err, "Couldn't remove the vehicle."));
    }
  };

  return (
    <div>
      <div className="space-y-2 mb-4">
        {team.vehicles.length === 0 && <p className="text-sm text-inkSoft">No vehicles yet.</p>}
        {team.vehicles.map((v) => {
          const driver = team.members.find((m) => m.vehicle?.id === v.id);
          return (
            <Card key={v.id} className="p-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-ink">{v.label} <span className="text-xs font-normal text-inkSoft">· {VEHICLE_TYPES[v.type]}{v.plate ? ` · ${v.plate}` : ""}</span></p>
                <p className="text-xs text-inkSoft">{driver ? `Used by ${driver.name}` : "Not assigned"}</p>
              </div>
              <button onClick={() => remove(v.id)} className="text-xs font-semibold text-rust">Remove</button>
            </Card>
          );
        })}
      </div>
      <Card className="p-4">
        <form onSubmit={add} className="space-y-3">
          <label className="block text-xs text-inkSoft">
            Name
            <input value={label} onChange={(e) => setLabel(e.target.value)} required minLength={2} maxLength={40} placeholder="e.g. Tata Ace 1" className={inputCls} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-inkSoft">
              Plate (optional)
              <input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} maxLength={15} className={inputCls} />
            </label>
            <label className="block text-xs text-inkSoft">
              Type
              <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
                {Object.entries(VEHICLE_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" className="btn-primary text-sm">Add vehicle</button>
        </form>
      </Card>
    </div>
  );
}

function Assign({ team, setError }) {
  const [jobs, setJobs] = useState(null);
  const active = team.members.filter((m) => m.status === "active");

  const load = useCallback(() => {
    getTeamJobs()
      .then((res) => setJobs(res.data.jobs))
      .catch(() => setError("Couldn't load your active jobs."));
  }, [setError]);

  useEffect(() => {
    load();
  }, [load]);

  const assign = async (pickupId, memberId) => {
    setError("");
    try {
      await assignJob(pickupId, memberId || null);
      load();
    } catch (err) {
      setError(errMsg(err, "Couldn't assign that job."));
    }
  };

  if (jobs === null) return <Loader />;
  return (
    <div>
      <p className="text-xs text-inkFaint mb-3">
        Accept pickups as usual, then hand them to a member here. Earnings and the start code stay with you; the member does the visit.
      </p>
      {active.length === 0 && <p className="text-sm text-inkSoft mb-3">Add an active member first.</p>}
      <div className="space-y-2">
        {jobs.length === 0 && <p className="text-sm text-inkSoft">No active jobs to assign.</p>}
        {jobs.map((j) => (
          <Card key={j.id} className="p-3">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-sm font-semibold text-ink truncate">{j.address || j.scrapType}</p>
              <span className="text-xs text-inkSoft shrink-0">{formatPrice(j.price)} · {j.status === "in_progress" ? "In progress" : "Accepted"}</span>
            </div>
            <select value={j.assignedTo?.id || ""} onChange={(e) => assign(j.id, e.target.value)} disabled={active.length === 0} className={inputCls}>
              <option value="">Me (unassigned)</option>
              {active.map((m) => (
                <option key={m.userId} value={m.userId}>{m.name}</option>
              ))}
            </select>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Performance({ setError }) {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getTeamStats(days)
      .then((res) => !cancelled && setRows(res.data.members))
      .catch(() => !cancelled && setError("Couldn't load team performance."));
    return () => {
      cancelled = true;
    };
  }, [days, setError]);

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => {
              setRows(null);
              setDays(d);
            }}
            className={`text-xs font-semibold px-3 py-1 rounded-full border ${days === d ? "bg-rust text-white border-rust" : "border-line text-inkSoft"}`}
          >
            {d} days
          </button>
        ))}
      </div>
      {rows === null ? (
        <Loader />
      ) : rows.length === 0 ? (
        <p className="text-sm text-inkSoft">No active members yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.userId} className="p-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-ink">{r.name}</p>
                <p className="text-xs text-inkSoft">{r.activeNow} active now</p>
              </div>
              <div className="text-right text-xs text-inkSoft">
                <p className="text-sm font-semibold text-ink">{r.completed} jobs · {r.kg} kg</p>
                <p>{formatPrice(r.value)} handled</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- panel -------------------------------- */

export default function TeamPanel({ onInvitesChange }) {
  const [data, setData] = useState(null);
  const [section, setSection] = useState("members");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getMyTeam()
      .then((res) => {
        setData(res.data);
        onInvitesChange?.(res.data.invites?.length || 0);
      })
      .catch(() => setError("Couldn't load your team."));
  }, [onInvitesChange]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn, fail) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      load();
    } catch (err) {
      setError(errMsg(err, fail));
    } finally {
      setBusy(false);
    }
  };

  if (!data) return error ? <ErrorBox>{error}</ErrorBox> : <Loader />;

  const errorBlock = error && (
    <div className="mb-4">
      <ErrorBox>{error}</ErrorBox>
    </div>
  );

  if (data.role === "owner") {
    const setTeam = (team) => setData((d) => ({ ...d, team }));
    return (
      <div>
        <h2 className="font-display text-lg font-bold text-ink mb-1">{data.team.name}</h2>
        <p className="text-xs text-inkSoft mb-4">
          {data.team.members.filter((m) => m.status === "active").length} active member(s) · {data.team.vehicles.length} vehicle(s)
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {[["members", "Members"], ["fleet", "Fleet"], ["assign", "Assign jobs"], ["perf", "Performance"]].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setSection(k)}
              className={`text-sm font-semibold px-4 py-1.5 rounded-full border ${section === k ? "bg-rust text-white border-rust" : "border-line text-inkSoft"}`}
            >
              {l}
            </button>
          ))}
        </div>
        {errorBlock}
        {section === "members" && <Members team={data.team} onChange={setTeam} setError={setError} />}
        {section === "fleet" && <Fleet team={data.team} onChange={setTeam} setError={setError} />}
        {section === "assign" && <Assign team={data.team} setError={setError} />}
        {section === "perf" && <Performance setError={setError} />}
      </div>
    );
  }

  if (data.role === "member") {
    return (
      <div>
        {errorBlock}
        <Card className="p-4">
          <h2 className="font-display text-lg font-bold text-ink">{data.team.name}</h2>
          <p className="text-sm text-inkSoft mt-1">You're a member of {data.team.ownerName}'s team.</p>
          {data.team.vehicle && (
            <p className="text-sm text-ink mt-2">
              Your vehicle: {data.team.vehicle.label}{data.team.vehicle.plate ? ` (${data.team.vehicle.plate})` : ""}
            </p>
          )}
          <p className="text-xs text-inkFaint mt-3">
            Jobs your team owner assigns to you show up in your Active tab. Ask the requester for their start code as usual. Payment for those jobs goes to your team owner's wallet.
          </p>
          <button
            onClick={() => act(leaveTeam, "Couldn't leave the team.")}
            disabled={busy}
            className="mt-4 text-sm font-semibold text-rust"
          >
            Leave team
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {errorBlock}
      {data.invites.length > 0 && (
        <div className="mb-6">
          <h2 className="font-display text-lg font-bold text-ink mb-2">Team invites</h2>
          <div className="space-y-2">
            {data.invites.map((i) => (
              <Card key={i.teamId} className="p-3 flex items-center justify-between gap-2">
                <p className="text-sm text-ink">
                  <span className="font-semibold">{i.teamName}</span> <span className="text-inkSoft">· {i.ownerName}</span>
                </p>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => act(() => acceptTeamInvite(i.teamId), "Couldn't join.")} disabled={busy} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-rust text-white">
                    Join
                  </button>
                  <button onClick={() => act(() => declineTeamInvite(i.teamId), "Couldn't decline.")} disabled={busy} className="text-xs font-semibold px-3 py-1.5 rounded-full border border-line text-inkSoft">
                    Decline
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-display text-lg font-bold text-ink mb-1">Run a team</h2>
      <p className="text-sm text-inkSoft mb-3">
        Add staff collectors and vehicles, then assign the pickups you accept to your people and see how each one is doing.
      </p>
      <Card className="p-4 max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act(() => createTeam(name.trim()), "Couldn't create the team.");
          }}
          className="space-y-3"
        >
          <label className="block text-xs text-inkSoft">
            Team name
            <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} placeholder="e.g. Sharma Scrap Services" className={inputCls} />
          </label>
          <button type="submit" disabled={busy} className="btn-primary text-sm disabled:opacity-50">
            Create team
          </button>
        </form>
      </Card>
    </div>
  );
}