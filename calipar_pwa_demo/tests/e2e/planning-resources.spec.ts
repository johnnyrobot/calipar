import { expect, test } from "@playwright/test";
import { enterDemo } from "./helpers";

test("creates and advances an action plan in the local workspace", async ({
  page,
}) => {
  await enterDemo(page);
  await page.goto("/planning/");
  const title = `Gateway support ${Date.now()}`;

  await page.getByRole("button", { name: "Add action plan" }).click();
  const dialog = page.getByRole("dialog", { name: "Add an action plan" });
  await dialog.getByLabel("Action title").fill(title);
  await dialog
    .getByLabel("What will change?")
    .fill("Pilot an evidence-linked support milestone in the synthetic demo.");
  await dialog
    .getByRole("button", { name: "Create action plan" })
    .click();

  const card = page.getByRole("article").filter({ hasText: title });
  await expect(card).toBeVisible();
  await expect(
    page.locator('[aria-label="Action plans by status"]'),
  ).toContainText(title);
  await card.getByRole("button", { name: /Advance/i }).click();
  await expect(
    page.locator(".plan-column").filter({
      has: page.getByRole("heading", { name: "Ongoing" }),
    }),
  ).toContainText(title);
});

test("creates and deletes a resource request with confirmation", async ({
  page,
}) => {
  await enterDemo(page);
  await page.goto("/resources/");
  const title = `Synthetic materials ${Date.now()}`;

  await page.getByRole("button", { name: "New request" }).click();
  const dialog = page.getByRole("dialog", { name: "New resource request" });
  await dialog.getByLabel("Request title").fill(title);
  await dialog
    .getByLabel("Rationale and expected result")
    .fill("Support the local demonstration workflow.");
  await dialog.getByLabel("Object code").selectOption("4000");
  await dialog.getByLabel("Amount (USD)").fill("1234");
  await dialog.getByRole("button", { name: "Add request" }).click();

  const row = page.getByRole("row").filter({ hasText: title });
  await expect(row).toContainText("$1,234");
  await row.getByRole("button", { name: `Delete ${title}` }).click();
  const confirmation = page.getByRole("dialog", {
    name: "Delete this request?",
  });
  await expect(confirmation).toContainText(title);
  await confirmation.getByRole("button", { name: "Delete request" }).click();
  await expect(page.getByRole("row").filter({ hasText: title })).toHaveCount(0);
});
