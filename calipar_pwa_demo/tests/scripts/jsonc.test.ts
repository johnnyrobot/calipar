import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

// @ts-expect-error -- plain .mjs release tooling, no types
import { parseJsonc } from "../../scripts/cloudflare/lib.mjs";

describe("parseJsonc", () => {
  it("keeps a // and a /* inside a quoted string", () => {
    // The reason the parser is string-aware at all. A URL in wrangler.jsonc
    // contains `//`; treating it as a comment truncates the value and every
    // Cloudflare script then validates a misparse.
    expect(
      parseJsonc('{"url": "https://example.com/a", "glob": "/* not a comment */"}'),
    ).toEqual({ url: "https://example.com/a", glob: "/* not a comment */" });
  });

  it("strips line and block comments outside strings", () => {
    expect(
      parseJsonc(`{
        // leading comment
        "name": "calipar-pwa-demo", /* inline */
        /* multi
           line */
        "main": "worker/index.ts"
      }`),
    ).toEqual({ name: "calipar-pwa-demo", main: "worker/index.ts" });
  });

  it("does not mistake an escaped quote for the end of a string", () => {
    expect(parseJsonc('{"quoted": "say \\"hi\\" // not a comment"}')).toEqual({
      quoted: 'say "hi" // not a comment',
    });
  });

  it("tolerates a trailing comma in objects and arrays", () => {
    expect(parseJsonc('{"a": [1, 2,], "b": 3,}')).toEqual({ a: [1, 2], b: 3 });
  });

  it("parses the real wrangler.jsonc to the identity the release scripts assert", () => {
    // The only consumer that matters. `assertConfigIdentity` reads exactly
    // these three fields, so a parser regression must fail here.
    const raw = readFileSync(
      new URL("../../wrangler.jsonc", import.meta.url),
      "utf8",
    );
    const config = parseJsonc(raw);

    expect(config.name).toBe("calipar-pwa-demo");
    expect(config.assets?.directory).toBe("./out");
    expect(config.assets?.run_worker_first).toEqual(["/api/*"]);
  });

  it("throws rather than returning a partial object on malformed input", () => {
    expect(() => parseJsonc('{"unterminated": ')).toThrow();
  });
});
