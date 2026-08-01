/** @type {import("@serwist/build").InjectManifestOptions} */
const config = {
  swSrc: "app/sw.ts",
  swDest: "out/sw.js",
  globDirectory: "out",
  globPatterns: [
    "**/*.{html,js,css,json,webmanifest,svg,png,ico,woff,woff2}",
  ],
  globIgnores: [
    "sw.js",
    "openrouter-llms-full.txt",
    "**/*.map",
    "_headers",
  ],
  injectionPoint: "self.__SW_MANIFEST",
  maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
};

module.exports = config;
