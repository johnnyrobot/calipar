import { expect, test } from "@playwright/test";
import { enterDemo, waitForSaved } from "./helpers";

test("creates, autosaves, reloads, and submits a local review", async ({ page }) => {
  await enterDemo(page);
  await page.getByTestId("new-review").click();
  await expect(page).toHaveURL(/\/reviews\/new\/?$/);

  const title = `Local review ${Date.now()}`;
  await page.getByTestId("review-title").fill(title);
  await page.getByTestId("review-program").selectOption({ index: 1 });
  await page.getByTestId("review-type").check();
  await page.getByTestId("create-review").click();

  await expect(page).toHaveURL(/\/reviews\/editor\/?\?id=/);
  await expect(page.getByTestId("review-editor")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Review title" })).toHaveValue(
    title,
  );

  const overview = page.getByTestId("review-section-overview");
  const narrative = "Enrollment remained stable while course success improved.";
  await overview.fill(narrative);
  await expect(page.getByTestId("autosave-status")).toContainText(
    "Unsaved changes",
  );
  await overview.blur();
  await waitForSaved(page);

  const editorURL = page.url();
  await page.reload();
  await expect(page).toHaveURL(editorURL);
  await expect(page.getByTestId("review-section-overview")).toHaveValue(narrative);

  const submit = page.getByTestId("submit-review");
  await expect(submit).toBeDisabled();
});

test("persists a new review across a second page in the same browser profile", async ({
  page,
  context,
}) => {
  await enterDemo(page);
  await page.getByTestId("new-review").click();

  const title = `Durable review ${Date.now()}`;
  await page.getByTestId("review-title").fill(title);
  await page.getByTestId("review-program").selectOption({ index: 1 });
  await page.getByRole("radio", { name: /Comprehensive review/i }).check();
  await page.getByTestId("create-review").click();
  await expect(page).toHaveURL(/\/reviews\/editor\/?\?id=/);
  const editorURL = page.url();

  const secondPage = await context.newPage();
  await secondPage.goto(editorURL);
  await expect(
    secondPage.getByRole("textbox", { name: "Review title" }),
  ).toHaveValue(title);
});
