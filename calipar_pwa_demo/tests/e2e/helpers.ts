import { expect, type Page } from "@playwright/test";

export async function enterDemo(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByTestId("try-demo")).toContainText(
    "Try the interactive demo — no account needed",
  );
  await page.getByTestId("try-demo").click();

  const disclosure = page.getByRole("dialog");
  if (await disclosure.isVisible().catch(() => false)) {
    await expect(disclosure).toContainText(/synthetic|browser|local/i);
    await page.getByTestId("onboarding-continue").click();
  }

  await expect(page).toHaveURL(/\/dashboard\/?$/);
  await expect(page.getByTestId("app-shell")).toBeVisible();
  await expect(page.getByTestId("demo-workspace-banner")).toContainText(
    /stored in this browser/i,
  );
}

export async function assertNoRemoteBackends(page: Page): Promise<void> {
  const forbidden = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((entry) => {
        const url = new URL(entry);
        return (
          /firebase|googleapis|openrouter\.ai/i.test(url.hostname) ||
          [8000, 5432].includes(Number(url.port))
        );
      }),
  );
  expect(forbidden, "The browser must not call production backends or OpenRouter").toEqual([]);
}

export async function waitForSaved(page: Page): Promise<void> {
  await expect(page.getByTestId("autosave-status")).toHaveText(
    /^(Saved locally|Up to date)$/i,
    { timeout: 15_000 },
  );
}
