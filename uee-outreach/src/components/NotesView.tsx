import { useState } from "react";
import { Plus, Trash2, BarChart3, Download, Loader2, Sparkles, Quote } from "lucide-react";
import type { AppState } from "../lib/store";
import { sampleInterviews, withStatus } from "../lib/store";
import { analyzeThemesLocal, reportToMarkdown } from "../lib/themes";
import { themesWithClaude } from "../lib/claude";
import { uid } from "../lib/csv";
import { download } from "../lib/storage";
import type { Theme } from "../lib/types";

const SENTIMENT: Record<Theme["sentiment"], string> = {
  positive: "bg-emerald-100 text-emerald-800", negative: "bg-rose-100 text-rose-800", mixed: "bg-amber-100 text-amber-800", neutral: "bg-slate-100 text-slate-700",
};

export default function NotesView({ state }: { state: AppState }) {
  const { interviews, setInterviews, contacts, updateContact, report, setReport, settings } = state;
  const [title, setTitle] = useState("");
  const [contactId, setContactId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const add = () => {
    const c = contacts.find((x) => x.id === contactId);
    setInterviews((ivs) => [{ id: uid(), title: title.trim() || (c ? `${c.name}${c.company ? `, ${c.company}` : ""}` : `Interview ${ivs.length + 1}`), contactId: contactId || undefined, date, text }, ...ivs]);
    if (c && c.status !== "done") updateContact(c.id, (x) => withStatus(x, "done", "Interview notes added"));
    setTitle(""); setText(""); setContactId("");
  };

  const analyze = async () => {
    setErr(null);
    if (settings.useClaude && settings.apiKey) {
      setBusy(true);
      try { setReport(await themesWithClaude(interviews, settings.apiKey)); }
      catch (e) { setErr(`Claude call failed (${(e as Error).message}). Showing the built-in analysis instead.`); setReport(analyzeThemesLocal(interviews)); }
      finally { setBusy(false); }
    } else setReport(analyzeThemesLocal(interviews));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
      <div className="space-y-3">
        <div className="card space-y-2">
          <h2 className="font-semibold">Add interview notes</h2>
          <div className="grid grid-cols-2 gap-2">
            <select aria-label="Interviewee" className="input" value={contactId} onChange={(e) => setContactId(e.target.value)}>
              <option value="">Link to contact (optional)</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <input className="input" placeholder="Title (defaults to contact name)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea data-testid="notes-text" className="input h-40" placeholder="Paste raw notes or a transcript. Bullets, quotes, and messy text are all fine." value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn-primary" disabled={!text.trim()} onClick={add}><Plus size={16} /> Save notes</button>
        </div>
        <div className="card space-y-2 p-0">
          <div className="flex items-center justify-between px-3 pt-3"><h3 className="font-semibold">Interviews ({interviews.length})</h3>
            {interviews.length === 0 && <button className="btn-ghost" onClick={() => setInterviews(sampleInterviews(contacts))}>Load sample notes</button>}</div>
          <ul className="max-h-[40vh] divide-y divide-slate-100 overflow-y-auto">
            {interviews.map((iv) => (
              <li key={iv.id} className="group px-3 py-2">
                <div className="flex items-center justify-between"><span className="text-sm font-medium">{iv.title}</span>
                  <button aria-label={`Delete ${iv.title}`} className="text-slate-400 hover:text-rose-600" onClick={() => confirm(`Delete notes "${iv.title}"?`) && setInterviews((x) => x.filter((y) => y.id !== iv.id))}><Trash2 size={14} /></button></div>
                <div className="text-xs text-slate-500">{iv.date} · {iv.text.split(/\s+/).length} words</div>
                <p className="line-clamp-2 text-xs text-slate-600">{iv.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button data-testid="analyze" className="btn-primary" disabled={busy || interviews.length === 0} onClick={analyze}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : settings.useClaude && settings.apiKey ? <Sparkles size={16} /> : <BarChart3 size={16} />}
            Summarize into themes{settings.useClaude && settings.apiKey ? " (Claude)" : ""}
          </button>
          {report && <button className="btn-ghost" onClick={() => download("uee-interview-themes.md", reportToMarkdown(report), "text/markdown")}><Download size={16} /> Export Markdown</button>}
        </div>
        {err && <p className="rounded bg-rose-50 p-2 text-sm text-rose-700">{err}</p>}
        {!report && <div className="card text-sm text-slate-500">Click “Summarize into themes” to group recurring ideas across all interviews, with supporting quotes and sentiment.</div>}
        {report && (
          <div className="space-y-3" data-testid="theme-report">
            <div className="card bg-indigo-50/50">
              <div className="text-xs text-slate-500">{report.interviewCount} interviews · {report.engine === "claude" ? "Claude analysis" : "built-in codebook analysis"} · {new Date(report.generatedAt).toLocaleString()}</div>
              <p className="mt-1 text-sm text-slate-800">{report.summary}</p>
            </div>
            {report.themes.map((t, i) => (
              <div key={t.id} className="card" data-testid="theme-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">{i + 1}. {t.label}</h3>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 ${SENTIMENT[t.sentiment]}`}>{t.sentiment}</span>
                    <span className="text-slate-500">{t.interviewCount}/{report.interviewCount} interviews · {t.mentions} mentions</span>
                  </div>
                </div>
                <div className="mt-1 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-indigo-500" style={{ width: `${(t.interviewCount / Math.max(1, report.interviewCount)) * 100}%` }} /></div>
                <p className="mt-1 text-sm text-slate-600">{t.description}</p>
                <ul className="mt-2 space-y-1">
                  {t.quotes.map((q, j) => <li key={j} className="flex gap-1.5 text-sm text-slate-700"><Quote size={12} className="mt-1 shrink-0 text-slate-400" /><span>“{q.text}” <span className="text-xs text-slate-400">({q.interviewTitle})</span></span></li>)}
                </ul>
              </div>
            ))}
            {report.emergingTerms.length > 0 && (
              <div className="card"><h3 className="mb-2 font-semibold">Emerging terms (outside the codebook)</h3>
                <div className="flex flex-wrap gap-1.5">{report.emergingTerms.map((t) => <span key={t.term} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{t.term} · {t.count}</span>)}</div></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
