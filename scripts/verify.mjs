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

// 10. CRM: empty state
await page.goto("http://localhost:3000/app/customers");
check(
  "customers page shows empty state initially",
  await page.getByText("Ei vielä asiakkaita.").isVisible().catch(() => false)
);

// 11. CRM: create a customer
await page.getByRole("button", { name: "Uusi asiakas" }).click();
await page.getByLabel("Nimi").fill("Matti Meikäläinen");
await page.getByLabel("Sähköposti").fill("matti@example.com");
await page.getByLabel("Puhelin").fill("0401234567");
await page.getByLabel("Postinumero").fill("00100");
await page.getByLabel("Kaupunki").fill("Helsinki");
await page.getByRole("button", { name: "Lisää asiakas" }).click();
await page.waitForURL(/\/app\/customers\/[a-z0-9]+$/, { timeout: 10000 });
const nameHeading = page.getByRole("heading", { name: "Matti Meikäläinen" });
await nameHeading.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
check("creating a customer redirects to its detail page", true, page.url());
check("detail page shows the new customer's name", await nameHeading.isVisible());

// 12. CRM: appears in list
await page.goto("http://localhost:3000/app/customers");
check("new customer appears in the list", await page.getByText("Matti Meikäläinen").isVisible());

// 13. CRM: add a note
await page.getByText("Matti Meikäläinen").click();
await page.waitForURL(/\/app\/customers\/[a-z0-9]+$/);
await page.getByPlaceholder("Lisää muistiinpano tai yhteydenoton yhteenveto…").fill("Soitti ja pyysi tarjousta.");
await page.getByRole("button", { name: "Lisää muistiinpano" }).click();
await page.waitForTimeout(800);
check("note appears after adding it", await page.getByText("Soitti ja pyysi tarjousta.").isVisible());

// 14. CRM: edit the customer
await page.getByRole("button", { name: "Muokkaa" }).click();
await page.getByLabel("Kaupunki").fill("Espoo");
await page.getByRole("button", { name: "Tallenna muutokset" }).click();
await page.waitForTimeout(800);
const detailText = await page.textContent("body");
check("edited field (city) is reflected on the detail page", detailText.includes("Espoo"));

// 15. CRM: delete the customer (auto-accept the confirm dialog)
page.once("dialog", (dialog) => dialog.accept());
await page.getByRole("button", { name: "Poista asiakas" }).click();
await page.waitForURL(/\/app\/customers$/, { timeout: 10000 });
await page.getByText("Ei vielä asiakkaita.").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
check(
  "deleted customer no longer appears in the list",
  !(await page.getByText("Matti Meikäläinen").isVisible().catch(() => false))
);

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length > 0 ? 1 : 0);
