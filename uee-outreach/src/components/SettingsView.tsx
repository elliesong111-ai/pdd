import { KeyRound, RotateCcw } from "lucide-react";
import type { AppState } from "../lib/store";
import { DEFAULT_SETTINGS, sampleContacts, sampleInterviews } from "../lib/store";
import type { Settings } from "../lib/types";

export default function SettingsView({ state }: { state: AppState }) {
  const { settings, setSettings, setContacts, setInterviews, setReport } = state;
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setSettings({ ...settings, [k]: v });
  const text = (k: keyof Settings, label: string, placeholder = "") => (
    <label className="block"><span className="label">{label}</span>
      <input className="input" placeholder={placeholder} value={String(settings[k])} onChange={(e) => set(k, e.target.value as never)} /></label>
  );
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card space-y-3">
        <h2 className="font-semibold">Your outreach profile</h2>
        <p className="text-sm text-slate-500">Used to sign and frame every draft.</p>
        <div className="grid grid-cols-2 gap-2">{text("senderName", "Your name", "e.g. Alex Kim")}{text("senderTitle", "Your title")}</div>
        <div className="grid grid-cols-2 gap-2">{text("school", "School / organization")}{text("projectName", "Project name")}</div>
        {text("projectPitch", "One-line project description")}
        {text("ask", "What you're asking for")}
      </div>
      <div className="space-y-4">
        <div className="card space-y-3">
          <h2 className="flex items-center gap-1.5 font-semibold"><KeyRound size={16} /> AI engine</h2>
          <p className="text-sm text-slate-600">By default the agent uses a <b>built-in engine</b>: rule-based personalization and a human–AI collaboration codebook for themes. It's free, offline, and makes no network calls.</p>
          <p className="text-sm text-slate-600">Optionally, add your own Anthropic API key to write drafts and theme summaries with Claude. The key is stored only in this browser and sent only to api.anthropic.com.</p>
          <input type="password" className="input" placeholder="sk-ant-…" value={settings.apiKey} onChange={(e) => set("apiKey", e.target.value)} autoComplete="off" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.useClaude} disabled={!settings.apiKey} onChange={(e) => set("useClaude", e.target.checked)} /> Use Claude for drafts and themes</label>
        </div>
        <div className="card space-y-2">
          <h2 className="font-semibold">Data</h2>
          <p className="text-sm text-slate-600">Everything is saved in this browser's local storage. Nothing is uploaded. Use Export on each tab to move data back to Google Sheets or Docs.</p>
          <button className="btn-ghost" onClick={() => {
            if (!confirm("Reset everything to the fictional sample data? Your contacts, drafts, and notes in this browser will be replaced.")) return;
            const cs = sampleContacts();
            setContacts(cs); setInterviews(sampleInterviews(cs)); setReport(null); setSettings(DEFAULT_SETTINGS);
          }}><RotateCcw size={14} /> Reset to sample data</button>
        </div>
      </div>
    </div>
  );
}
