import Anthropic from "@anthropic-ai/sdk";
import type { Contact, Interview, Settings, ThemeReport } from "./types";
import { analyzeThemesLocal } from "./themes";

// Optional: real LLM mode using the user's own Anthropic API key, called straight from
// the browser. The key never leaves this device except to api.anthropic.com.
const MODEL = "claude-opus-5-5";

function client(apiKey: string) {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

async function ask(apiKey: string, system: string, user: string, format?: Record<string, unknown>): Promise<string> {
  const res = await client(apiKey).beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    // On a policy refusal, the API retries on a suitable fallback model automatically.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", ...(format ? { format: { type: "json_schema", schema: format } } : {}) },
    system,
    messages: [{ role: "user", content: user }],
  } as Parameters<ReturnType<typeof client>["beta"]["messages"]["create"]>[0]) as Anthropic.Beta.BetaMessage;
  if (res.stop_reason === "refusal") throw new Error("Claude declined this request.");
  return res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
}

export async function draftWithClaude(c: Contact, s: Settings): Promise<{ subject: string; body: string }> {
  const system =
    "You write short, genuine research-interview outreach messages for a student founder. " +
    "No flattery, no sales language, no invented facts: only use details present in the contact record. " +
    (s.channel === "linkedin" ? "Write a LinkedIn message under 600 characters with an empty subject." : "Write an email under 160 words with a specific subject line.");
  const user = JSON.stringify({
    sender: { name: s.senderName, title: s.senderTitle, school: s.school },
    project: { name: s.projectName, pitch: s.projectPitch, ask: s.ask },
    tone: s.tone,
    contact: { name: c.name, role: c.role, company: c.company, industry: c.industry, howWeFoundThem: c.source, notes: c.notes },
  });
  const text = await ask(s.apiKey, system, user, {
    type: "object",
    properties: { subject: { type: "string" }, body: { type: "string" } },
    required: ["subject", "body"],
    additionalProperties: false,
  });
  return JSON.parse(text);
}

export async function themesWithClaude(interviews: Interview[], apiKey: string): Promise<ThemeReport> {
  const usable = interviews.filter((i) => i.text.trim());
  const system =
    "You are a qualitative researcher synthesizing customer-discovery interviews about human–AI collaboration inside companies. " +
    "Identify 4-8 recurring themes. A theme must appear in at least two interviews when there are three or more interviews. " +
    "Quotes must be verbatim sentences copied from the notes. Count interviewCount honestly.";
  const user = usable.map((i) => `### ${i.title}\n${i.text}`).join("\n\n");
  const text = await ask(apiKey, system, user, {
    type: "object",
    properties: {
      summary: { type: "string" },
      themes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            description: { type: "string" },
            interviewCount: { type: "integer" },
            mentions: { type: "integer" },
            sentiment: { type: "string", enum: ["positive", "negative", "mixed", "neutral"] },
            quotes: {
              type: "array",
              items: { type: "object", properties: { interviewTitle: { type: "string" }, text: { type: "string" } }, required: ["interviewTitle", "text"], additionalProperties: false },
            },
          },
          required: ["label", "description", "interviewCount", "mentions", "sentiment", "quotes"],
          additionalProperties: false,
        },
      },
    },
    required: ["summary", "themes"],
    additionalProperties: false,
  });
  const parsed = JSON.parse(text) as Pick<ThemeReport, "summary" | "themes">;
  return {
    generatedAt: new Date().toISOString(),
    engine: "claude",
    interviewCount: usable.length,
    summary: parsed.summary,
    themes: parsed.themes.map((t, i) => ({ ...t, id: `c${i}` })),
    emergingTerms: analyzeThemesLocal(usable).emergingTerms,
  };
}
