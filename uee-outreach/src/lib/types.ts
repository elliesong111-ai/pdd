export const STATUSES = ["not_contacted", "contacted", "replied", "scheduled", "done"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  not_contacted: "Not contacted",
  contacted: "Contacted",
  replied: "Replied",
  scheduled: "Scheduled",
  done: "Done",
};

export interface ActivityEntry {
  at: string; // ISO timestamp
  kind: "status" | "reply" | "draft" | "note";
  text: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  industry: string;
  linkedin: string;
  source: string; // how we found / who referred them
  notes: string; // anything known about them (posts, AI initiatives, etc.)
  status: Status;
  draft: string;
  draftSubject: string;
  lastContacted?: string;
  scheduledFor?: string;
  activity: ActivityEntry[];
}

export interface Interview {
  id: string;
  contactId?: string;
  title: string;
  date: string;
  text: string;
}

export interface Settings {
  senderName: string;
  senderTitle: string;
  school: string;
  projectName: string;
  projectPitch: string;
  ask: string; // e.g. "a 20-minute call"
  tone: "warm" | "concise" | "formal";
  channel: "email" | "linkedin";
  apiKey: string; // optional: only stored in this browser
  useClaude: boolean;
}

export interface Theme {
  id: string;
  label: string;
  description: string;
  interviewCount: number;
  mentions: number;
  sentiment: "positive" | "negative" | "mixed" | "neutral";
  quotes: { interviewTitle: string; text: string }[];
}

export interface ThemeReport {
  generatedAt: string;
  engine: "local" | "claude";
  interviewCount: number;
  themes: Theme[];
  emergingTerms: { term: string; count: number }[];
  summary: string;
}
