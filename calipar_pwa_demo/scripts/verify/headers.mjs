const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/verify/headers.mjs <base-url>");
  process.exit(2);
}

const base = new URL(target);
const checks = [
  ["/", "text/html"],
  ["/dashboard/", "text/html"],
  ["/reviews/editor/?id=review-business-2025", "text/html"],
  ["/manifest.webmanifest", "application/manifest+json"],
  ["/sw.js", "javascript"],
  ["/api/health", "application/json"],
];

let failed = false;
for (const [path, expectedType] of checks) {
  const url = new URL(path, base);
  const response = await fetch(url, { redirect: "manual" });
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.includes(expectedType)) {
    failed = true;
    console.error(
      `${url}: expected 2xx ${expectedType}, got ${response.status} ${contentType}`,
    );
  } else {
    console.log(`${response.status} ${url.pathname} ${contentType}`);
  }
}

const serviceWorker = await fetch(new URL("/sw.js", base));
const swCache = serviceWorker.headers.get("cache-control") ?? "";
if (!/no-cache|no-store|max-age=0/i.test(swCache)) {
  failed = true;
  console.error(`/sw.js must revalidate; cache-control was "${swCache}"`);
}

if (failed) {
  process.exitCode = 1;
}
