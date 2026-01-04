'use client';

import { Sidebar } from '@/components/layout';
import { FullPageSpinner } from '@/components/ui';
import { MissionBotWidget } from '@/components/features';
import { ProtectedRoute } from '@/components/auth';
import { DemoModeBanner } from '@/components/layout/DemoModeBanner';

/**
 * Dashboard Layout
 *
 * Protected layout that wraps all dashboard pages.
 * Requires authentication to access.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute
      loadingFallback={
        <div className="flex h-screen bg-gray-50 items-center justify-center">
          <FullPageSpinner label="Loading dashboard..." />
        </div>
      }
    >
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {/* Demo Mode Banner - shown at the top of dashboard for demo users */}
          <DemoModeBanner />
          {children}
        </main>
        {/* Mission-Bot floating widget - available on all dashboard pages */}
        <MissionBotWidget />
      </div>
    </ProtectedRoute>
  );
}
