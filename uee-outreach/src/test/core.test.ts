import { describe, it, expect } from "vitest";
import { parseCSV, csvToContacts, contactsToCSV, googleSheetCsvUrl } from "../lib/csv";
import { generateDraft, generateFollowUp, extractHook, roleGroup, firstName } from "../lib/drafts";
import { analyzeThemesLocal, reportToMarkdown, splitSentences } from "../lib/themes";
import { SAMPLE_CSV, SAMPLE_INTERVIEWS } from "../lib/sampleData";
import { DEFAULT_SETTINGS, withStatus } from "../lib/store";
import type { Interview } from "../lib/types";

const S = { ...DEFAULT_SETTINGS, senderName: "Test Sender" };

describe("CSV import/export", () => {
  it("parses quotes, escaped quotes, embedded commas and newlines", () => {
    const rows = parseCSV('a,b\n"x, y","he said ""hi""\nline2"\r\n');
    expect(rows).toEqual([["a", "b"], ["x, y", 'he said "hi"\nline2']]);
  });
  it("detects tab-separated paste from Google Sheets", () => {
    expect(parseCSV("Name\tEmail\nAna\ta@x.com")).toEqual([["Name", "Email"], ["Ana", "a@x.com"]]);
  });
  it("maps aliased headers, first/last name, status, and skips empty rows", () => {
    const r = csvToContacts("First Name,Last Name,E-mail,Organization,Job Title,Status,Favorite color\nAna,Lopez,ana@x.com,Acme,Head of HR,Replied,blue\n,,,,,,\n");
    expect(r.contacts).toHaveLength(1);
    expect(r.contacts[0]).toMatchObject({ name: "Ana Lopez", email: "ana@x.com", company: "Acme", role: "Head of HR", status: "replied" });
    expect(r.unmappedHeaders).toEqual(["Favorite color"]);
  });
  it("imports the sample list and round-trips through export", () => {
    const { contacts } = csvToContacts(SAMPLE_CSV);
    expect(contacts).toHaveLength(10);
    const again = csvToContacts(contactsToCSV(contacts)).contacts;
    expect(again.map((c) => [c.name, c.email, c.status, c.notes])).toEqual(contacts.map((c) => [c.name, c.email, c.status, c.notes]));
  });
  it("builds Google Sheets CSV export URLs", () => {
    expect(googleSheetCsvUrl("https://docs.google.com/spreadsheets/d/abc_123/edit#gid=42")).toBe("https://docs.google.com/spreadsheets/d/abc_123/export?format=csv&gid=42");
    expect(googleSheetCsvUrl("https://example.com")).toBeNull();
  });
});

describe("Draft generation", () => {
  const { contacts } = csvToContacts(SAMPLE_CSV);
  const maya = contacts[0];
  it("classifies roles", () => {
    expect(roleGroup("VP of Operations")).toBe("exec");
    expect(roleGroup("Director of People & Learning")).toBe("people");
    expect(roleGroup("Senior Data Scientist")).toBe("tech");
    expect(roleGroup("Marketing Coordinator")).toBe("other");
  });
  it("turns third-person notes into a second-person hook", () => {
    expect(extractHook("She posted about piloting AI tools.")).toBe("you posted about piloting AI tools");
    expect(extractHook("Leads an internal AI program")).toBe("you lead an internal AI program");
    expect(extractHook("")).toBeNull();
  });
  it("personalizes with name, company, notes, source and sender", () => {
    const d = generateDraft(maya, S);
    expect(d.subject).toContain("Maya");
    expect(d.body).toMatch(/^Hi Maya,/);
    expect(d.body).toContain("Babson alumni network");
    expect(d.body).toContain("you posted about piloting AI route-planning tools");
    expect(d.body).toContain("Northwind Logistics");
    expect(d.body).toContain("Test Sender");
    expect(d.body).not.toMatch(/undefined|\{company\}/);
  });
  it("produces distinct messages for every sample contact in every tone", () => {
    for (const tone of ["warm", "concise", "formal"] as const) {
      const bodies = contacts.map((c) => generateDraft(c, { ...S, tone }).body);
      expect(new Set(bodies).size).toBe(contacts.length);
      bodies.forEach((b) => expect(b).not.toMatch(/undefined|null|\{/));
    }
  });
  it("keeps LinkedIn messages short and subject-less", () => {
    for (const c of contacts) {
      const d = generateDraft(c, { ...S, channel: "linkedin" });
      expect(d.subject).toBe("");
      expect(d.body.length).toBeLessThanOrEqual(600);
    }
  });
  it("handles sparse contacts gracefully", () => {
    const d = generateDraft({ ...maya, name: "Dr. Sam", company: "", role: "", industry: "", notes: "", source: "" }, S);
    expect(d.body).toMatch(/^Hi Sam,/);
    expect(d.body).not.toMatch(/undefined|\{company\}/);
    expect(firstName("")).toBe("there");
  });
  it("writes follow-ups as replies", () => {
    const f = generateFollowUp({ ...maya, draftSubject: "Hello" }, S);
    expect(f.subject).toBe("Re: Hello");
    expect(f.body).toContain("Maya");
  });
});

describe("Status tracking", () => {
  const c = csvToContacts(SAMPLE_CSV).contacts[0];
  it("records transitions and replies in the activity log", () => {
    const contacted = withStatus(c, "contacted");
    expect(contacted.status).toBe("contacted");
    expect(contacted.lastContacted).toBeTruthy();
    const replied = withStatus(contacted, "replied", "Sure, Tuesday works");
    expect(replied.activity.map((a) => a.kind)).toEqual(["status", "status", "reply"]);
    expect(replied.activity[2].text).toBe("Sure, Tuesday works");
    expect(withStatus(replied, "replied")).toBe(replied); // no-op
  });
});

describe("Theme synthesis", () => {
  const ivs: Interview[] = SAMPLE_INTERVIEWS.map((s, i) => ({ id: String(i), title: s.title, date: "2026-11-01", text: s.text }));
  const r = analyzeThemesLocal(ivs);
  it("finds recurring themes ranked by how many interviews mention them", () => {
    expect(r.interviewCount).toBe(5);
    expect(r.themes.length).toBeGreaterThanOrEqual(6);
    const counts = r.themes.map((t) => t.interviewCount);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
    const byId = Object.fromEntries(r.themes.map((t) => [t.id, t]));
    for (const id of ["trust", "governance", "skills", "productivity", "jobs", "roi"]) expect(byId[id]?.interviewCount).toBeGreaterThanOrEqual(2);
    expect(byId.productivity.interviewCount).toBe(5); // every sample interview mentions time savings
    expect(byId.trust.interviewCount).toBe(3);
  });
  it("backs each theme with verbatim quotes from distinct interviews", () => {
    for (const t of r.themes) {
      expect(t.quotes.length).toBeGreaterThan(0);
      expect(new Set(t.quotes.map((q) => q.interviewTitle)).size).toBe(t.quotes.length);
      for (const q of t.quotes) {
        const src = ivs.find((i) => i.title === q.interviewTitle)!;
        expect(splitSentences(src.text).some((s) => s.startsWith(q.text.replace(/…$/, "")))).toBe(true);
      }
    }
  });
  it("flags governance as a pain point and writes a summary", () => {
    expect(r.themes.find((t) => t.id === "governance")!.sentiment).not.toBe("positive");
    expect(r.summary).toMatch(/Across 5 interviews/);
    expect(reportToMarkdown(r)).toContain("## 1.");
  });
  it("handles no notes", () => {
    const empty = analyzeThemesLocal([]);
    expect(empty.themes).toEqual([]);
    expect(empty.summary).toMatch(/No interview notes/);
  });
});

describe("Source phrasing", async () => {
  const { sourceSentence } = await import("../lib/drafts");
  it.each([
    ["Babson alumni network", "I came across your work through the Babson alumni network."],
    ["Referred by Prof. Kim", "Prof. Kim suggested I reach out to you."],
    ["Met at the Babson AI in Business panel", "We met at the Babson AI in Business panel, and I've wanted to follow up since."],
    ["LinkedIn search", "I came across your profile on LinkedIn."],
    ["Family friend intro", "I was introduced to you through a family friend."],
    ["Babson classmate's manager", "I was connected to you through a Babson classmate's manager."],
    ["Conference speaker list", "I came across your work through the conference speaker list."],
    ["Startup founder Slack group", "I came across your work through the startup founder Slack group."],
    ["Cold outreach", ""],
  ])("%s", (src, expected) => expect(sourceSentence(src)).toBe(expected));
});

describe("Hook rewriting covers all sample note styles", () => {
  it.each([
    ["She posted about piloting AI route-planning tools with dispatchers.", "you posted about piloting AI route-planning tools with dispatchers"],
    ["Leads an internal AI literacy program for 2000 staff.", "you lead an internal AI literacy program for 2000 staff"],
    ["Wrote a blog post on why analysts don't trust model outputs.", "you wrote a blog post on why analysts don't trust model outputs"],
    ["Runs the bank's GenAI governance working group.", "you run the bank's GenAI governance working group"],
    ["Building AI-assisted design workflows for a 15-person agency.", "you're building AI-assisted design workflows for a 15-person agency"],
    ["Rolled out AI quality inspection on two production lines.", "you rolled out AI quality inspection on two production lines"],
    ["Advises mid-size firms on AI adoption roadmaps.", "you advise mid-size firms on AI adoption roadmaps"],
    ["Spoke about rolling out Copilot to 5000 store employees.", "you spoke about rolling out Copilot to 5000 store employees"],
    ["Is evaluating AI contract review tools and worries about confidentiality.", "you're evaluating AI contract review tools"],
    ["Uses ChatGPT daily for campaign copy.", "you use ChatGPT daily for campaign copy"],
    ["He leads her team's AI pilot.", "you lead your team's AI pilot"],
  ])("%s", (note, expected) => expect(extractHook(note)).toBe(expected));
});
