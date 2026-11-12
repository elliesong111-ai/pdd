# UEE Outreach Agent

A working tool for the UEE customer-discovery project on human–AI collaboration. It takes you from a contact spreadsheet to a set of recurring interview themes:

1. **Import contacts**: paste cells copied from Google Sheets, upload a CSV, or read a published Google Sheet link. This is read-only and never edits the original sheet.
2. **Draft personalized outreach**: each message uses the person's role, company, industry, how you found them, and any notes you have (for example "posted about AI pilots"). You can pick a warm, concise, or formal tone, and email or LinkedIn (LinkedIn messages stay under 600 characters). You can draft one contact or all of them, and follow-ups are suggested for anyone contacted 5+ days ago with no reply.
3. **Track the pipeline**: each contact moves through Not contacted → Contacted → Replied → Scheduled → Done. You can log replies, schedule interviews, and see the full activity history per contact, plus the reply rate and which follow-ups are due.
4. **Turn interview notes into themes**: paste raw notes or transcripts. The agent groups them into recurring themes and shows, for each theme, how many interviews mention it, the overall sentiment, and verbatim supporting quotes. It also lists emerging terms, and you can export the result as Markdown.

## Safety by design
- **It never sends anything.** "Open in my email app" fills in a draft in your own mail client, and you review it and click send yourself. Nothing is marked "Contacted" until you confirm.
- **Data stays in your browser** (localStorage). Use **Export CSV** to take the updated pipeline back to Google Sheets.
- The demo ships with **fictional** contacts and interview notes (`example.com` addresses).

## AI engines
| Mode | How it works | Network |
|---|---|---|
| Built-in (default) | Rule-based personalization (role → research angle, notes → personal hook, source → opener) and a 10-theme human–AI collaboration codebook with sentiment and quote selection | None |
| Claude (optional) | Add your own Anthropic API key in **Settings**. Drafts and theme synthesis use `claude-opus-5-5` with structured JSON output and server-side refusal fallback | Browser → api.anthropic.com only |

If a Claude call fails, the app falls back to the built-in engine automatically.

## Develop
```bash
cd uee-outreach
npm install
npm run dev            # http://localhost:5173
npm test               # 37 unit tests (CSV import, drafts, status tracking, themes)
npm run build:single   # one self-contained HTML file in dist-single/
NODE_PATH=$(npm root -g) npm run e2e   # browser end-to-end test (Playwright)
```

Stack: Vite + React 18 + TypeScript + Tailwind CSS + lucide-react, the same stack Lovable generates, so the project can be connected to a Lovable project through GitHub.

## Code map
- `src/lib/csv.ts`: CSV/TSV parsing, header aliasing, export, Google Sheets URL handling
- `src/lib/drafts.ts`: personalized outreach and follow-up generation
- `src/lib/themes.ts`: interview theme codebook and synthesis
- `src/lib/claude.ts`: optional Claude mode
- `src/lib/store.ts`: state, status transitions, activity log
- `src/components/*`: Pipeline, Outreach drafts, Interviews & themes, Settings
