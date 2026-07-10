import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage();
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} - ${name}${detail ? " — " + detail : ""}`);
}

const email = `verify-${Date.now()}@example.com`;
const password = "verify-password-123";

// 1. Landing page
await page.goto("http://localhost:3000/");
check("landing page loads", (await page.title()).includes("Toimi"));

// 2. Dark mode toggle
const themeBefore = await page.evaluate(() => document.documentElement.classList.contains("dark"));
await page.getByRole("button", { name: "Vaihda teemaa" }).click();
await page.waitForTimeout(200);
const themeAfter = await page.evaluate(() => document.documentElement.classList.contains("dark"));
check("theme toggle flips light/dark mode", themeBefore !== themeAfter, `${themeBefore} -> ${themeAfter}`);

// 3. /app redirects to /login when unauthenticated
await page.goto("http://localhost:3000/app");
check("/app redirects unauthenticated users to /login", page.url().includes("/login"), page.url());

// 4. Visit /starter anonymously, send a message before signing up (to test session-link later)
await page.goto("http://localhost:3000/starter");
const [chatResponse] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/api/starter/chat") && r.request().method() === "POST"),
  page.getByPlaceholder("Kirjoita viestisi…").fill("Testiviesti ennen rekisteröitymistä").then(() =>
    page.getByRole("button", { name: "Lähetä" }).click()
  ),
]);
console.log(
  `  (debug) POST /api/starter/chat -> ${chatResponse.status()}, set-cookie: ${chatResponse.headers()["set-cookie"] ?? "(none)"}`
);
await page.waitForTimeout(300);
const starterCookiesBefore = await page.context().cookies();
const starterSid = starterCookiesBefore.find((c) => c.name === "toimi_starter_sid")?.value;
check("anonymous starter session cookie set", Boolean(starterSid), starterSid);

// 5. Sign up
await page.goto("http://localhost:3000/signup");
await page.getByLabel("Nimi").fill("Testi Testaaja");
await page.getByLabel("Sähköposti").fill(email);
await page.getByLabel("Salasana").fill(password);
await page.getByRole("main").getByRole("button", { name: "Luo tili" }).click();
await page.waitForURL(/\/login/, { timeout: 10000 });
check("signup redirects to /login?registered=1", page.url().includes("registered=1"), page.url());

// 6. Log in
await page.getByLabel("Sähköposti").fill(email);
await page.getByLabel("Salasana", { exact: true }).fill(password);
await page.getByRole("button", { name: "Kirjaudu sisään" }).click();
await page.waitForURL(/\/app/, { timeout: 10000 });
check("login redirects to /app", page.url().includes("/app"), page.url());

// 7. Dashboard shows user + company + OWNER role
const dashboardText = await page.textContent("body");
check("dashboard shows OWNER role", dashboardText.includes("OWNER"));
check("dashboard shows company name", dashboardText.includes("yritys"));

// 8. Refresh /starter — messages should persist across reload (same browser session/cookie)
await page.goto("http://localhost:3000/starter");
await page.waitForTimeout(1000);
const messageCountAfterReload = await page.getByTestId("chat-message").count();
check("starter messages persist across reload", messageCountAfterReload >= 1, `count=${messageCountAfterReload}`);

// 9. Signing up again with the same email shows a Finnish error, doesn't crash
await page.goto("http://localhost:3000/signup");
await page.getByLabel("Nimi").fill("Toinen Yritys");
await page.getByLabel("Sähköposti").fill(email);
await page.getByLabel("Salasana").fill(password);
await page.getByRole("main").getByRole("button", { name: "Luo tili" }).click();
await page.waitForTimeout(1000);
const duplicateErrorVisible = await page.getByText("Sähköpostiosoite on jo käytössä.").isVisible();
check("duplicate signup shows a friendly error instead of crashing", duplicateErrorVisible);

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length > 0 ? 1 : 0);
