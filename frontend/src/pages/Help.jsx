import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/ui/Card";
import Loader from "../components/common/Loader";
import ErrorBox from "../components/common/ErrorBox";
import useDocumentMeta from "../hooks/useDocumentMeta";
import { useAuth } from "../context/AuthContext";
import TicketThread, { StatusPill } from "../components/support/TicketThread";
import { CATEGORY_LABEL } from "../utils/supportLabels";
import { createTicket, getMyTickets, getMyTicket, replyToMyTicket } from "../services/supportService";

const FAQ = [
  { q: "How is the price of my scrap decided?", a: "The per-kg rates on the Scrap Rates page are used to give you an estimate. The final amount is based on the actual weight your collector measures at pickup, so it can differ slightly from the estimate." },
  { q: "What does 'Compare quotes' do?", a: "It shows estimated offers from nearby verified collectors, using their own rate cards, so you can pick who to book. Quotes are estimates, not guaranteed prices." },
  { q: "How do I know a collector is genuine?", a: "Collectors must upload an ID that an admin checks before they can accept pickups. Verified collectors show a verified badge, and IDs are re-checked when they expire." },
  { q: "What is the start code?", a: "When your collector arrives, share the start code shown in your request. It confirms the right person is at your door and begins the pickup." },
  { q: "What are the weighing photos and the receipt?", a: "The collector photographs the scrap on the scale, and after weighing you get a digital receipt with weights, rate and total. You can open it any time from your requests." },
  { q: "The final weight looks wrong. What can I do?", a: "If the actual weight is far from your estimate (more than about 10%), you'll be asked to confirm it. If you don't respond within 24 hours it is settled automatically. If you disagree, raise a dispute from the request or contact support below." },
  { q: "Where does my scrap go after pickup?", a: "Collectors can drop scrap at registered recycling partners. When that happens, the destination appears on your receipt and in your Impact page." },
  { q: "How do I cancel a pickup?", a: "Open My Requests, choose the pickup and use Cancel while it is still pending or accepted. If the collector is already on the way, message them first or contact support." },
  { q: "I'm a collector. Why can't I accept pickups?", a: "Your ID must be approved by an admin first. Check the verification status on your dashboard, and re-upload if it was rejected or has expired." },
];

function Faq() {
  const [query, setQuery] = useState("");
  const [openIdx, setOpenIdx] = useState(null);
  const items = FAQ.filter((f) => (f.q + f.a).toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <section className="mb-10">
      <h2 className="font-display text-lg font-bold text-ink mb-3">Frequently asked questions</h2>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search help…" className="input w-full mb-3" />
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-inkSoft">No matching answers. Send us a message below.</p>}
        {items.map((f) => {
          const isOpen = openIdx === f.q;
          return (
            <Card key={f.q} className="p-0 overflow-hidden">
              <button
                onClick={() => setOpenIdx(isOpen ? null : f.q)}
                aria-expanded={isOpen}
                className="w-full text-left px-4 py-3 flex items-center justify-between gap-3"
              >
                <span className="text-sm font-semibold text-ink">{f.q}</span>
                <span className="text-rust text-lg leading-none">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && <p className="px-4 pb-4 text-sm text-inkSoft">{f.a}</p>}
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function ContactForm({ onCreated }) {
  const [category, setCategory] = useState("pickup");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createTicket({ category, subject: subject.trim(), message: message.trim() });
      setSubject("");
      setMessage("");
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't send your request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4 mb-6">
      <h3 className="font-display font-bold text-ink mb-3">Contact support</h3>
      {error && (
        <div className="mb-3">
          <ErrorBox>{error}</ErrorBox>
        </div>
      )}
      <form onSubmit={submit} className="space-y-3">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="input w-full">
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} minLength={5} maxLength={100} required placeholder="Subject (short summary)" className="input w-full" />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} minLength={10} maxLength={2000} required rows={4} placeholder="Tell us what happened…" className="input w-full resize-none" />
        <button type="submit" disabled={busy} className="btn-primary text-sm disabled:opacity-50">
          {busy ? "Sending…" : "Send request"}
        </button>
      </form>
    </Card>
  );
}

function MyRequests() {
  const [tickets, setTickets] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    getMyTickets()
      .then((res) => setTickets(res.data.tickets))
      .catch(() => setError("Couldn't load your requests."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const open = async (id) => {
    try {
      setSelected((await getMyTicket(id)).data);
    } catch {
      setError("Couldn't open that request.");
    }
  };

  const reply = async (message) => {
    const res = await replyToMyTicket(selected.id, message);
    setSelected(res.data);
    load();
  };

  return (
    <>
      <ContactForm onCreated={load} />
      <h2 className="font-display text-lg font-bold text-ink mb-3">My requests</h2>
      {error && (
        <div className="mb-3">
          <ErrorBox>{error}</ErrorBox>
        </div>
      )}
      {tickets === null ? (
        <Loader />
      ) : tickets.length === 0 ? (
        <p className="text-sm text-inkSoft">You haven't contacted support yet.</p>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <div key={t.id}>
              <button onClick={() => (selected?.id === t.id ? setSelected(null) : open(t.id))} className="block w-full text-left">
                <Card className="p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-mono text-inkFaint">{t.ticketNo}</span>
                    <StatusPill status={t.status} />
                  </div>
                  <p className="text-sm font-semibold text-ink">{t.subject}</p>
                  <p className="text-xs text-inkSoft">
                    {CATEGORY_LABEL[t.category]}
                    {t.lastReplyBy === "admin" && t.status !== "closed" ? " · new reply from support" : ""}
                  </p>
                </Card>
              </button>
              {selected?.id === t.id && (
                <Card className="p-4 mt-2">
                  <TicketThread ticket={selected} viewerSide="requester" onReply={reply} canReply={selected.status !== "closed"} />
                </Card>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default function Help() {
  useDocumentMeta({ title: "Help centre" });
  const { user } = useAuth();
  const canContact = user && (user.role === "user" || user.role === "collector");

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Help centre</h1>
      <p className="text-sm text-inkSoft mb-6">Quick answers first. If you still need help, send us a message and we'll reply here.</p>

      <Faq />

      {canContact ? (
        <MyRequests />
      ) : !user ? (
        <Card className="p-4 text-sm text-inkSoft">
          <Link to="/login" className="text-rust font-semibold">Log in</Link> to contact support and track your requests.
        </Card>
      ) : null}
    </div>
  );
}