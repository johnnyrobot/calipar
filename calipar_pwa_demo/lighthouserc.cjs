module.exports = {
  ci: {
    collect: {
      url: [
        "http://127.0.0.1:8787/",
        "http://127.0.0.1:8787/dashboard/",
      ],
      startServerCommand: "npm run preview:e2e",
      startServerReadyPattern: "Ready on|Ready at|Listening on|http://127.0.0.1:8787",
      startServerReadyTimeout: 120_000,
      numberOfRuns: 2,
      settings: {
        chromeFlags: "--headless=new --no-sandbox",
        formFactor: "desktop",
        screenEmulation: {
          mobile: false,
          width: 1440,
          height: 1000,
          deviceScaleFactor: 1,
          disabled: false,
        },
      },
    },
    assert: {
      preset: "lighthouse:recommended",
      assertions: {
        "categories:performance": ["error", { minScore: 0.8 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.9 }],

        // Two individual audits are disabled below with recorded justification.
        // The preset and all four category budgets are UNCHANGED — per
        // HANDOFF.md, an audit may be turned off individually with a reason, but
        // the preset must never be loosened to manufacture a pass.
        //
        // Measured 2026-08-04 on a quiet host (load 4.05), both URLs, two runs
        // each. Re-measure and re-justify before assuming either still holds.

        // legacy-javascript: 13,705 bytes in one chunk, signals
        // Array.prototype.at/.flat/.flatMap, Object.fromEntries, Object.hasOwn,
        // String.prototype.trimEnd/.trimStart.
        //
        // Not actionable from this repository. Pinning an explicit modern
        // browserslist (Chrome/Edge 92, Firefox 90, Safari 15.4 — the first
        // versions with Array.prototype.at) raised global coverage 81.44% to
        // 83.92% and left this audit byte-for-byte identical. Next 16 emits the
        // chunk into the main graph regardless of build targets, and it is not
        // served with `nomodule`, so no supported browser skips it either.
        // Fixing it means changing how Next bundles, not how this app is
        // configured. Revisit on the next Next.js major.
        "legacy-javascript": "off",
        "legacy-javascript-insight": "off",

        // inspector-issues: one Chrome DevTools issue, type "Content security
        // policy", no sub-items.
        //
        // It is `'unsafe-inline'` in the `script-src` of `public/_headers`.
        // Next's inline bootstrap script requires it, and `output: "export"`
        // means there is no server to mint a per-request nonce. Removing it
        // breaks the application. The rest of the CSP is deliberately strict —
        // `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`,
        // `base-uri 'self'` — so this is one known concession, not a lax policy.
        // Revisit if the demo ever gains a server or moves to hashed scripts.
        "inspector-issues": "off",
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "test-results/lighthouse",
    },
  },
};
