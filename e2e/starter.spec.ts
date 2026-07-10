import "dotenv/config";
import { expect, test } from "@playwright/test";

// This is a real end-to-end test against the live OpenAI API and a live
// Postgres database (no mocks) — that's the point of a smoke test. It's
// skipped automatically until real credentials are configured; see
// twinkling-knitting-moth.md for the setup steps.
const hasRealEnv =
  Boolean(process.env.OPENAI_API_KEY) &&
  Boolean(process.env.DATABASE_URL) &&
  !process.env.DATABASE_URL?.includes("user:password@host");

test.describe("AI Starter — anonymous chat to structured plan", () => {
  test.skip(!hasRealEnv, "Requires a real DATABASE_URL and OPENAI_API_KEY — see README");

  test("anonymous visitor completes the advisor flow and gets a structured plan", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto("/starter");

    const input = page.getByPlaceholder("Kirjoita viestisi…");
    const sendButton = page.getByRole("button", { name: "Lähetä" });
    const messages = page.getByTestId("chat-message");

    async function sendMessage(text: string) {
      const countBefore = await messages.count();
      await input.fill(text);
      await sendButton.click();
      await expect(messages).toHaveCount(countBefore + 2, { timeout: 30_000 }); // user + assistant
    }

    await sendMessage(
      "Olen sähköasentaja ja harkitsen oman yrityksen perustamista. Olen tällä hetkellä palkkatöissä."
    );
    await sendMessage(
      "Tavoitteenani on siirtyä kokopäiväiseksi yrittäjäksi ja tehdä sähköasennus- ja korjaustöitä kotitalouksille pääkaupunkiseudulla."
    );

    const planHeading = page.getByRole("heading", { name: "Käynnistyssuunnitelmasi" });
    const showPlanButton = page.getByRole("button", { name: "Näytä käynnistyssuunnitelmani" });

    // The advisor decides pacing itself, so nudge it forward a bounded number
    // of turns rather than assuming a fixed conversation length.
    for (let i = 0; i < 6 && !(await planHeading.isVisible().catch(() => false)); i++) {
      if (await showPlanButton.isVisible().catch(() => false)) {
        await showPlanButton.click();
        break;
      }
      await sendMessage("Kyllä, kerro lisää ja kokoa suunnitelma kun olet valmis.");
    }

    await expect(planHeading).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("heading", { name: "Suositeltu yritysmuoto" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Rekisteröintilista" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "ALV ja YEL" })).toBeVisible();
  });
});
