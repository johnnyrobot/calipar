'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, Clock } from 'lucide-react';

interface DemoStatus {
  demo_mode_enabled: boolean;
  demo_user_prefix: string;
  demo_reset_hour_utc: number;
  last_reset: string | null;
  next_reset: string | null;
}

export function DemoModeBanner() {
  const [demoStatus, setDemoStatus] = useState<DemoStatus | null>(null);
  const [isDemoUser, setIsDemoUser] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');

  useEffect(() => {
    // Fetch demo status
    const fetchDemoStatus = async () => {
      try {
        const response = await fetch('/api/auth/demo-status');
        if (response.ok) {
          const data = await response.json();
          setDemoStatus(data);

          // Calculate time until reset
          if (data.next_reset) {
            const nextReset = new Date(data.next_reset);
            const updateCountdown = () => {
              const now = new Date();
              const diff = nextReset.getTime() - now.getTime();

              if (diff > 0) {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                setTimeUntilReset(`${hours}h ${minutes}m`);
              } else {
                setTimeUntilReset('Reset imminent');
              }
            };

            updateCountdown();
            const interval = setInterval(updateCountdown, 60000); // Update every minute
            return () => clearInterval(interval);
          }
        }
      } catch (error) {
        console.error('Failed to fetch demo status:', error);
      }
    };

    // Check if current user is a demo user
    const checkDemoUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setIsDemoUser(data.is_demo_user || false);
        }
      } catch (error) {
        console.error('Failed to check demo user status:', error);
      }
    };

    fetchDemoStatus();
    checkDemoUser();
  }, []);

  if (!demoStatus?.demo_mode_enabled || !isDemoUser) {
    return null;
  }

  return (
    <div className="bg-brand-review-bg border-b border-brand-line">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1.5 text-status-review font-medium">
              <AlertCircle className="w-4 h-4" />
              <span>Demo Mode</span>
            </div>
            <span className="text-brand-muted">
              Your demo data will reset every night at midnight.
            </span>
          </div>

          {demoStatus.next_reset && (
            <div className="flex items-center gap-1.5 text-sm text-brand-muted">
              <Clock className="w-4 h-4" />
              <span>Resets in: <strong className="font-mono">{timeUntilReset}</strong></span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-brand-primary bg-surface-2 hover:bg-brand-primary-bg rounded-md transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * DemoModeBadge - A smaller badge component for showing demo mode status
 * Use this in headers, sidebars, or other compact spaces
 */
export function DemoModeBadge() {
  const [isDemoUser, setIsDemoUser] = useState(false);

  useEffect(() => {
    const checkDemoUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setIsDemoUser(data.is_demo_user || false);
        }
      } catch (error) {
        console.error('Failed to check demo user status:', error);
      }
    };

    checkDemoUser();
  }, []);

  if (!isDemoUser) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-brand-review-bg text-status-review text-xs font-medium rounded-md border border-brand-line">
      <AlertCircle className="w-3 h-3" />
      <span>Demo</span>
    </div>
  );
}
