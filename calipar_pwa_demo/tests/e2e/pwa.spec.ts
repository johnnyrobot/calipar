import { expect, test } from "@playwright/test";
import { enterDemo } from "./helpers";

test("publishes an installable manifest and a controlling service worker", async ({
  page,
}) => {
  await enterDemo(page);

  const manifestHref = await page
    .locator('link[rel="manifest"]')
    .getAttribute("href");
  expect(manifestHref).toBeTruthy();

  const manifestResponse = await page.request.get(manifestHref!);
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = (await manifestResponse.json()) as {
    name: string;
    start_url: string;
    display: string;
    icons: Array<{ sizes: string; purpose?: string }>;
  };
  expect(manifest.name).toContain("CALIPAR");
  expect(manifest.start_url).toMatch(/\/dashboard\/?$/);
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.some((icon) => icon.sizes === "192x192")).toBeTruthy();
  expect(manifest.icons.some((icon) => icon.sizes === "512x512")).toBeTruthy();
  expect(manifest.icons.some((icon) => icon.purpose?.includes("maskable"))).toBeTruthy();

  await page.waitForFunction(
    async () => Boolean((await navigator.serviceWorker.ready).active),
    undefined,
    { timeout: 20_000 },
  );
  expect(
    await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL),
  ).toContain("sw.js");
});

test("warm-cache navigation and local data remain available offline", async ({
  page,
  context,
}) => {
  await enterDemo(page);
  for (const route of [
    "/reviews/",
    "/data/",
    "/planning/",
    "/resources/",
    "/activity/",
    "/chat/",
    "/settings/",
    "/dashboard/",
  ]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
  }

  await page.waitForFunction(
    async () => Boolean((await navigator.serviceWorker.ready).active),
    undefined,
    { timeout: 20_000 },
  );
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.goto("/dashboard/");
  await expect(page.getByTestId("dashboard-heading")).toBeVisible();
  await expect(page.getByTestId("offline-banner")).toBeVisible();

  await page.goto("/reviews/");
  await expect(page.getByRole("heading", { name: /Program reviews/i })).toBeVisible();
});

test("never stores AI API responses in Cache Storage", async ({ page }) => {
  await enterDemo(page);
  const cachedRequests = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const cacheName of await caches.keys()) {
      const cache = await caches.open(cacheName);
      urls.push(...(await cache.keys()).map((request) => request.url));
    }
    return urls;
  });

  expect(cachedRequests.filter((url) => /\/api\/ai\//.test(url))).toEqual([]);
});
