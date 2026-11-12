import { useEffect, useState } from "react";
import { Wand2, Copy, Mail, Send, Sparkles, RotateCcw, Check, Loader2 } from "lucide-react";
import type { AppState } from "../lib/store";
import { daysSince, withStatus } from "../lib/store";
import { generateDraft, generateFollowUp, mailtoLink } from "../lib/drafts";
import { draftWithClaude } from "../lib/claude";
import type { Contact } from "../lib/types";
import { StatusBadge } from "./ContactsView";

type Queue = "to_contact" | "follow_up" | "all";

export default function OutreachView({ state, focusId, setFocusId }: { state: AppState; focusId: string | null; setFocusId: (id: string | null) => void }) {
  const { contacts, setContacts, updateContact, settings, setSettings } = state;
  const [queue, setQueue] = useState<Queue>("to_contact");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const needsFollowUp = (c: Contact) => c.status === "contacted" && (daysSince(c.lastContacted) ?? 0) >= 5;
  const list = contacts.filter((c) => queue === "all" || (queue === "to_contact" ? c.status === "not_contacted" : needsFollowUp(c)));
  const current = contacts.find((c) => c.id === focusId) ?? list[0] ?? null;
  useEffect(() => { if (!focusId && list[0]) setFocusId(list[0].id); }, [focusId, list, setFocusId]);

  const draftLocal = (c: Contact) => {
    const d = needsFollowUp(c) ? generateFollowUp(c, settings) : generateDraft(c, settings);
    return { ...c, draft: d.body, draftSubject: d.subject, activity: [...c.activity, { at: new Date().toISOString(), kind: "draft" as const, text: needsFollowUp(c) ? "Follow-up drafted" : "Outreach drafted" }] };
  };

  const draftOne = async (c: Contact) => {
    setErr(null);
    if (settings.useClaude && settings.apiKey) {
      setBusy(true);
      try {
        const d = await draftWithClaude(c, settings);
        updateContact(c.id, (x) => ({ ...x, draft: d.body, draftSubject: d.subject, activity: [...x.activity, { at: new Date().toISOString(), kind: "draft", text: "Outreach drafted with Claude" }] }));
      } catch (e) {
        setErr(`Claude call failed (${(e as Error).message}). Used the built-in drafting engine instead.`);
        updateContact(c.id, draftLocal);
      } finally { setBusy(false); }
    } else updateContact(c.id, draftLocal);
  };

  const draftAll = () => setContacts((cs) => cs.map((c) => (c.status === "not_contacted" && !c.draft ? draftLocal(c) : c)));

  const counts = { to_contact: contacts.filter((c) => c.status === "not_contacted").length, follow_up: contacts.filter(needsFollowUp).length, all: contacts.length };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="space-y-3">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
          {([["to_contact", "To contact"], ["follow_up", "Follow-ups"], ["all", "All"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => { setQueue(id); setFocusId(null); }} className={`flex-1 rounded-md px-2 py-1 ${queue === id ? "bg-white font-medium shadow" : "text-slate-600"}`}>{label} ({counts[id]})</button>
          ))}
        </div>
        <button className="btn-primary w-full justify-center" onClick={draftAll} disabled={!counts.to_contact}><Wand2 size={16} /> Draft all not-yet-contacted</button>
        <ul className="card max-h-[60vh] divide-y divide-slate-100 overflow-y-auto p-0">
          {list.map((c) => (
            <li key={c.id}>
              <button data-testid="outreach-item" onClick={() => setFocusId(c.id)} className={`w-full px-3 py-2 text-left hover:bg-slate-50 ${current?.id === c.id ? "bg-indigo-50" : ""}`}>
                <div className="flex items-center justify-between gap-2"><span className="font-medium">{c.name}</span><StatusBadge status={c.status} /></div>
                <div className="text-xs text-slate-500">{c.role}{c.company && ` · ${c.company}`}</div>
                <div className="text-xs">{c.draft ? <span className="text-emerald-700">Draft ready</span> : <span className="text-slate-400">No draft yet</span>}</div>
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="p-4 text-center text-sm text-slate-500">Nothing in this queue.</li>}
        </ul>
      </div>

      {current ? (
        <div className="card space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">{current.name} <StatusBadge status={current.status} /></h2>
              <p className="text-sm text-slate-500">{[current.role, current.company, current.industry].filter(Boolean).join(" · ")}</p>
              {current.notes && <p className="mt-1 text-sm text-slate-600"><b>Context:</b> {current.notes}</p>}
              {current.source && <p className="text-sm text-slate-600"><b>Source:</b> {current.source}</p>}
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <select aria-label="Tone" className="input w-auto" value={settings.tone} onChange={(e) => setSettings({ ...settings, tone: e.target.value as typeof settings.tone })}>
                <option value="warm">Warm</option><option value="concise">Concise</option><option value="formal">Formal</option>
              </select>
              <select aria-label="Channel" className="input w-auto" value={settings.channel} onChange={(e) => setSettings({ ...settings, channel: e.target.value as typeof settings.channel })}>
                <option value="email">Email</option><option value="linkedin">LinkedIn</option>
              </select>
              <button data-testid="generate" className="btn-primary" disabled={busy} onClick={() => draftOne(current)}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : current.draft ? <RotateCcw size={16} /> : settings.useClaude && settings.apiKey ? <Sparkles size={16} /> : <Wand2 size={16} />}
                {current.draft ? "Regenerate" : "Generate draft"}{settings.useClaude && settings.apiKey ? " (Claude)" : ""}
              </button>
            </div>
          </div>
          {err && <p className="rounded bg-rose-50 p-2 text-sm text-rose-700">{err}</p>}
          {settings.channel === "email" && (
            <label className="block"><span className="label">Subject</span>
              <input data-testid="draft-subject" className="input" value={current.draftSubject} onChange={(e) => updateContact(current.id, (x) => ({ ...x, draftSubject: e.target.value }))} /></label>
          )}
          <label className="block"><span className="label">Message (edit freely)</span>
            <textarea data-testid="draft-body" className="input h-72 font-sans leading-relaxed" value={current.draft} placeholder="Click “Generate draft” to write a personalized message from this contact's role, company, and notes."
              onChange={(e) => updateContact(current.id, (x) => ({ ...x, draft: e.target.value }))} /></label>
          {settings.channel === "linkedin" && <p className={`text-xs ${current.draft.length > 600 ? "text-rose-600" : "text-slate-500"}`}>{current.draft.length}/600 characters</p>}
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" disabled={!current.draft} onClick={async () => { await navigator.clipboard.writeText(current.draftSubject ? `Subject: ${current.draftSubject}\n\n${current.draft}` : current.draft); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
            </button>
            {current.email && settings.channel === "email" && (
              <a className={`btn-ghost ${!current.draft ? "pointer-events-none opacity-50" : ""}`} href={mailtoLink(current)}><Mail size={14} /> Open in my email app</a>
            )}
            <button data-testid="mark-contacted" className="btn-primary" disabled={!current.draft} onClick={() => updateContact(current.id, (x) => withStatus(x, "contacted", needsFollowUp(x) ? "Follow-up sent" : `Outreach sent via ${settings.channel}`))}>
              <Send size={14} /> I sent it, mark as contacted
            </button>
          </div>
          <p className="text-xs text-slate-500">The agent never sends messages. “Open in my email app” pre-fills a draft in your own mail client for you to review and send.</p>
        </div>
      ) : <div className="card text-slate-500">Select a contact.</div>}
    </div>
  );
}
