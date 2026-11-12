import type { Contact, Settings } from "./types";

type RoleGroup = "exec" | "people" | "tech" | "product" | "ops" | "consulting" | "other";

export function roleGroup(role: string): RoleGroup {
  const r = role.toLowerCase();
  if (/\b(ceo|cfo|coo|cto|cio|chief|founder|president|vp|vice president|head of|director|partner|gm|general manager)\b/.test(r) && !/hr|people|talent/.test(r)) return "exec";
  if (/\b(hr|people|talent|learning|l&d|recruit|chro|culture)\b/.test(r)) return "people";
  if (/\b(engineer|developer|data|ml|machine learning|ai|scientist|architect|it|analytics)\b/.test(r)) return "tech";
  if (/\b(product|pm|design|ux)\b/.test(r)) return "product";
  if (/\b(operations|ops|supply|process|program|project|transformation)\b/.test(r)) return "ops";
  if (/\b(consult|advisor|analyst|strategy)\b/.test(r)) return "consulting";
  return "other";
}

const ROLE_ANGLE: Record<RoleGroup, string> = {
  exec: "how leaders decide where AI should augment their teams versus where people need to stay in the loop",
  people: "how teams are being trained, reorganized, and supported as AI tools enter everyday work",
  tech: "what it actually takes to get AI tools adopted by the people who use them, beyond the technical rollout",
  product: "how product teams design workflows where people and AI share the work",
  ops: "where AI fits into real operational workflows, and where handoffs between people and AI break down",
  consulting: "the patterns you're seeing across clients as they bring AI into how their people work",
  other: "how people at work are actually collaborating with AI tools day to day",
};

const ROLE_QUESTION: Record<RoleGroup, string> = {
  exec: "what has (and hasn't) worked as {company} brings AI into the team",
  people: "how {company} is preparing employees to work alongside AI",
  tech: "the adoption challenges you've run into rolling out AI at {company}",
  product: "how you think about human–AI handoffs in your work at {company}",
  ops: "where AI has changed day-to-day workflows at {company}",
  consulting: "the human–AI collaboration patterns you see across organizations",
  other: "your experience with AI tools in your work at {company}",
};

export function firstName(name: string): string {
  const cleaned = name.replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, "").trim();
  return cleaned.split(/\s+/)[0] || "there";
}

const IRREGULAR_PAST = new Set("spoke wrote led built ran won gave took made began grew became taught brought sought held went said told found".split(" "));
const NOT_VERBS = new Set("this that these those the a an his her their its our my your news business process analytics operations sales".split(" "));

/** "uses" -> "use", "advises" -> "advise", "pushes" -> "push", "applies" -> "apply". */
function baseForm(verb: string): string {
  if (/ies$/.test(verb)) return verb.slice(0, -3) + "y";
  if (/(sh|ch|x|ss|zz)es$/.test(verb)) return verb.slice(0, -2);
  if (/[^s]s$/.test(verb)) return verb.slice(0, -1);
  return verb;
}

/** Pulls one usable personalization hook out of free-text notes, rewritten to address the person ("you ..."). */
export function extractHook(notes: string): string | null {
  if (!notes.trim()) return null;
  const sentence = notes.split(/(?<=[.!?])\s+|\n|;/).map((x) => x.trim()).find((x) => x.length > 8);
  if (!sentence) return null;
  let s = sentence.replace(/[.!?]+$/, "");
  s = s.replace(/^(she|he|they)\s+/i, "you ");
  const [w0, ...rest] = s.split(/\s+/);
  const w = w0.toLowerCase();
  if (w !== "you" && !NOT_VERBS.has(w)) {
    if (w === "is" || w === "are") s = ["you're", ...rest].join(" ");
    else if (w === "was" || w === "were") s = ["you were", ...rest].join(" ");
    else if (w === "has" || w === "have") s = ["you have", ...rest].join(" ");
    else if (/ing$/.test(w) && w.length > 5) s = ["you're", w, ...rest].join(" ");
    else if (/ed$/.test(w) || IRREGULAR_PAST.has(w)) s = ["you", w, ...rest].join(" ");
    else if (/[a-z]s$/.test(w) && !/ss$/.test(w) && w0 === w0.charAt(0).toUpperCase() + w0.slice(1).toLowerCase()) s = ["you", baseForm(w), ...rest].join(" ");
  } else if (w === "you") {
    // "you is/has/leads" fixes after pronoun swap
    const v = (rest[0] ?? "").toLowerCase();
    const fixed = v === "is" ? "are" : v === "was" ? "were" : v === "has" ? "have" : /[a-z]s$/.test(v) && !/ss$/.test(v) && !/ed$/.test(v) ? baseForm(v) : rest[0];
    s = ["you", fixed, ...rest.slice(1)].join(" ");
  }
  s = s.replace(/\b(her|his|their)\b/gi, "your").replace(/^you are\b/, "you're");
  // a second third-person verb ("... and worries about X") would read wrong after "you": keep the first clause
  const cut = s.replace(/,?\s+and\s+[a-z]+(?:ies|[^s\s]s)\b.*$/, "");
  if (cut.length >= 20) s = cut;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** Turns a free-text "source" (how we found them) into a natural opening sentence. */
export function sourceSentence(source: string): string {
  const src = source.trim().replace(/[.!]+$/, "");
  if (!src || /^cold( outreach| email)?$/i.test(src)) return "";
  let m: RegExpMatchArray | null;
  if ((m = src.match(/^(?:referred|recommended|introduced) by (.+)$/i))) return `${m[1]} suggested I reach out to you.`;
  if ((m = src.match(/^met (?:you )?(at|during|through) (.+)$/i))) return `We met ${m[1]} ${m[2]}, and I've wanted to follow up since.`;
  if (/linkedin/i.test(src)) return "I came across your profile on LinkedIn.";
  if ((m = src.match(/^(.+?)\s+intro(?:duction)?$/i))) return `I was introduced to you through a ${lowerFirst(m[1])}.`;
  if (/(manager|friend|colleague|classmate|professor|mentor|advisor)('s)?$/i.test(src)) return `I was connected to you through a ${lowerFirst(src)}.`;
  if (/^(i |we |you )/i.test(src)) return src.charAt(0).toUpperCase() + src.slice(1) + ".";
  return `I came across your work through ${/^(the|a|an|my|our) /i.test(src) ? "" : "the "}${lowerFirst(src)}.`;
}

const COMMON_FIRST_WORDS = new Set(("conference event panel speaker startup founder family friend mutual former alumni classmate colleague " +
  "company industry online website blog podcast newsletter article post twitter community meetup group class course " +
  "student professor student founder co-founder director head manager senior junior lead").split(" "));

/** Lowercases the first letter only when the first word is a common noun (keeps names like "Babson"). */
function lowerFirst(s: string): string {
  const first = s.split(/\s+/)[0].toLowerCase().replace(/'s$/, "");
  return COMMON_FIRST_WORDS.has(first) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

function titlePhrase(title: string): string {
  return /^[A-Z]{2}/.test(title) ? title : lowerFirst(title);
}

function fill(t: string, c: Contact): string {
  return t.replace(/\{company\}/g, c.company || "your organization");
}

export interface Draft { subject: string; body: string }

export function generateDraft(c: Contact, s: Settings): Draft {
  const group = roleGroup(c.role);
  const fname = firstName(c.name);
  const hook = extractHook(c.notes);
  const angle = ROLE_ANGLE[group];
  const question = fill(ROLE_QUESTION[group], c);
  const roleAt = [c.role, c.company && `at ${c.company}`].filter(Boolean).join(" ");
  const industry = c.industry ? ` in ${c.industry.toLowerCase()}` : "";
  const source = sourceSentence(c.source);
  const me = `${s.senderName || "[your name]"}${s.senderTitle ? `, ${titlePhrase(s.senderTitle)}` : ""}${s.school ? ` at ${s.school}` : ""}`;
  const sig = [s.senderName || "[your name]", s.senderTitle, s.school].filter(Boolean).join("\n");
  const project = s.projectName || "our project";
  const ask = s.ask || "a 20-minute conversation";

  const subject =
    s.tone === "formal"
      ? `Research interview request: human–AI collaboration${c.company ? ` at ${c.company}` : ""}`
      : s.tone === "concise"
        ? `${ask.replace(/^an?\s+/i, "").replace(/^\w/, (m) => m.toUpperCase())} on AI at work?`
        : `${fname}, would love your perspective on AI at work`;

  const opener = (() => {
    const bits: string[] = [];
    if (source) bits.push(source);
    if (hook) bits.push(`I noticed ${hook}, which is exactly the kind of experience we're trying to learn from.`);
    else if (roleAt) bits.push(`Your work as ${roleAt}${industry} caught my attention.`);
    return bits.join(" ");
  })();

  if (s.channel === "linkedin") {
    const body = [
      `Hi ${fname}, I'm ${s.senderName || "a student"}${s.school ? ` at ${s.school}` : ""}, working on ${project}, a study of ${angle}.`,
      hook ? `I saw ${hook}, and I'd value your take.` : roleAt ? `Given your role as ${roleAt}, I'd value your take.` : "",
      `Would you be open to ${ask}? No pitch, just research.`,
    ].filter(Boolean).join(" ");
    return { subject: "", body };
  }

  const lines: string[] = [];
  if (s.tone === "formal") {
    lines.push(`Dear ${c.name || fname},`, "");
    lines.push(`My name is ${me}. I am conducting research for ${project}${s.projectPitch ? `, ${s.projectPitch}` : ""}.`);
    if (opener) lines.push("", opener);
    lines.push("", `We are particularly interested in ${angle}. I would be grateful for ${ask} to learn about ${question}. Your responses will be kept confidential and used only for academic research.`);
    lines.push("", "Please let me know whether you would be available in the coming weeks. I am happy to work around your schedule.");
    lines.push("", "Kind regards,", sig);
  } else if (s.tone === "concise") {
    lines.push(`Hi ${fname},`, "");
    lines.push(`I'm ${s.senderName || "[your name]"}${s.school ? ` (${s.school})` : ""}, researching ${angle} for ${project}.${opener ? " " + opener : ""}`);
    lines.push("", `Could I borrow ${ask} to hear about ${question}? Happy to fit your calendar, and I'll share our findings afterward.`);
    lines.push("", "Thanks,", sig);
  } else {
    lines.push(`Hi ${fname},`, "");
    if (opener) lines.push(opener, "");
    lines.push(`I'm ${me}, and I'm working on ${project}${s.projectPitch ? `, ${s.projectPitch}` : ""}. We're talking with people about ${angle}.`);
    lines.push("", `Would you be open to ${ask} to share ${question}? There's no sales pitch, just learning, and I'd be glad to send you a summary of what we hear across interviews.`);
    lines.push("", "Would any time next week work for you?", "", "Best,", sig);
  }
  return { subject, body: lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() };
}

export function mailtoLink(c: Contact): string {
  return `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent(c.draftSubject)}&body=${encodeURIComponent(c.draft)}`;
}

/** Short, polite follow-up for people contacted a while ago with no reply. */
export function generateFollowUp(c: Contact, s: Settings): Draft {
  const fname = firstName(c.name);
  return {
    subject: c.draftSubject ? `Re: ${c.draftSubject}` : "Quick follow-up",
    body: `Hi ${fname},\n\nJust floating this back to the top of your inbox. I know things get busy. If ${s.ask || "a short conversation"} on how ${c.company || "your team"} is working with AI isn't possible right now, no worries at all. If someone else on your team would be a better fit, I'd appreciate an intro.\n\nThanks either way,\n${s.senderName || ""}`.trim(),
  };
}
