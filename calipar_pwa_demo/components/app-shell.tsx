"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icon";
import { useWorkspace } from "@/components/workspace-provider";

const nav: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/dashboard/", label: "Dashboard", icon: "dashboard" },
  { href: "/reviews/", label: "Program reviews", icon: "review" },
  { href: "/data/", label: "Data & outcomes", icon: "chart" },
  { href: "/planning/", label: "Integrated planning", icon: "plan" },
  { href: "/resources/", label: "Resource requests", icon: "resource" },
  { href: "/activity/", label: "Activity", icon: "activity" },
];

// No aria-label on the link: the accessible name comes from the content —
// "CALIPAR Program Review · Demo" — which contains the visible text and so
// satisfies WCAG 2.5.3 Label in Name. Substituting a different aria-label
// would reopen the defect; the rule is about the name containing the visible
// text, not about having a name at all.
function Brand() {
  return (
    <Link className="brand" href="/dashboard/">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>
        <strong>CALIPAR</strong>
        <small>Program Review · Demo</small>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { state } = useWorkspace();

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  if (state.status === "loading") {
    return (
      <main className="boot-screen" role="status">
        <span className="brand-mark brand-mark-large" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <p className="eyebrow">PREPARING YOUR LOCAL WORKSPACE</p>
        <h1>Setting the course…</h1>
        <div className="loading-line" aria-hidden="true"><span /></div>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="boot-screen error-screen" id="main-content">
        <Icon name="warning" />
        <p className="eyebrow">LOCAL STORAGE REQUIRED</p>
        <h1>CALIPAR couldn’t open this workspace.</h1>
        <p>{state.message}</p>
        <p className="supporting">
          Check that this browser allows site storage, close any other CALIPAR tabs,
          and reload. Nothing will be saved in memory as a fallback.
        </p>
        <button className="button button-primary" type="button" onClick={() => location.reload()}>
          Try again
        </button>
      </main>
    );
  }

  return (
    <div className="app-shell" data-testid="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-head">
          <Brand />
          {menuOpen ? (
            <button
              aria-label="Close navigation"
              className="icon-button sidebar-close"
              type="button"
              onClick={() => setMenuOpen(false)}
            >
              <Icon name="close" />
            </button>
          ) : null}
        </div>
        <nav aria-label="Primary">
          {nav.map((item) => {
            const active = pathname === item.href.slice(0, -1) || pathname.startsWith(item.href);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={active ? "active" : ""}
                href={item.href}
                key={item.href}
                onClick={() => setMenuOpen(false)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-rule" />
        <nav aria-label="Support">
          <Link className={pathname.startsWith("/chat") ? "active" : ""} href="/chat/" onClick={() => setMenuOpen(false)}>
            <Icon name="spark" />
            <span>Mission-Bot</span>
            <em>AI</em>
          </Link>
          <Link className={pathname.startsWith("/settings") ? "active" : ""} href="/settings/" onClick={() => setMenuOpen(false)}>
            <Icon name="settings" />
            <span>Settings & data</span>
          </Link>
        </nav>
        <div className="sidebar-foot">
          <p>Demo Program Review Lead</p>
          <span>Local browser workspace</span>
        </div>
      </aside>
      {menuOpen ? (
        <button
          aria-label="Close navigation overlay"
          className="sidebar-scrim"
          type="button"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      <section className="shell-main">
        <header className="mobile-header">
          <button
            aria-expanded={menuOpen}
            aria-label="Open navigation"
            className="icon-button"
            type="button"
            onClick={() => setMenuOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <Brand />
          <Link aria-label="Open Mission-Bot" className="icon-button" href="/chat/">
            <Icon name="spark" />
          </Link>
        </header>
        <div className="demo-banner" data-testid="demo-workspace-banner">
          <span className="demo-dot" />
          <span><strong>Demo workspace</strong> — stored in this browser</span>
          <Link href="/settings/">Manage data</Link>
        </div>
        <main id="main-content" className="app-main" tabIndex={-1}>
          {children}
        </main>
      </section>
    </div>
  );
}
