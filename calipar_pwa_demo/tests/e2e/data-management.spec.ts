import { expect, test } from "@playwright/test";
import { enterDemo } from "./helpers";

test("exports a versioned workspace and reset restores the synthetic seed", async ({
  page,
}) => {
  await enterDemo(page);
  const title = `Backup-only review ${Date.now()}`;
  await page.getByTestId("new-review").click();
  await page.getByTestId("review-title").fill(title);
  await page.getByTestId("review-program").selectOption({ index: 1 });
  await page.getByTestId("create-review").click();
  await expect(page).toHaveURL(/\/reviews\/editor\/?\?id=/);
  await page.goto("/settings/");

  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("settings-export").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^calipar-demo-workspace-.*\.json$/);
  const downloadedPath = await download.path();
  if (!downloadedPath) {
    throw new Error("Playwright did not persist the downloaded workspace.");
  }

  const stream = await download.createReadStream();
  if (!stream) {
    throw new Error("Playwright could not open the downloaded workspace.");
  }
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  const exported = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
    format: string;
    schemaVersion: number;
    data: { reviews: unknown[] };
  };
  expect(exported.format).toBe("calipar-demo-workspace");
  expect(exported.schemaVersion).toBe(1);
  expect(exported.data.reviews.length).toBe(5);

  await page.getByTestId("settings-reset").click();
  await expect(page.getByRole("dialog")).toContainText(/cannot be undone|reset/i);
  await page.getByTestId("confirm-reset").click();
  await expect(page).toHaveURL(/\/dashboard\/?$/);
  await expect(page.getByTestId("dashboard-heading")).toBeVisible();
  await page.goto("/reviews/");
  await expect(page.getByText(title)).toHaveCount(0);

  await page.goto("/settings/");
  await page.getByTestId("settings-import").setInputFiles(downloadedPath);
  const importDialog = page.getByRole("dialog", {
    name: "Replace this workspace?",
  });
  await expect(importDialog).toContainText("5");
  const backupPromise = page.waitForEvent("download");
  await importDialog
    .getByRole("button", { name: "Download backup & replace" })
    .click();
  const backup = await backupPromise;
  expect(backup.suggestedFilename()).toContain("pre-import");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /Workspace replaced successfully/i }),
  ).toBeVisible();

  await page.goto("/reviews/");
  await expect(page.getByText(title)).toBeVisible();
});
