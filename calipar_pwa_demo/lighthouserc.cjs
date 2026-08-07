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
        // UNLISTED BETA ONLY — the one place a category budget is relaxed, and
        // the only deviation from the "category budgets are UNCHANGED" rule
        // stated below. Read this before assuming it is the usual kind of
        // exception; it is not, and it must not become precedent.
        //
        // Task 15 Step 1 requires `noindex` so the beta is reachable by link and
        // findable by no one. Lighthouse SEO scores exactly the opposite
        // property: whether search engines can index the page well. With
        // `noindex` the `is-crawlable` audit scores 0 by definition, and it
        // carries weight 4.043 of the category's 11.043 — so the ceiling for
        // SEO becomes 7.0/11.043 = 0.634. Measured 2026-08-04 on both URLs:
        // exactly 0.63, with `is-crawlable` the SOLE member scoring below 1.0.
        // Every other SEO audit is perfect. Nothing is being hidden here.
        //
        // Disabling only the `is-crawlable` assertion would not help: a category
        // score is computed from its member audits regardless of assertion
        // config, so `categories:seo` would still read 0.63 and still fail.
        // The budget itself is therefore unsatisfiable while the beta is
        // unlisted — not "hard", unsatisfiable.
        //
        // This is NOT the rule below being loosened to manufacture a pass. The
        // metric has stopped measuring anything true about the build: it asks a
        // question whose desired answer is now "no". Re-enable BOTH lines the
        // moment indexing is wanted, together with public/robots.txt and the
        // `robots` metadata in app/layout.tsx — all four revert as one change
        // at GA. Until then a reviewer must read SEO from the report, not the
        // gate.
        "categories:seo": "off",
        "is-crawlable": "off",

        // Individual audits are relaxed below with recorded justification. The
        // preset and all four category budgets are UNCHANGED — per HANDOFF.md,
        // an audit may be turned off individually with a reason, but the preset
        // must never be loosened to manufacture a pass.
        //
        // Where a threshold can express the residue honestly, prefer it to
        // "off": a bound still fails on regression, and "off" never fails
        // again. `unused-javascript` below is bounded for that reason.
        //
        // Measured 2026-08-04 on a quiet host (load 4.05), both URLs, two runs
        // each, except where a later date is stated. Re-measure and re-justify
        // before assuming any of them still holds.

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

        // unused-javascript: bounded, not disabled.
        //
        // The preset asserts `maxLength: 0` — zero chunks may be flagged at all.
        // Measured 2026-08-07, two runs per URL, after WorkspaceProvider was
        // scoped to `app/(demo)/` (160cb01):
        //
        //   /            1 chunk flagged, 28.4 KB unused
        //   /dashboard/  2 chunks flagged, 97.5 KB unused
        //
        // Both remaining chunks are React/Next framework code, not application
        // code, so route-level splitting cannot reach them: the same
        // `1wqzgvrx5dswm.js` is flagged on a page that renders three static
        // sections and a modal. Reaching zero would mean changing how Next
        // bundles its runtime.
        //
        // A threshold rather than "off" on purpose. `maxLength: 2` still fails
        // the moment a THIRD chunk starts carrying dead weight, which is the
        // regression anyone would actually want to hear about. Turning the
        // audit off would surrender that. Note the margin is exact on
        // /dashboard/ and one spare on /: tighten to 1 if /dashboard/ ever
        // improves, and re-measure rather than raise this if it fails.
        //
        // For scale, the change that produced these numbers took / from 2
        // chunks / 100 KB to 1 chunk / 28 KB. This is a bound on what is left,
        // not an excuse for it.
        "unused-javascript": ["error", { maxLength: 2 }],

        // network-dependency-tree-insight: no expressible threshold, so off.
        //
        // Measured 2026-08-07: score 0 on both URLs, `numericValue` absent,
        // `details.type: "network-tree"` with no savings figure. The audit is
        // effectively binary — it reports a critical-path chain and scores 0
        // whenever one exists. There is no number to bound, and `minScore: 0`
        // would be an always-pass dressed up as a threshold, which is worse
        // than saying plainly that it is off.
        //
        // The chain it reports is the static export's own shape: HTML → the
        // Next runtime chunk → the page chunk. `output: "export"` means there
        // is no server to push or inline anything, so the depth is structural.
        //
        // What still covers this ground: `categories:performance` at minScore
        // 0.8 (measured 0.85–0.89), plus the render-blocking and LCP audits
        // that remain at preset strength as warnings. Re-enable and re-measure
        // if the demo ever gains a server.
        "network-dependency-tree-insight": "off",

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
