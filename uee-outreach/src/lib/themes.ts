import type { Interview, Theme, ThemeReport } from "./types";

interface ThemeDef { id: string; label: string; description: string; keywords: RegExp }

/** Codebook for human–AI collaboration research. Keywords are matched per sentence. */
export const CODEBOOK: ThemeDef[] = [
  { id: "trust", label: "Trust & reliability of AI output", description: "Whether people trust AI results, hallucinations, double-checking, accuracy concerns.",
    keywords: /\b(trust|distrust|hallucinat\w*|accura\w+|inaccura\w+|wrong|mistake\w*|errors?|double[- ]check\w*|verify\w*|verif\w+|reliab\w+|confiden(ce|t)|made[- ]up|fact[- ]check\w*)\b/i },
  { id: "productivity", label: "Productivity & time savings", description: "AI saving time, speeding up routine work, freeing capacity.",
    keywords: /\b(sav(e|es|ed|ing) (\w+ )?(time|hours?)|faster|speed\w*|productiv\w+|efficien\w+|hours? (a|per) week|automat\w+|first drafts?|busywork|repetitive|tedious|freed? up)\b/i },
  { id: "skills", label: "Skills, training & learning curve", description: "Training gaps, prompting skill, upskilling, onboarding to AI tools.",
    keywords: /\b(train(ing|ed)?|upskill\w*|reskill\w*|learn(ing)?|learning curve|prompt(ing|s)?|onboard\w*|workshops?|literacy|don'?t know how|figure (it )?out|tutorials?)\b/i },
  { id: "jobs", label: "Job security & role change", description: "Fear of replacement, changing role definitions, identity at work.",
    keywords: /\b(replac\w+|job security|lose (my|their|our) jobs?|layoffs?|headcount|threat\w*|anxi\w+|fear\w*|worr\w+|obsolete|role (is )?chang\w+|redefin\w+|career)\b/i },
  { id: "governance", label: "Policy, governance & data privacy", description: "Rules about which tools are allowed, confidential data, compliance, legal.",
    keywords: /\b(polic(y|ies)|governance|complian\w+|legal|privacy|confidential\w*|sensitive data|security team|approved tools?|ban(ned)?|block(ed)?|guardrails?|IT (approval|policy)|regulat\w+|GDPR|HIPAA|shadow (AI|IT))\b/i },
  { id: "workflow", label: "Workflow integration & handoffs", description: "Where AI fits in the process, handoffs between human and AI, tool switching.",
    keywords: /\b(workflows?|handoffs?|hand[- ]off|integrat\w+|copy[- ]?past\w*|switch(ing)? (between )?tools?|context switch\w*|process(es)?|pipeline|human[- ]in[- ]the[- ]loop|review step|approval step|fits? into)\b/i },
  { id: "leadership", label: "Leadership & culture of adoption", description: "Top-down mandates, champions, manager support, culture of experimentation.",
    keywords: /\b(leadership|executives?|management|managers?|mandate\w*|top[- ]down|bottom[- ]up|champions?|culture|buy[- ]in|encourag\w+|pilot\w*|experiment\w*|CEO|sponsor\w*)\b/i },
  { id: "roi", label: "Measuring value & ROI", description: "Difficulty measuring impact, cost of licenses, proving business value.",
    keywords: /\b(ROI|return on investment|measur\w+|metrics?|KPIs?|cost\w*|licen[cs]e\w*|budget\w*|business case|prove (the )?value|impact|worth it|pay(ing)? for)\b/i },
  { id: "tools", label: "Tool fragmentation & access", description: "Many disconnected tools, uneven access across teams, choosing tools.",
    keywords: /\b(too many tools|fragment\w*|ChatGPT|Copilot|Claude|Gemini|tool sprawl|different tools|access|seats?|rollout|enterprise (version|license|plan)|vendors?)\b/i },
  { id: "quality", label: "Quality, judgment & creativity", description: "Human judgment, taste, creativity, generic outputs, final accountability.",
    keywords: /\b(judg(e)?ment|quality|generic|bland|creativ\w+|nuance\w*|taste|accountab\w+|responsib\w+|human touch|final say|critical thinking|over[- ]?reli\w+|deskill\w*)\b/i },
];

const POS = /\b(love|great|helpful|game[- ]changer|easier|saves?|faster|better|excited|useful|enjoy|improv\w+|win|works well)\b/i;
const NEG = /\b(frustrat\w+|annoy\w+|worr\w+|fear\w*|hard|difficult|confus\w+|wrong|slow|problem\w*|issue\w*|risk\w*|concern\w*|don'?t trust|struggl\w+|anxi\w+|blocked|banned|waste)\b/i;

const STOP = new Set(("a an the and or but if then so of to in on at for with by from as is are was were be been being it its this that these those i me my we our you your he she they them their his her " +
  "not no do does did done have has had having can could would should will just really very also about into than too more most some any all what which who whom when where why how " +
  "every first biggest big still now much many new real main each other only even maybe clear hard good great well back own " +
  "like get got go going think thing things lot kind sort yeah um uh okay ok well say said says know mean people use used using one two make made way time day week work working because there here out up").split(" "));

export function splitSentences(text: string): string[] {
  return text.replace(/\r/g, "").split(/(?<=[.!?])\s+|\n+/).map((s) => s.replace(/^[-*•\s"]+|["\s]+$/g, "").trim()).filter((s) => s.length > 12);
}

function sentimentOf(pos: number, neg: number): Theme["sentiment"] {
  if (pos === 0 && neg === 0) return "neutral";
  if (pos > neg * 2) return "positive";
  if (neg > pos * 2) return "negative";
  return "mixed";
}

function tokens(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9'\s-]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));
}

/** Deterministic, offline theme synthesis (no network). */
export function analyzeThemesLocal(interviews: Interview[]): ThemeReport {
  const usable = interviews.filter((i) => i.text.trim());
  const themes: Theme[] = CODEBOOK.map((d) => {
    let mentions = 0, pos = 0, neg = 0;
    const seen = new Set<string>();
    const quotes: { interviewTitle: string; text: string; score: number }[] = [];
    for (const iv of usable) {
      for (const s of splitSentences(iv.text)) {
        const matches = s.match(new RegExp(d.keywords.source, "gi"));
        if (!matches) continue;
        mentions += matches.length;
        seen.add(iv.id);
        if (POS.test(s)) pos++;
        if (NEG.test(s)) neg++;
        quotes.push({ interviewTitle: iv.title, text: s.length > 240 ? s.slice(0, 237) + "…" : s, score: matches.length + (s.length > 40 ? 1 : 0) });
      }
    }
    // best quote per interview first, so evidence spans different people
    const picked: typeof quotes = [];
    const byIv = new Set<string>();
    for (const q of [...quotes].sort((a, b) => b.score - a.score)) {
      if (!byIv.has(q.interviewTitle)) { picked.push(q); byIv.add(q.interviewTitle); }
      if (picked.length >= 3) break;
    }
    return { id: d.id, label: d.label, description: d.description, interviewCount: seen.size, mentions,
      sentiment: sentimentOf(pos, neg), quotes: picked.map(({ interviewTitle, text }) => ({ interviewTitle, text })) };
  }).filter((t) => t.interviewCount > 0)
    .sort((a, b) => b.interviewCount - a.interviewCount || b.mentions - a.mentions);

  // emerging terms: words/bigrams that recur across >= 2 interviews and aren't codebook keywords
  const docFreq = new Map<string, Set<string>>();
  const count = new Map<string, number>();
  for (const iv of usable) {
    const toks = tokens(iv.text);
    const grams = [...toks, ...toks.slice(1).map((t, i) => `${toks[i]} ${t}`)];
    for (const g of grams) {
      if (CODEBOOK.some((d) => d.keywords.test(g))) continue;
      count.set(g, (count.get(g) ?? 0) + 1);
      if (!docFreq.has(g)) docFreq.set(g, new Set());
      docFreq.get(g)!.add(iv.id);
    }
  }
  const minDocs = usable.length >= 3 ? 2 : 1;
  const emergingTerms = [...count.entries()]
    .filter(([g]) => (docFreq.get(g)?.size ?? 0) >= minDocs)
    .map(([term, c]) => ({ term, count: c, docs: docFreq.get(term)!.size, bigram: term.includes(" ") }))
    .sort((a, b) => b.docs - a.docs || Number(b.bigram) - Number(a.bigram) || b.count - a.count)
    .slice(0, 12).map(({ term, count }) => ({ term, count }));

  const n = usable.length;
  const top = themes.slice(0, 3);
  const summary = n === 0
    ? "No interview notes yet. Paste notes to generate themes."
    : `Across ${n} interview${n === 1 ? "" : "s"}, the most recurring themes were ${top.map((t) => `${t.label.toLowerCase()} (${t.interviewCount}/${n})`).join(", ")}.` +
      (themes.find((t) => t.sentiment === "negative") ? ` Pain points concentrate in ${themes.filter((t) => t.sentiment === "negative").slice(0, 2).map((t) => t.label.toLowerCase()).join(" and ")}.` : "") +
      (themes.find((t) => t.sentiment === "positive") ? ` Positive signals show up around ${themes.filter((t) => t.sentiment === "positive").slice(0, 2).map((t) => t.label.toLowerCase()).join(" and ")}.` : "");

  return { generatedAt: new Date().toISOString(), engine: "local", interviewCount: n, themes, emergingTerms, summary };
}

export function reportToMarkdown(r: ThemeReport): string {
  const lines = [`# Interview themes (${r.interviewCount} interviews)`, "", `_Generated ${new Date(r.generatedAt).toLocaleString()} · engine: ${r.engine}_`, "", r.summary, ""];
  r.themes.forEach((t, i) => {
    lines.push(`## ${i + 1}. ${t.label}`, `${t.description}`, `- Interviews: ${t.interviewCount}/${r.interviewCount} · mentions: ${t.mentions} · sentiment: ${t.sentiment}`);
    t.quotes.forEach((q) => lines.push(`  - "${q.text}" (${q.interviewTitle})`));
    lines.push("");
  });
  if (r.emergingTerms.length) lines.push("## Emerging terms", r.emergingTerms.map((t) => `${t.term} (${t.count})`).join(", "));
  return lines.join("\n");
}
