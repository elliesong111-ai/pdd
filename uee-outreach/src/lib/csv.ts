import type { Contact } from "./types";

/** RFC-4180-ish CSV parser: quoted fields, escaped quotes, CRLF, commas/tabs. */
export function parseCSV(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delim = (firstLine.match(/\t/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delim) { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

const HEADER_ALIASES: Record<string, keyof Contact> = {
  name: "name", "full name": "name", fullname: "name", contact: "name",
  email: "email", "e-mail": "email", "email address": "email",
  company: "company", organization: "company", organisation: "company", org: "company", employer: "company",
  role: "role", title: "role", "job title": "role", position: "role",
  industry: "industry", sector: "industry",
  linkedin: "linkedin", "linkedin url": "linkedin", linkedin_url: "linkedin",
  source: "source", "how we met": "source", referral: "source", "referred by": "source",
  notes: "notes", note: "notes", context: "notes", comments: "notes", about: "notes",
  status: "status",
};

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function normalizeStatus(v: string): Contact["status"] {
  const s = v.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["contacted", "replied", "scheduled", "done"].includes(s)) return s as Contact["status"];
  if (s === "complete" || s === "completed" || s === "interviewed") return "done";
  return "not_contacted";
}

export interface ImportResult { contacts: Contact[]; skipped: number; unmappedHeaders: string[] }

/** Maps a CSV/TSV (with header row) into contacts. First+last name columns are merged. */
export function csvToContacts(input: string): ImportResult {
  const rows = parseCSV(input);
  if (rows.length < 2) return { contacts: [], skipped: 0, unmappedHeaders: [] };
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const firstIdx = headers.findIndex((h) => h === "first name" || h === "first_name" || h === "firstname");
  const lastIdx = headers.findIndex((h) => h === "last name" || h === "last_name" || h === "lastname");
  const unmapped = rows[0].filter((h, i) => !HEADER_ALIASES[headers[i]] && i !== firstIdx && i !== lastIdx && h.trim());
  const contacts: Contact[] = [];
  let skipped = 0;
  for (const r of rows.slice(1)) {
    const c: Contact = {
      id: uid(), name: "", email: "", company: "", role: "", industry: "", linkedin: "",
      source: "", notes: "", status: "not_contacted", draft: "", draftSubject: "", activity: [],
    };
    headers.forEach((h, i) => {
      const key = HEADER_ALIASES[h];
      const val = (r[i] ?? "").trim();
      if (!key || !val) return;
      if (key === "status") c.status = normalizeStatus(val);
      else (c as unknown as Record<string, string>)[key] = val;
    });
    if (!c.name && (firstIdx >= 0 || lastIdx >= 0)) {
      c.name = [r[firstIdx] ?? "", r[lastIdx] ?? ""].map((s) => s.trim()).filter(Boolean).join(" ");
    }
    if (!c.name && !c.email) { skipped++; continue; }
    if (!c.name) c.name = c.email.split("@")[0];
    contacts.push(c);
  }
  return { contacts, skipped, unmappedHeaders: unmapped };
}

function esc(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function contactsToCSV(contacts: Contact[]): string {
  const cols = ["name", "email", "company", "role", "industry", "linkedin", "source", "notes", "status", "lastContacted", "scheduledFor", "draftSubject", "draft"] as const;
  const lines = [cols.join(",")];
  for (const c of contacts) lines.push(cols.map((k) => esc(String(c[k] ?? ""))).join(","));
  return lines.join("\n");
}

/** Converts a normal Google Sheets URL into its CSV export URL (sheet must be shared/published). */
export function googleSheetCsvUrl(url: string): string | null {
  const m = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) return null;
  if (/\/pub\?/.test(url) || /output=csv/.test(url)) return url;
  const gid = url.match(/[#&?]gid=(\d+)/)?.[1] ?? "0";
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
}
