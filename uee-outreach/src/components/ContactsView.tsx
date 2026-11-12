import { useMemo, useRef, useState } from "react";
import { Upload, Download, Search, Trash2, X, MessageSquareReply, CalendarCheck, CheckCircle2, PenLine, Plus, Link2 } from "lucide-react";
import type { AppState } from "../lib/store";
import { daysSince, sampleContacts, withStatus } from "../lib/store";
import { STATUSES, STATUS_LABEL, type Contact, type Status } from "../lib/types";
import { contactsToCSV, csvToContacts, googleSheetCsvUrl, uid } from "../lib/csv";
import { download } from "../lib/storage";

export const STATUS_STYLE: Record<Status, string> = {
  not_contacted: "bg-slate-100 text-slate-700",
  contacted: "bg-sky-100 text-sky-800",
  replied: "bg-amber-100 text-amber-800",
  scheduled: "bg-violet-100 text-violet-800",
  done: "bg-emerald-100 text-emerald-800",
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export default function ContactsView({ state, onDraft }: { state: AppState; onDraft: (id: string) => void }) {
  const { contacts, setContacts, updateContact } = state;
  const [filter, setFilter] = useState<Status | "all">("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const counts = useMemo(() => Object.fromEntries(STATUSES.map((s) => [s, contacts.filter((c) => c.status === s).length])) as Record<Status, number>, [contacts]);
  const visible = contacts.filter((c) => (filter === "all" || c.status === filter) &&
    (!q || [c.name, c.company, c.role, c.industry, c.email].join(" ").toLowerCase().includes(q.toLowerCase())));
  const sel = contacts.find((c) => c.id === selected) ?? null;
  const replyRate = counts.contacted + counts.replied + counts.scheduled + counts.done
    ? Math.round(((counts.replied + counts.scheduled + counts.done) / (counts.contacted + counts.replied + counts.scheduled + counts.done)) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <button onClick={() => setFilter("all")} className={`card text-left ${filter === "all" ? "ring-2 ring-indigo-500" : ""}`}>
          <div className="text-xs text-slate-500">All contacts</div>
          <div className="text-2xl font-bold">{contacts.length}</div>
          <div className="text-xs text-slate-500">{replyRate}% reply rate</div>
        </button>
        {STATUSES.map((s) => (
          <button key={s} data-testid={`count-${s}`} onClick={() => setFilter(s)} className={`card text-left ${filter === s ? "ring-2 ring-indigo-500" : ""}`}>
            <div className="text-xs text-slate-500">{STATUS_LABEL[s]}</div>
            <div className="text-2xl font-bold">{counts[s]}</div>
            <div className="mt-1 h-1.5 rounded bg-slate-100"><div className={`h-1.5 rounded ${STATUS_STYLE[s].split(" ")[0]}`} style={{ width: `${contacts.length ? (counts[s] / contacts.length) * 100 : 0}%` }} /></div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-2.5 top-2 text-slate-400" />
          <input className="input pl-8" placeholder="Search name, company, role…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={() => setShowImport((v) => !v)}><Upload size={16} /> Import contacts</button>
        <button className="btn-ghost" onClick={() => {
          const c: Contact = { id: uid(), name: "New contact", email: "", company: "", role: "", industry: "", linkedin: "", source: "", notes: "", status: "not_contacted", draft: "", draftSubject: "", activity: [] };
          setContacts((cs) => [c, ...cs]); setSelected(c.id);
        }}><Plus size={16} /> Add</button>
        <button className="btn-ghost" onClick={() => download("uee-contacts.csv", contactsToCSV(contacts), "text/csv")}><Download size={16} /> Export CSV</button>
      </div>

      {showImport && <ImportPanel onImport={(list, mode) => { setContacts((cs) => (mode === "replace" ? list : [...cs, ...list])); setShowImport(false); }} />}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Company / role</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Last touch</th><th className="px-3 py-2 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {visible.map((c) => {
              const d = daysSince(c.lastContacted);
              const followUp = c.status === "contacted" && d !== null && d >= 5;
              return (
                <tr key={c.id} data-testid="contact-row" className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50 ${selected === c.id ? "bg-indigo-50" : ""}`} onClick={() => setSelected(c.id)}>
                  <td className="px-3 py-2"><div className="font-medium text-slate-900">{c.name}</div><div className="text-xs text-slate-500">{c.email}</div></td>
                  <td className="px-3 py-2"><div>{c.company}</div><div className="text-xs text-slate-500">{c.role}{c.industry && ` · ${c.industry}`}</div></td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <select aria-label={`Status for ${c.name}`} className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[c.status]}`} value={c.status}
                      onChange={(e) => updateContact(c.id, (x) => withStatus(x, e.target.value as Status))}>
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                    {c.scheduledFor && c.status === "scheduled" && <div className="mt-0.5 text-xs text-violet-700">{new Date(c.scheduledFor).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</div>}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {d === null ? "—" : d === 0 ? "today" : `${d}d ago`}
                    {followUp && <div className="font-medium text-rose-600">Follow-up due</div>}
                  </td>
                  <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                    <button className="btn-ghost" onClick={() => onDraft(c.id)}><PenLine size={14} /> {c.draft ? "View draft" : "Draft"}</button>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">No contacts here. Import a CSV or load the sample list.</td></tr>}
          </tbody>
        </table>
      </div>

      {sel && <ContactDrawer c={sel} onClose={() => setSelected(null)} onDraft={() => onDraft(sel.id)}
        update={(fn) => updateContact(sel.id, fn)}
        remove={() => { if (confirm(`Delete ${sel.name}?`)) { setContacts((cs) => cs.filter((c) => c.id !== sel.id)); setSelected(null); } }} />}
    </div>
  );
}

function ImportPanel({ onImport }: { onImport: (c: Contact[], mode: "append" | "replace") => void }) {
  const [text, setText] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<"append" | "replace">("append");
  const fileRef = useRef<HTMLInputElement>(null);
  const preview = text.trim() ? csvToContacts(text) : null;

  const fetchSheet = async () => {
    const url = googleSheetCsvUrl(sheetUrl);
    if (!url) { setMsg("That doesn't look like a Google Sheets link."); return; }
    setMsg("Reading sheet (read-only)…");
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const body = await res.text();
      if (/^\s*<!doctype html/i.test(body)) throw new Error("not public");
      setText(body); setMsg("Loaded. Review the preview below, then import.");
    } catch {
      setMsg("Couldn't read that sheet. In Google Sheets choose File → Share → Publish to web → CSV (or Download → CSV and upload the file here).");
    }
  };

  return (
    <div className="card space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <span className="label">Paste CSV / copy cells from Google Sheets</span>
          <textarea data-testid="import-text" className="input h-32 font-mono text-xs" placeholder={"Name,Email,Company,Title,Industry,Source,Notes\nJane Doe,jane@acme.com,Acme,Head of Ops,Retail,Babson alumni,Posted about AI pilots"} value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div className="space-y-3">
          <div>
            <span className="label">Upload a .csv file</span>
            <input ref={fileRef} type="file" accept=".csv,.tsv,text/csv" className="text-sm" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()); }} />
          </div>
          <div>
            <span className="label">Or a Google Sheets link (published / link-shared)</span>
            <div className="flex gap-2"><input className="input" placeholder="https://docs.google.com/spreadsheets/d/…" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} /><button className="btn-ghost" onClick={fetchSheet}><Link2 size={14} /> Read</button></div>
          </div>
          <button className="btn-ghost" onClick={() => onImport(sampleContacts(), "replace")}>Load fictional sample list</button>
          {msg && <p className="text-xs text-slate-600">{msg}</p>}
        </div>
      </div>
      <p className="text-xs text-slate-500">Recognized columns: Name (or First/Last name), Email, Company, Title/Role, Industry, LinkedIn, Source, Notes, Status. Import never changes the original spreadsheet.</p>
      {preview && (
        <div className="flex flex-wrap items-center gap-3 rounded-md bg-slate-50 p-2 text-sm">
          <span data-testid="import-preview"><b>{preview.contacts.length}</b> contacts found{preview.skipped ? `, ${preview.skipped} empty rows skipped` : ""}{preview.unmappedHeaders.length ? ` · ignored columns: ${preview.unmappedHeaders.join(", ")}` : ""}</span>
          <select className="input w-auto" value={mode} onChange={(e) => setMode(e.target.value as "append" | "replace")}><option value="append">Add to current list</option><option value="replace">Replace current list</option></select>
          <button className="btn-primary" disabled={!preview.contacts.length} onClick={() => onImport(preview.contacts, mode)}>Import {preview.contacts.length}</button>
        </div>
      )}
    </div>
  );
}

function ContactDrawer({ c, onClose, update, remove, onDraft }: { c: Contact; onClose: () => void; update: (fn: (c: Contact) => Contact) => void; remove: () => void; onDraft: () => void }) {
  const [reply, setReply] = useState("");
  const [when, setWhen] = useState(c.scheduledFor?.slice(0, 16) ?? "");
  const field = (k: keyof Contact, label: string, area = false) => (
    <label className="block">
      <span className="label">{label}</span>
      {area
        ? <textarea className="input h-20" value={String(c[k] ?? "")} onChange={(e) => update((x) => ({ ...x, [k]: e.target.value }))} />
        : <input className="input" value={String(c[k] ?? "")} onChange={(e) => update((x) => ({ ...x, [k]: e.target.value }))} />}
    </label>
  );
  return (
    <div className="fixed inset-0 z-20 flex justify-end bg-slate-900/30" onClick={onClose}>
      <aside data-testid="contact-drawer" className="h-full w-full max-w-md space-y-4 overflow-y-auto bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div><h2 className="text-lg font-semibold">{c.name}</h2><StatusBadge status={c.status} /></div>
          <button className="btn-ghost" aria-label="Close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="space-y-2 rounded-lg bg-slate-50 p-3">
          <span className="label">Log a reply</span>
          <textarea data-testid="reply-text" className="input h-16" placeholder="Paste or summarize their reply…" value={reply} onChange={(e) => setReply(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" disabled={!reply.trim()} onClick={() => { update((x) => withStatus(x, "replied", reply.trim())); setReply(""); }}><MessageSquareReply size={14} /> Save reply</button>
            <button className="btn-ghost" onClick={onDraft}><PenLine size={14} /> Open draft</button>
          </div>
          <span className="label pt-2">Schedule interview</span>
          <div className="flex gap-2">
            <input type="datetime-local" className="input" value={when} onChange={(e) => setWhen(e.target.value)} />
            <button className="btn-ghost" disabled={!when} onClick={() => update((x) => ({ ...withStatus(x, "scheduled", `Interview scheduled for ${new Date(when).toLocaleString()}`), scheduledFor: new Date(when).toISOString() }))}><CalendarCheck size={14} /> Schedule</button>
          </div>
          <button className="btn-ghost w-full justify-center" onClick={() => update((x) => withStatus(x, "done", "Interview completed"))}><CheckCircle2 size={14} /> Mark interview done</button>
        </div>

        {field("name", "Name")}{field("email", "Email")}
        <div className="grid grid-cols-2 gap-2">{field("company", "Company")}{field("role", "Role")}</div>
        <div className="grid grid-cols-2 gap-2">{field("industry", "Industry")}{field("source", "How we found them")}</div>
        {field("linkedin", "LinkedIn")}
        {field("notes", "What we know (used to personalize)", true)}

        <div>
          <span className="label">Activity</span>
          <ol className="space-y-1.5 border-l-2 border-slate-200 pl-3 text-sm">
            {[...c.activity].reverse().map((a, i) => (
              <li key={i}><span className="text-xs text-slate-400">{new Date(a.at).toLocaleString()}</span><div className={a.kind === "reply" ? "rounded bg-amber-50 p-1.5 italic" : ""}>{a.text}</div></li>
            ))}
            {c.activity.length === 0 && <li className="text-slate-400">No activity yet.</li>}
          </ol>
        </div>
        <button className="btn-ghost text-rose-600" onClick={remove}><Trash2 size={14} /> Delete contact</button>
      </aside>
    </div>
  );
}
