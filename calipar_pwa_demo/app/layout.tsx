import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PwaBridge } from "@/components/pwa-bridge";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "CALIPAR Demo",
    template: "%s · CALIPAR",
  },
  description:
    "A browser-local demonstration of CALIPAR program review and integrated planning.",
  // Unlisted public beta: reachable by link, findable by no one. This is the
  // load-bearing half of the pair — public/robots.txt only asks politely, and a
  // crawler arriving via an inbound link can index a page regardless of it.
  // REMOVE BOTH AT GA.
  robots: { index: false, follow: false },
  applicationName: "CALIPAR Demo",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CALIPAR",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#07232F",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        {/*
          WorkspaceProvider is deliberately NOT here. It is the IndexedDB read
          path, so mounting it at the root pulled Dexie, Zod, the repository and
          the sanitiser into the shared bundle for every route — including the
          landing page and the offline shell, which touch no workspace data. It
          lives in `app/(demo)/layout.tsx`, which is where every `useWorkspace`
          caller actually is.
        */}
        <PwaBridge />
        {children}
      </body>
    </html>
  );
}
