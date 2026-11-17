const fs = require("fs"),
  path = require("path"),
  os = require("os"),
  { spawn } = require("child_process");
const root = path.resolve(__dirname, ".."),
  toolRoot = process.env.BROWSER_TOOLS_DIR || root;
const { chromium, expect } = require(
  require.resolve("@playwright/test", { paths: [toolRoot] }),
);
const AxeBuilder = require(
  require.resolve("@axe-core/playwright", { paths: [toolRoot] }),
).default;
const config = JSON.parse(
  fs.readFileSync(path.join(root, "settings.json"), "utf8"),
);
const port = Number(process.env.TEST_PORT || config.port + 10000),
  base = "http://127.0.0.1:" + port,
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), config.slug + "-browser-"));
let browser, server;
const checks = [],
  errors = [];
function stop() {
  if (server && !server.killed) server.kill("SIGTERM");
}
process.on("SIGTERM", () => {
  stop();
  process.exit(143);
});
process.on("SIGINT", () => {
  stop();
  process.exit(130);
});
async function scan(page, label) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth + 1,
  );
  if (overflow || result.violations.length)
    throw Error(
      label +
        " " +
        JSON.stringify({
          overflow,
          violations: result.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => ({
              target: n.target,
              summary: n.failureSummary,
            })),
          })),
        }),
    );
  checks.push(label);
  console.log("PASS " + config.name + " · " + label);
}
async function submit(page) {
  await page.locator("#submit").click();
  await expect(page.locator("dialog")).not.toBeVisible();
}
async function nav(page, key) {
  await page.locator('[data-view="' + key + '"]').click();
}
async function click(page, name) {
  await page.getByRole("button", { name, exact: true }).click();
}
async function fill(page, label, text) {
  await page.getByLabel(label, { exact: true }).fill(String(text));
}
async function state() {
  return (await fetch(base + "/api/state")).json();
}
async function command(action) {
  const s = await state();
  const r = await fetch(base + "/api/commands", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Workspace": "1" },
    body: JSON.stringify({ revision: s.revision, action }),
  });
  if (!r.ok) throw Error(await r.text());
  return r.json();
}
async function main() {
  fs.mkdirSync(path.join(root, "artifacts"), { recursive: true });
  server = spawn(process.execPath, ["server.mjs"], {
    cwd: root,
    env: { ...process.env, PORT: String(port), APP_DATA_DIR: tmp },
    stdio: ["ignore", "ignore", "pipe"],
  });
  server.stderr.on("data", (d) => process.stderr.write(d));
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(base + "/health")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!ready) throw Error("Server did not start");
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.CHROMIUM_EXECUTABLE }
      : {}),
  });
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage();
  page.setDefaultTimeout(7000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await expect(page.locator("#navigation button").first()).toBeVisible();
  const views = [
    "board",
    "jobs",
    "customers",
    "parts",
    "team",
    "reports",
    "audit",
  ];
  for (const view of views) {
    await nav(page, view);
    await scan(page, "desktop " + view);
    if (view === views[0]) {
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: path.join(root, "artifacts/desktop.png"),
        fullPage: true,
      });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const view of views) {
    await nav(page, view);
    await scan(page, "mobile " + view);
    if (view === views[0]) {
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({
        path: path.join(root, "artifacts/mobile.png"),
        fullPage: true,
      });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });

  await nav(page, "jobs");
  await page
    .getByRole("row")
    .filter({ hasText: "Nordklang Verstärker" })
    .getByRole("button", { name: "Auftrag öffnen", exact: true })
    .click();
  await click(page, "Freigabe erfassen");
  await submit(page);
  let snapshot = await state();
  if (snapshot.parts.find((p) => p.id === 1).reserved !== 1)
    throw Error("No reservation");
  await click(page, "Reparatur starten");
  await submit(page);
  snapshot = await state();
  if (snapshot.parts.find((p) => p.id === 1).stock !== 7)
    throw Error("No consumption");
  await click(page, "Arbeitszeit erfassen");
  await fill(page, "Arbeitsminuten", "60");
  await fill(page, "Ausgeführte Arbeiten", "Regler und Kabel ausgetauscht.");
  await submit(page);
  await click(page, "Zur Abschlussprüfung");
  for (const kind of ["Funktion", "Sichtprüfung", "Fehlerbild"]) {
    const row = page
      .locator(".line")
      .filter({ has: page.getByText(kind, { exact: true }) });
    await row
      .getByRole("button", { name: "Ergebnis erfassen", exact: true })
      .click();
    await fill(page, "Prüfbefund", kind + " erfolgreich geprüft.");
    await submit(page);
  }
  await click(page, "Abholbereit melden");
  await scan(page, "repair detail after checks");
  await page.locator("#toast").waitFor({ state: "hidden" });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: path.join(root, "artifacts/repair-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await scan(page, "mobile repair detail");
  await click(page, "Abholung erfassen");
  await scan(page, "mobile pickup dialog");
  await submit(page);
  snapshot = await state();
  if (snapshot.jobs.find((j) => j.id === 1).status !== "collected")
    throw Error("Pickup not saved");
  await nav(page, "jobs");
  await page
    .getByRole("row")
    .filter({ hasText: "Leselampe Atelier" })
    .getByRole("button", { name: "Auftrag öffnen", exact: true })
    .click();
  await click(page, "Diagnose erfassen");
  await fill(
    page,
    "Diagnose",
    "Scharnier verschlissen, Austausch erforderlich.",
  );
  await submit(page);
  await click(page, "Kostenvoranschlag erstellen");
  await click(page, "＋ Ersatzteilposition");
  await page.getByLabel("Ersatzteil", { exact: true }).selectOption("3");
  await scan(page, "mobile quotation editor");
  await submit(page);
  snapshot = await state();
  if (snapshot.jobs.find((j) => j.id === 3).status !== "quoted")
    throw Error("Quotation not saved");
  checks.push(
    "Approve quote → reserve → start → consume → work log → three checks → ready → pickup; new quotation editor",
  );

  if (errors.length) throw Error("Page errors: " + errors.join("; "));
  fs.writeFileSync(
    path.join(root, "artifacts/browser-verification.json"),
    JSON.stringify(
      {
        app: config.name,
        verifiedAt: new Date().toISOString(),
        checks,
        pageErrors: errors,
        axeTags: ["wcag2a", "wcag2aa", "wcag21aa"],
        viewports: [
          [1440, 1000],
          [390, 844],
        ],
        note: "Automated rules and explicit workflows, not a complete accessibility audit.",
      },
      null,
      2,
    ) + "\n",
  );
  fs.rmSync(path.join(root, "artifacts/failure.png"), { force: true });
  await context.close();
  console.log("BROWSER CHECKS PASSED: " + config.name);
}
main()
  .catch(async (e) => {
    console.error(e);
    for (const c of browser?.contexts() || [])
      for (const p of c.pages()) {
        console.error(
          await p
            .locator("dialog")
            .innerText()
            .catch(() => ""),
        );
        await p
          .screenshot({
            path: path.join(root, "artifacts/failure.png"),
            fullPage: true,
          })
          .catch(() => {});
      }
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    stop();
    if (server?.exitCode === null)
      await new Promise((r) => server.once("exit", r));
    fs.rmSync(tmp, { recursive: true, force: true });
  });
