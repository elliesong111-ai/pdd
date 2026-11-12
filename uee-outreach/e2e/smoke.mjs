// End-to-end smoke test against the single-file build. Run: npm run build:single && npm run e2e
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright"); // uses globally installed Playwright
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const url = "file://" + path.resolve(here, "../dist-single/index.html");
const shots = process.env.SHOTS_DIR;
const assert = (cond, msg) => { if (!cond) throw new Error("FAIL: " + msg); console.log("ok -", msg); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("dialog", (d) => d.accept());
const requests = [];
page.on("request", (r) => { if (!r.url().startsWith("file:") && !r.url().startsWith("data:")) requests.push(r.url()); });
await page.goto(url);

// 1. Pipeline loads with sample data
assert(await page.getByTestId("contact-row").count() === 10, "10 sample contacts loaded");
assert((await page.getByTestId("count-not_contacted").innerText()).includes("5"), "5 not contacted");
if (shots) await page.screenshot({ path: `${shots}/1-pipeline.png` });

// 2. Import pasted CSV from Sheets (tab-separated)
await page.getByRole("button", { name: "Import contacts" }).click();
await page.getByTestId("import-text").fill("Name\tEmail\tCompany\tTitle\tNotes\nRiley Test\triley@example.org\tTestCo\tHead of People\tRuns an AI training pilot.");
assert((await page.getByTestId("import-preview").innerText()).includes("1 contacts found"), "import preview shows 1 contact");
await page.getByRole("button", { name: "Import 1" }).click();
assert(await page.getByTestId("contact-row").count() === 11, "imported contact appended");

// 3. Change status inline + log a reply in drawer
await page.getByLabel("Status for Riley Test").selectOption("contacted");
await page.getByText("Riley Test").click();
await page.getByTestId("reply-text").fill("Happy to chat next Tuesday!");
await page.getByRole("button", { name: "Save reply" }).click();
const drawer = page.getByTestId("contact-drawer");
assert(await drawer.getByText("Happy to chat next Tuesday!").isVisible(), "reply logged in activity");
assert(await drawer.getByText("Contacted → Replied").isVisible(), "status transition logged");
if (shots) await page.screenshot({ path: `${shots}/2-drawer.png` });
await page.getByLabel("Close").click();

// 4. Draft outreach for first not-contacted person, mark contacted
await page.getByRole("tab", { name: /Outreach/ }).click();
await page.getByTestId("generate").click();
const body = await page.getByTestId("draft-body").inputValue();
assert(body.startsWith("Hi Maya,") && body.includes("Northwind Logistics"), "personalized draft generated");
if (shots) await page.screenshot({ path: `${shots}/3-draft.png` });
await page.getByTestId("mark-contacted").click();
await page.getByRole("button", { name: /Draft all not-yet-contacted/ }).click();
assert((await page.getByText("Draft ready").count()) >= 4, "bulk drafted remaining contacts");

// 5. Themes
await page.getByRole("tab", { name: /Interviews/ }).click();
await page.getByTestId("analyze").click();
const n = await page.getByTestId("theme-card").count();
assert(n >= 6, `theme report has ${n} themes`);
if (shots) await page.screenshot({ path: `${shots}/4-themes.png`, fullPage: true });

// 6. Persistence across reload
await page.reload();
assert(await page.getByTestId("contact-row").count() === 11, "data persisted after reload");
assert((await page.getByTestId("count-contacted").innerText()).match(/\n\s*3\b/) !== null, "Maya now counted as contacted (3)");

assert(errors.length === 0, "no page errors " + errors.join("; "));
assert(requests.length === 0, "no external network requests " + requests.join(", "));
await browser.close();
console.log("E2E PASSED");
