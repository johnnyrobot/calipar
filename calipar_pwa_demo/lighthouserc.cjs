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
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "test-results/lighthouse",
    },
  },
};
