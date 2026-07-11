import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage();
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} - ${name}${detail ? " — " + detail : ""}`);
}

// Dev-server-only flakiness (e.g. a route's first Turbopack compile racing a Server
// Action's fetch) can surface as a one-off "Failed to fetch" on an otherwise-correct
// action. Retry once before treating it as a real failure — but only re-click if the
// first click didn't actually navigate us away already (otherwise we'd be waiting for
// a button that no longer exists on the new page).
async function clickAndWaitForUrl(locator, urlPattern, timeout = 10000) {
  const page = locator.page();
  try {
    await locator.click();
    await page.waitForURL(urlPattern, { timeout });
  } catch {
    if (urlPattern.test(page.url())) return;
    await locator.click();
    await page.waitForURL(urlPattern, { timeout });
  }
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
await clickAndWaitForUrl(page.getByRole("main").getByRole("button", { name: "Luo tili" }), /\/login/);
check("signup redirects to /login?registered=1", page.url().includes("registered=1"), page.url());

// 6. Log in
await page.getByLabel("Sähköposti").fill(email);
await page.getByLabel("Salasana", { exact: true }).fill(password);
await clickAndWaitForUrl(page.getByRole("button", { name: "Kirjaudu sisään" }), /\/app/);
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
await clickAndWaitForUrl(page.getByRole("button", { name: "Lisää asiakas" }), /\/app\/customers\/[a-z0-9]{20,}$/);
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
const editUrl = page.url();
await page.getByRole("button", { name: "Muokkaa" }).click();
await page.getByLabel("Kaupunki").fill("Espoo");
await page.getByRole("button", { name: "Tallenna muutokset" }).click();
await page.waitForURL(editUrl, { timeout: 10000 });
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

// 16. Quotes: create a customer to quote against (the earlier one was deleted above)
await page.goto("http://localhost:3000/app/customers/new");
await page.getByLabel("Nimi").fill("Kirvesmies Oy");
await page.getByLabel("Sähköposti").fill("laskutus@kirvesmies.example");
await clickAndWaitForUrl(page.getByRole("button", { name: "Lisää asiakas" }), /\/app\/customers\/[a-z0-9]{20,}$/);

// 17. Quotes: empty state
await page.goto("http://localhost:3000/app/quotes");
check(
  "quotes page shows empty state initially",
  await page.getByText("Ei vielä tarjouksia.").isVisible().catch(() => false)
);

// 18. Quotes: create a quote with two line items
await page.getByRole("button", { name: "Uusi tarjous" }).click();
await page.getByLabel("Asiakas").click();
await page.getByRole("option", { name: "Kirvesmies Oy" }).click();
await page.getByLabel("Otsikko (valinnainen)").fill("Keittiöremontti");

const descriptionInputs = page.getByPlaceholder("Kuvaus");
const quantityInputs = page.getByPlaceholder("Määrä");
const priceInputs = page.getByPlaceholder("À-hinta €");
await descriptionInputs.nth(0).fill("Asennustyö");
await quantityInputs.nth(0).fill("3");
await priceInputs.nth(0).fill("45");

await page.getByRole("button", { name: "Lisää rivi" }).click();
await descriptionInputs.nth(1).fill("Kaapeli");
await quantityInputs.nth(1).fill("10");
await priceInputs.nth(1).fill("2.5");

await page.getByLabel("Alennus %").fill("10");
await clickAndWaitForUrl(page.getByRole("button", { name: "Luo tarjous" }), /\/app\/quotes\/[a-z0-9]{20,}$/);

// Manual expected total: (3*4500 + 10*250) = 16000 subtotal; -10% discount = 1600;
// after discount 14400; +25% VAT = 3600; total = 18000 cents = 180,00 EUR
check("new quote redirects to its detail page", true, page.url());
check("quote detail shows correct total after discount and VAT", await page.getByText("180,00").isVisible());

const quoteUrl = page.url();
const quoteId = quoteUrl.split("/").pop();

// 19. Quotes: appears in list
await page.goto("http://localhost:3000/app/quotes");
check("new quote appears in the list", await page.getByText("Kirvesmies Oy").isVisible());

// 20. Quotes: PDF download returns a real PDF
const pdfResponse = await page.request.get(`http://localhost:3000/app/quotes/${quoteId}/pdf`);
const pdfBody = await pdfResponse.body();
check(
  "PDF download returns a valid non-empty PDF",
  pdfResponse.ok() && pdfBody.subarray(0, 5).toString() === "%PDF-" && pdfBody.length > 500,
  `status=${pdfResponse.status()}, bytes=${pdfBody.length}`
);

// 21. Quotes: mark sent -> accept
await page.goto(quoteUrl);
await page.getByRole("button", { name: "Merkitse lähetetyksi" }).click();
await page.getByText("Lähetetty").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
check("quote status updates to Lähetetty after sending", await page.getByText("Lähetetty").isVisible());

await page.getByRole("button", { name: "Merkitse hyväksytyksi" }).click();
await page.getByText("Hyväksytty").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
check("quote status updates to Hyväksytty after accepting", await page.getByText("Hyväksytty").isVisible());

// 22. Quotes: editing an ACCEPTED quote is rejected (redirects back to detail, no form)
await page.goto(`http://localhost:3000/app/quotes/${quoteId}/edit`);
await page.waitForLoadState("networkidle");
check(
  "editing a non-DRAFT quote redirects away instead of showing the form",
  page.url() === quoteUrl,
  page.url()
);

// 23. Jobs: create a job for the existing test customer, starting soon (same calendar day/week)
function toDatetimeLocal(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
const jobStartAt = new Date(Date.now() + 60 * 60 * 1000);

await page.goto("http://localhost:3000/app/jobs/new");
await page.getByLabel("Asiakas").click();
await page.getByRole("option", { name: "Kirvesmies Oy" }).click();
await page.getByLabel("Otsikko").fill("Keittiöremontin asennus");
await page.getByLabel("Alkaa").fill(toDatetimeLocal(jobStartAt));
await page.getByRole("button", { name: "Lisää tehtävä" }).click();
await page.getByPlaceholder("Tehtävän kuvaus").fill("Puretaan vanhat kaapit");
await clickAndWaitForUrl(page.getByRole("button", { name: "Luo työ" }), /\/app\/jobs\/[a-z0-9]{20,}$/);
const jobUrl = page.url();
const jobId = jobUrl.split("/").pop();
check("creating a job redirects to its detail page", true, jobUrl);
check("job detail shows the initial task", await page.getByText("Puretaan vanhat kaapit").isVisible());

// 24. Jobs: appears in list
await page.goto("http://localhost:3000/app/jobs");
check("new job appears in the list", await page.getByText("Keittiöremontin asennus").isVisible());

// 25. Jobs: appears on the current week's schedule
await page.goto("http://localhost:3000/app/schedule");
check("new job appears on the week schedule", await page.getByText("Keittiöremontin asennus").isVisible());

// 26. Jobs: toggle a task
await page.goto(jobUrl);
await page.getByRole("button", { name: "Merkitse tehdyksi" }).click();
await page
  .getByRole("button", { name: "Merkitse tekemättömäksi" })
  .waitFor({ state: "visible", timeout: 10000 })
  .catch(() => {});
check(
  "task shows as done after toggling",
  await page.getByRole("button", { name: "Merkitse tekemättömäksi" }).isVisible()
);

// 27. Jobs: walk status SCHEDULED -> IN_PROGRESS -> COMPLETED
await page.getByRole("button", { name: "Aloita työ" }).click();
await page.getByText("Käynnissä").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
check("job status updates to Käynnissä after starting", await page.getByText("Käynnissä").isVisible());

await page.getByRole("button", { name: "Merkitse valmiiksi" }).click();
await page.getByText("Valmis").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
check("job status updates to Valmis after completing", await page.getByText("Valmis").isVisible());

// 28. Jobs: editing a COMPLETED job redirects away instead of showing the form
await page.goto(`http://localhost:3000/app/jobs/${jobId}/edit`);
await page.waitForLoadState("networkidle");
check(
  "editing a COMPLETED job redirects away instead of showing the form",
  page.url() === jobUrl,
  page.url()
);

// 29. Jobs: convert the already-accepted quote (from the Quotes section above) into a job
await page.goto(quoteUrl);
await clickAndWaitForUrl(page.getByRole("button", { name: "Muunna työksi" }), /\/app\/jobs\/[a-z0-9]{20,}\/edit$/);
await page.waitForLoadState("networkidle");
check("converting an accepted quote redirects to the new job's edit page", true, page.url());
const customerFieldText = await page.getByLabel("Asiakas").textContent();
check(
  "converted job is pre-filled with the quote's customer",
  customerFieldText?.includes("Kirvesmies Oy") ?? false,
  customerFieldText ?? "(empty)"
);

// 30. Invoices: empty state
await page.goto("http://localhost:3000/app/invoices");
check(
  "invoices page shows empty state initially",
  await page.getByText("Ei vielä laskuja.").isVisible().catch(() => false)
);

// 31. Invoices: create an invoice with two line items
await page.getByRole("button", { name: "Uusi lasku" }).click();
await page.getByLabel("Asiakas").click();
await page.getByRole("option", { name: "Kirvesmies Oy" }).click();
await page.getByLabel("Otsikko (valinnainen)").fill("Sähkötyöt");
await page.getByLabel("Eräpäivä (valinnainen)").fill("2026-12-31");

const invDescriptionInputs = page.getByPlaceholder("Kuvaus");
const invQuantityInputs = page.getByPlaceholder("Määrä");
const invPriceInputs = page.getByPlaceholder("À-hinta €");
await invDescriptionInputs.nth(0).fill("Asennustyö");
await invQuantityInputs.nth(0).fill("3");
await invPriceInputs.nth(0).fill("45");

await page.getByRole("button", { name: "Lisää rivi" }).click();
await invDescriptionInputs.nth(1).fill("Kaapeli");
await invQuantityInputs.nth(1).fill("10");
await invPriceInputs.nth(1).fill("2.5");

await clickAndWaitForUrl(page.getByRole("button", { name: "Luo lasku" }), /\/app\/invoices\/[a-z0-9]{20,}$/);

// Manual expected total: (3*4500 + 10*250) = 16000 subtotal; no discount;
// +25% VAT = 4000; total = 20000 cents = 200,00 EUR
check("new invoice redirects to its detail page", true, page.url());
check("invoice detail shows correct total", await page.getByText("200,00").isVisible());

const invoiceUrl = page.url();

// 32. Invoices: appears in list
await page.goto("http://localhost:3000/app/invoices");
check("new invoice appears in the list", await page.getByText("Kirvesmies Oy").isVisible());

// 33. Invoices: mark sent
await page.goto(invoiceUrl);
await page.getByRole("button", { name: "Merkitse lähetetyksi" }).click();
await page.getByText("Lähetetty").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
check("invoice status updates to Lähetetty after sending", await page.getByText("Lähetetty").isVisible());

// 34. Invoices: record a partial payment — status should stay SENT
await page.getByLabel("Summa (€)").fill("100");
await page.getByRole("button", { name: "Kirjaa maksu" }).click();
await page.getByText("Jäljellä").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
const partialPaymentText = await page.textContent("body");
check(
  "partial payment keeps status Lähetetty and shows remaining balance",
  partialPaymentText.includes("Lähetetty") && partialPaymentText.includes("100,00"),
  "checked for Lähetetty + 100,00 remaining"
);

// 35. Invoices: record a second payment completing the total — status should flip to Maksettu
await page.getByLabel("Summa (€)").fill("100");
await page.getByRole("button", { name: "Kirjaa maksu" }).click();
await page.getByText("Maksettu").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
check("invoice status auto-flips to Maksettu once fully paid", await page.getByText("Maksettu").isVisible());

// 36. Invoices: PDF download returns a real PDF
const invoiceId = invoiceUrl.split("/").pop();
const invoicePdfResponse = await page.request.get(`http://localhost:3000/app/invoices/${invoiceId}/pdf`);
const invoicePdfBody = await invoicePdfResponse.body();
check(
  "invoice PDF download returns a valid non-empty PDF",
  invoicePdfResponse.ok() &&
    invoicePdfBody.subarray(0, 5).toString() === "%PDF-" &&
    invoicePdfBody.length > 500,
  `status=${invoicePdfResponse.status()}, bytes=${invoicePdfBody.length}`
);

// 37. Invoices: create an invoice from the already-accepted quote (independent of the
// job conversion done earlier on the same quote)
await page.goto(quoteUrl);
await clickAndWaitForUrl(page.getByRole("button", { name: "Luo lasku" }), /\/app\/invoices\/[a-z0-9]{20,}\/edit$/);
await page.waitForLoadState("networkidle");
check("creating an invoice from an accepted quote redirects to its edit page", true, page.url());
const invoiceCustomerFieldText = await page.getByLabel("Asiakas").textContent();
check(
  "invoice created from a quote is pre-filled with the quote's customer",
  invoiceCustomerFieldText?.includes("Kirvesmies Oy") ?? false,
  invoiceCustomerFieldText ?? "(empty)"
);

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length > 0 ? 1 : 0);
