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

// 38. Expenses: empty state
await page.goto("http://localhost:3000/app/expenses");
check(
  "expenses page shows empty state initially",
  await page.getByText("Ei vielä kuluja.").isVisible().catch(() => false)
);

// 39. Expenses: create an expense linked to the earlier job
await page.getByRole("button", { name: "Uusi kulu" }).click();
await page.getByLabel("Kategoria").click();
await page.getByRole("option", { name: "Materiaali" }).click();
await page.getByLabel("Kuvaus").fill("Kaapelit ja liittimet");
await page.getByLabel("Summa (€)").fill("87.50");
await page.getByLabel("Päivämäärä").fill("2026-07-01");
await page.getByLabel("Toimittaja (valinnainen)").fill("K-Rauta");
await page.getByLabel("Liitetty työ (valinnainen)").click();
await page.getByRole("option", { name: "Keittiöremontin asennus" }).click();
await clickAndWaitForUrl(page.getByRole("button", { name: "Lisää kulu" }), /\/app\/expenses$/);
check("creating an expense redirects to the expense list", true, page.url());
check("new expense appears in the list", await page.getByText("Kaapelit ja liittimet").isVisible());
check("expense list shows the correct amount", await page.getByRole("cell", { name: "87,50" }).isVisible());
const expenseStatsText = await page.locator('[data-slot="card-content"]').first().textContent();
check("expense stats strip shows the same total for this month", expenseStatsText?.includes("87,50") ?? false);
check("expense list shows the linked job", await page.getByText("Keittiöremontin asennus").isVisible());

// 40. Expenses: edit it
await page.getByText("Kaapelit ja liittimet").click();
await page.waitForURL(/\/app\/expenses\/[a-z0-9]{20,}\/edit$/);
await page.getByLabel("Kuvaus").fill("Kaapelit, liittimet ja putket");
await clickAndWaitForUrl(page.getByRole("button", { name: "Tallenna muutokset" }), /\/app\/expenses$/);
check(
  "edited expense description is reflected in the list",
  await page.getByText("Kaapelit, liittimet ja putket").isVisible()
);

// 41. Expenses: delete it (auto-accept the confirm dialog)
page.once("dialog", (dialog) => dialog.accept());
await page.getByRole("button", { name: "Poista" }).click();
await page.waitForTimeout(800);
check(
  "deleted expense no longer appears in the list",
  !(await page.getByText("Kaapelit, liittimet ja putket").isVisible().catch(() => false))
);

// 42. Reports: create a persistent expense (not deleted) linked to the quote-converted
// job ("Keittiöremontti"), in a distinct category, so the reports checks below have known
// figures to assert against. Leaves the date field on its today-default (Module 8's fix).
await page.goto("http://localhost:3000/app/expenses/new");
await page.getByLabel("Kategoria").click();
await page.getByRole("option", { name: "Kalusto" }).click();
await page.getByLabel("Kuvaus").fill("Poravasara vuokraus");
await page.getByLabel("Summa (€)").fill("30");
await page.getByLabel("Toimittaja (valinnainen)").fill("Cramo");
await page.getByLabel("Liitetty työ (valinnainen)").click();
await page.getByRole("option", { name: "Keittiöremontti", exact: true }).click();
await clickAndWaitForUrl(page.getByRole("button", { name: "Lisää kulu" }), /\/app\/expenses$/);
check("creating the reports-verification expense redirects to the expense list", true, page.url());

// 43. Reports: monthly profit, category breakdown, top customers, job profitability
// Expected figures: job "Keittiöremontti" has an invoice (from step 37, copied from the
// accepted quote: 180,00 EUR total) and now one linked expense (30,00 EUR) -> profit
// 150,00 EUR. This month's payments total 200,00 EUR (from the fully-paid invoice in
// steps 34-35) and this month's only expense is the 30,00 EUR one just created ->
// Tulos tässä kuussa = 170,00 EUR.
await page.goto("http://localhost:3000/app/reports");
check("reports page loads", await page.getByRole("heading", { name: "Raportit" }).isVisible());

const kalustoRowText = await page.getByTestId("expense-category-EQUIPMENT").textContent();
check(
  "expense category breakdown shows Kalusto with the correct total",
  kalustoRowText?.includes("30,00") ?? false,
  kalustoRowText ?? "(missing)"
);

check(
  "top customers table includes the test customer",
  await page.getByText("Kirvesmies Oy").first().isVisible()
);

check(
  "job profitability table shows the quote-converted job",
  await page.getByRole("cell", { name: "Keittiöremontti", exact: true }).isVisible()
);
check("job profitability shows the expected revenue", await page.getByRole("cell", { name: "180,00" }).isVisible());
check("job profitability shows the expected expense", await page.getByRole("cell", { name: "30,00" }).isVisible());
check("job profitability shows the expected profit", await page.getByRole("cell", { name: "150,00" }).isVisible());

check("monthly profit stat shows the expected figure", await page.getByText("170,00").isVisible());

// 44. Copilot: page loads, sending a message doesn't crash the app either way (real
// reply or the friendly 502 fallback — same no-OpenAI-key-required pattern as /starter)
await page.goto("http://localhost:3000/app/copilot");
check("copilot page loads", await page.getByRole("heading", { name: "AI-copilot" }).isVisible());

const [copilotResponse] = await Promise.all([
  page.waitForResponse((r) => r.url().includes("/api/copilot/chat") && r.request().method() === "POST"),
  page.getByPlaceholder("Kirjoita viestisi…").fill("Mitkä laskut ovat myöhässä?").then(() =>
    page.getByRole("button", { name: "Lähetä" }).click()
  ),
]);
console.log(`  (debug) POST /api/copilot/chat -> ${copilotResponse.status()}`);
check(
  "copilot chat endpoint responds without a server crash",
  copilotResponse.status() === 200 || copilotResponse.status() === 502
);
await page.waitForTimeout(500);
const copilotBodyText = await page.textContent("body");
check(
  "copilot shows either a real reply or the friendly unavailable message",
  copilotResponse.status() === 200
    ? (await page.getByTestId("copilot-message").count()) >= 2
    : copilotBodyText.includes("AI-copilot ei ole juuri nyt käytettävissä")
);

// 45. Copilot: message history persists across reload
await page.goto("http://localhost:3000/app/copilot");
await page.waitForTimeout(500);
const copilotMessageCount = await page.getByTestId("copilot-message").count();
check("copilot messages persist across reload", copilotMessageCount >= 1, `count=${copilotMessageCount}`);

// 46. Credit notes & late-fee interest: create an overdue invoice (due date well in the
// past, marked SENT, never paid) to exercise both the overdue/late-fee display and credit
// notes against the same invoice.
await page.goto("http://localhost:3000/app/invoices/new");
await page.getByLabel("Asiakas").click();
await page.getByRole("option", { name: "Kirvesmies Oy" }).click();
await page.getByLabel("Otsikko (valinnainen)").fill("Konsultointi");
await page.getByLabel("Eräpäivä (valinnainen)").fill("2026-01-01");
await page.getByPlaceholder("Kuvaus").fill("Konsultointityö");
await page.getByPlaceholder("Määrä").fill("1");
await page.getByPlaceholder("À-hinta €").fill("500");
await clickAndWaitForUrl(page.getByRole("button", { name: "Luo lasku" }), /\/app\/invoices\/[a-z0-9]{20,}$/);
check("overdue-test invoice redirects to its detail page", true, page.url());
check("overdue-test invoice shows correct total (500 + 25% VAT)", await page.getByText("625,00").isVisible());

const overdueInvoiceUrl = page.url();
await page.getByRole("button", { name: "Merkitse lähetetyksi" }).click();
await page.getByText("Lähetetty").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});

// 47. Overdue badge and late-fee estimate both appear (presence only — the exact figure
// is time-dependent, so it isn't hardcoded)
check("overdue invoice shows the Myöhässä badge", await page.getByText("Myöhässä").isVisible());
check(
  "overdue invoice shows an estimated late-fee interest line",
  await page.getByText("Arvioitu viivästyskorko").isVisible()
);

// 48. Create a credit note against it and confirm the balance due drops by exactly the
// credited amount (100,00: 80,00 pretax + 25% VAT)
const overdueInvoiceUrlExact = new RegExp(`^${overdueInvoiceUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
await clickAndWaitForUrl(
  page.getByRole("button", { name: "Luo hyvityslasku" }),
  /\/app\/invoices\/[a-z0-9]{20,}\/credit-notes\/new$/
);
await page.getByLabel("Syy (valinnainen)").fill("Virheellinen veloitus");
await page.getByPlaceholder("Kuvaus").fill("Hyvitys: virheellinen veloitus");
await page.getByPlaceholder("Määrä").fill("1");
await page.getByPlaceholder("À-hinta €").fill("80");
await clickAndWaitForUrl(page.getByRole("button", { name: "Luo hyvityslasku" }), overdueInvoiceUrlExact);
check("creating a credit note redirects back to the invoice detail page", true, page.url());
const creditNoteRow = page.locator("li").filter({ hasText: /Hyvityslasku #\d+/ });
check("credit note appears in the Hyvityslaskut list", await creditNoteRow.isVisible());
check(
  "credit note shows the correct total",
  (await creditNoteRow.textContent())?.includes("100,00") ?? false
);
check(
  "invoice balance due drops by the credited amount (625,00 - 100,00 = 525,00)",
  await page.getByText("525,00").isVisible()
);

// 49. Credit note PDF downloads validly
const creditNotePdfHref = await creditNoteRow.locator("a").getAttribute("href");
const creditNotePdfResponse = await page.request.get(`http://localhost:3000${creditNotePdfHref}`);
const creditNotePdfBody = await creditNotePdfResponse.body();
check(
  "credit note PDF download returns a valid non-empty PDF",
  creditNotePdfResponse.ok() &&
    creditNotePdfBody.subarray(0, 5).toString() === "%PDF-" &&
    creditNotePdfBody.length > 500,
  `status=${creditNotePdfResponse.status()}, bytes=${creditNotePdfBody.length}`
);

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length > 0 ? 1 : 0);
