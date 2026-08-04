import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { enterDemo } from "../e2e/helpers";

const routes = [
  "/",
  "/dashboard/",
  "/reviews/",
  "/reviews/new/",
  // Required by both artifact verifiers but absent from this sweep until now.
  // A deterministic seeded id, so the editor has something to render.
  "/reviews/editor/?id=review-biology-2025",
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
    // wcag21a and wcag22a were missing, so no WCAG 2.1/2.2 Level A criterion
    // was asserted at all. label-content-name-mismatch is the only axe rule in
    // that gap, and it ships enabled: false because it is experimental — both
    // had to change or the hole stayed open.
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"])
      .options({ rules: { "label-content-name-mismatch": { enabled: true } } })
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
