import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { WorkspaceProvider } from "@/components/workspace-provider";
import { PwaBridge } from "@/components/pwa-bridge";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "CALIPAR Demo",
    template: "%s · CALIPAR",
  },
  description:
    "A browser-local demonstration of CALIPAR program review and integrated planning.",
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
        <WorkspaceProvider>
          <PwaBridge />
          {children}
        </WorkspaceProvider>
      </body>
    </html>
  );
}
