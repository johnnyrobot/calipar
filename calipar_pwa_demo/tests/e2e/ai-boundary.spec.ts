import { expect, test } from "@playwright/test";
import { enterDemo } from "./helpers";

const configuredStatus = {
  configured: true,
  freeOnly: true,
  zeroDataRetention: true,
  dataCollection: "deny",
  sessionRequired: true,
  turnstileSiteKey: "1x00000000000000000000AA",
};

test("discloses the AI boundary before creating a session", async ({ page }) => {
  await page.route("**/api/ai/status", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(configuredStatus),
    }),
  );
  await enterDemo(page);
  await page.goto("/chat/");
  await expect(page.getByTestId("missionbot-status")).toContainText(
    "Free AI ready",
  );

  await page.getByTestId("missionbot-prompt").fill(
    "Summarize only the selected synthetic facts.",
  );
  await page.getByTestId("missionbot-send").click();
  const consent = page.getByRole("dialog", {
    name: "Before Mission-Bot begins",
  });
  await expect(consent).toContainText(/Cloudflare Worker to OpenRouter/i);
  await expect(consent).toContainText(/student-level|confidential/i);
  await expect(
    consent.getByRole("checkbox", { name: /I understand the AI boundary/i }),
  ).not.toBeChecked();
});

test("shows a typed unavailable state without a fabricated answer", async ({
  page,
}) => {
  await page.route("**/api/ai/status", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "AI_NOT_CONFIGURED",
          message: "Mission-Bot is not configured for this deployment.",
          requestId: "test-status",
        },
      }),
    }),
  );
  await enterDemo(page);
  await page.goto("/chat/");

  await expect(page.getByTestId("missionbot-status")).toContainText(
    "Status unavailable",
  );
  await expect(page.getByTestId("missionbot-prompt")).toBeDisabled();
  await expect(page.getByTestId("missionbot-response")).toHaveCount(0);
  await expect(page.getByText(/canned|fallback response/i)).toHaveCount(0);
});

test("keeps the prompt and blocks AI requests while offline", async ({
  page,
  context,
}) => {
  let aiPosts = 0;
  await page.route("**/api/ai/status", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(configuredStatus),
    }),
  );
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname.startsWith("/api/ai/")
    ) {
      aiPosts += 1;
    }
  });
  await enterDemo(page);
  await page.goto("/chat/");
  await expect(page.getByTestId("missionbot-status")).toContainText(
    "Free AI ready",
  );

  const prompt = "Keep this local prompt while offline.";
  await page.getByTestId("missionbot-prompt").fill(prompt);
  await context.setOffline(true);
  await page.getByTestId("missionbot-send").click();
  await expect(page.locator(".chat-error[role='alert']")).toContainText(
    /needs a network connection/i,
  );
  await expect(page.getByTestId("missionbot-prompt")).toHaveValue(prompt);
  expect(aiPosts).toBe(0);
});
