import type { Contact, Interview, Settings, Status, ThemeReport } from "./types";
import { STATUS_LABEL } from "./types";
import { usePersistentState } from "./storage";
import { csvToContacts, uid } from "./csv";
import { SAMPLE_CSV, SAMPLE_INTERVIEWS } from "./sampleData";

export const DEFAULT_SETTINGS: Settings = {
  senderName: "",
  senderTitle: "Student founder",
  school: "Babson College",
  projectName: "UEE",
  projectPitch: "a research project on how people and AI work together inside companies",
  ask: "a 20-minute conversation",
  tone: "warm",
  channel: "email",
  apiKey: "",
  useClaude: false,
};

export function sampleContacts(): Contact[] {
  const now = Date.now();
  return csvToContacts(SAMPLE_CSV).contacts.map((c, i) => {
    if (c.status === "not_contacted") return c;
    const daysAgo = 3 + i;
    const at = new Date(now - daysAgo * 86400000).toISOString();
    return { ...c, lastContacted: at, activity: [{ at, kind: "status", text: `Imported with status: ${STATUS_LABEL[c.status]}` }] };
  });
}

export function sampleInterviews(contacts: Contact[]): Interview[] {
  return SAMPLE_INTERVIEWS.map((s, i) => ({
    id: uid(),
    title: s.title,
    contactId: contacts.find((c) => c.name === s.contactName)?.id,
    date: new Date(Date.now() - (i + 1) * 2 * 86400000).toISOString().slice(0, 10),
    text: s.text,
  }));
}

export function withStatus(c: Contact, status: Status, note?: string): Contact {
  if (c.status === status && !note) return c;
  const at = new Date().toISOString();
  const activity = [...c.activity];
  if (c.status !== status) activity.push({ at, kind: "status", text: `${STATUS_LABEL[c.status]} → ${STATUS_LABEL[status]}` });
  if (note) activity.push({ at, kind: status === "replied" ? "reply" : "note", text: note });
  return { ...c, status, activity, lastContacted: status === "contacted" ? at : c.lastContacted };
}

export function daysSince(iso?: string): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function useAppState() {
  const [contacts, setContacts] = usePersistentState<Contact[]>("contacts", sampleContacts);
  const [interviews, setInterviews] = usePersistentState<Interview[]>("interviews", () => sampleInterviews(contacts));
  const [settings, setSettings] = usePersistentState<Settings>("settings", DEFAULT_SETTINGS);
  const [report, setReport] = usePersistentState<ThemeReport | null>("report", null);
  const updateContact = (id: string, fn: (c: Contact) => Contact) => setContacts((cs) => cs.map((c) => (c.id === id ? fn(c) : c)));
  return { contacts, setContacts, interviews, setInterviews, settings, setSettings, report, setReport, updateContact };
}
export type AppState = ReturnType<typeof useAppState>;
