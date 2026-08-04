import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CALIPAR — Program Review Demo",
    short_name: "CALIPAR",
    description:
      "Explore program review and integrated planning in a private, browser-local demo workspace.",
    start_url: "/dashboard/",
    scope: "/",
    display: "standalone",
    background_color: "#F5F0E5",
    theme_color: "#07232F",
    orientation: "any",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/dashboard-wide.svg",
        sizes: "1280x720",
        type: "image/svg+xml",
        form_factor: "wide",
        label: "CALIPAR program review dashboard",
      },
      {
        src: "/screenshots/dashboard-mobile.svg",
        sizes: "390x844",
        type: "image/svg+xml",
        form_factor: "narrow",
        label: "CALIPAR mobile dashboard",
      },
    ],
  };
}
