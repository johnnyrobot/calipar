import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { enterDemo } from "../e2e/helpers";

const routes = [
  "/",
  "/dashboard/",
  "/reviews/",
  "/reviews/new/",
  "/data/",
  "/planning/",
  "/resources/",
  "/activity/",
  "/chat/",
  "/settings/",
] as const;

for (const route of routes) {
  test(`${route} has no serious or critical axe violations`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    if (route === "/") {
      await page.goto(route);
    } else {
      await enterDemo(page);
      await page.goto(route);
    }

    await expect(page.locator("body")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();

    const materialViolations = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    );
    expect(
      materialViolations,
      materialViolations
        .map(
          (violation) =>
            `${violation.id}: ${violation.help}\n${violation.nodes
              .map((node) => `  ${node.target.join(" ")}`)
              .join("\n")}`,
        )
        .join("\n\n"),
    ).toEqual([]);
  });
}

test("landing and application expose keyboard bypass links and landmarks", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: /skip to (main )?content/i });
  await expect(skipLink).toBeFocused();
  await skipLink.press("Enter");
  await expect(page.locator("main")).toBeFocused();

  await enterDemo(page);
  await expect(page.getByRole("navigation", { name: /primary/i })).toBeVisible();
  await expect(page.locator("main")).toBeVisible();
});
