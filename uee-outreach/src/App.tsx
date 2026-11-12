import { useState } from "react";
import { Users, Mail, NotebookPen, Settings as Cog, ShieldCheck } from "lucide-react";
import { useAppState } from "./lib/store";
import ContactsView from "./components/ContactsView";
import OutreachView from "./components/OutreachView";
import NotesView from "./components/NotesView";
import SettingsView from "./components/SettingsView";

const TABS = [
  { id: "contacts", label: "Pipeline", icon: Users },
  { id: "outreach", label: "Outreach drafts", icon: Mail },
  { id: "notes", label: "Interviews & themes", icon: NotebookPen },
  { id: "settings", label: "Settings", icon: Cog },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function App() {
  const state = useAppState();
  const [tab, setTab] = useState<Tab>("contacts");
  const [focusId, setFocusId] = useState<string | null>(null);
  const openDraft = (id: string) => { setFocusId(id); setTab("outreach"); };

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900">UEE Outreach Agent</h1>
            <p className="text-xs text-slate-500">Find, contact, and learn from interview candidates on human–AI collaboration</p>
          </div>
          <nav className="flex flex-wrap gap-1" role="tablist">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={`btn ${tab === id ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"}`}>
                <Icon size={16} /> {label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center justify-center gap-1.5 bg-amber-50 px-4 py-1 text-center text-xs text-amber-800">
          <ShieldCheck size={14} /> Nothing is sent automatically. Drafts open in your own email app only when you click. Data stays in this browser.
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-5">
        {tab === "contacts" && <ContactsView state={state} onDraft={openDraft} />}
        {tab === "outreach" && <OutreachView state={state} focusId={focusId} setFocusId={setFocusId} />}
        {tab === "notes" && <NotesView state={state} />}
        {tab === "settings" && <SettingsView state={state} />}
      </main>
    </div>
  );
}
