import { expect, test } from "@playwright/test";
import { assertNoRemoteBackends, enterDemo } from "./helpers";

test("enters the synthetic local demo without authentication", async ({ page }) => {
  await enterDemo(page);
  await expect(page.getByTestId("dashboard-heading")).toContainText(
    "Your review horizon",
  );
  await expect(page.getByRole("link", { name: /sign in|log in/i })).toHaveCount(0);
  await assertNoRemoteBackends(page);
});

test("every primary route is directly addressable", async ({ page }) => {
  await enterDemo(page);

  const routes = [
    ["/dashboard/", /Your review horizon/i],
    ["/reviews/", /Program reviews/i],
    ["/data/", /Read the signal/i],
    ["/planning/", /Turn findings into motion/i],
    ["/resources/", /Resource the work/i],
    ["/activity/", /How the work moved/i],
    ["/chat/", /Mission-Bot/i],
    ["/settings/", /Keep your bearings/i],
  ] as const;

  for (const [route, heading] of routes) {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  }
});

test("mobile navigation opens, follows a route, and closes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-mobile");
  await enterDemo(page);

  const open = page.getByRole("button", { name: "Open navigation" });
  await expect(open).toBeVisible();
  await open.click();
  const primary = page.getByRole("navigation", { name: "Primary" });
  await expect(primary).toBeVisible();
  await primary.getByRole("link", { name: "Program reviews" }).click();
  await expect(page).toHaveURL(/\/reviews\/?$/);
  await expect(page.getByRole("heading", { name: "Program reviews" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close navigation" })).toBeHidden();
});
