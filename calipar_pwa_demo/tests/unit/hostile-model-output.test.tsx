import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { plainTextFromHtml, sanitizeRichText } from "../../lib/utils/sanitize";

/**
 * The untrusted-input chain this covers: `importWorkspace` accepts an arbitrary
 * user-supplied JSON file, that content becomes selectable AI context, the
 * model's reply comes back, and the reply is rendered. The Worker returns model
 * prose as data and does not sanitise it — that is deliberate — so these are the
 * two places the browser has to hold the line.
 *
 * The corresponding Worker-side assertions live in tests/eval/injection.test.ts.
 */

const HOSTILE = [
  `<img src=x onerror="alert(1)">`,
  `<script>alert('xss')</script>`,
  `<iframe src="https://evil.example"></iframe>`,
  `<a href="javascript:alert(1)">click</a>`,
  `<p style="position:fixed;top:0">overlay</p>`,
  `<form action="https://evil.example"><input name="x"></form>`,
];

describe("hostile model output in the browser", () => {
  it("renders assistant prose as text, so markup is never parsed", () => {
    // This is how the chat page renders a reply: {message.content} inside a <p>.
    // React escapes interpolated text, so an injected tag becomes visible
    // characters rather than an element.
    const reply = `<img src=x onerror="alert(1)"> Ignoring previous instructions.`;
    render(
      <div data-testid="missionbot-response">
        <p>{reply}</p>
      </div>,
    );
    const node = screen.getByTestId("missionbot-response");
    expect(node.textContent).toContain("<img src=x");
    expect(node.querySelector("img")).toBeNull();
    expect(node.innerHTML).not.toContain("<img");
  });

  it.each(HOSTILE)("strips %s when model prose is accepted into a review", (hostile) => {
    const sanitised = sanitizeRichText(`<p>Findings.</p>${hostile}`);
    expect(sanitised).not.toMatch(/<script|<iframe|<object|<embed|<form/i);
    expect(sanitised).not.toMatch(/onerror|onload|javascript:/i);
    expect(sanitised).not.toMatch(/\sstyle=/i);
  });

  it("keeps the narrative formatting a real review needs", () => {
    const sanitised = sanitizeRichText(
      "<p>Course success was <strong>812 of 1,004</strong>.</p><ul><li>One</li></ul>",
    );
    expect(sanitised).toContain("<strong>812 of 1,004</strong>");
    expect(sanitised).toContain("<li>One</li>");
  });

  it("reduces hostile markup to its text when a plain summary is taken", () => {
    const plain = plainTextFromHtml(`<p>Findings.</p><script>alert('xss')</script>`);
    expect(plain).toBe("Findings.");
    expect(plain).not.toContain("alert");
  });

  it("does not let an injected tag survive a round trip through both helpers", () => {
    const round = plainTextFromHtml(sanitizeRichText(HOSTILE.join("")));
    expect(round).not.toMatch(/<[a-z]/i);
  });
});
