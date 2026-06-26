'use client';

import { useState } from 'react';
import {
  Bell,
  Search,
  HelpCircle,
  Menu,
  X,
} from 'lucide-react';
import { useChatStore } from '@/lib/store';
import { DemoModeBadge } from './DemoModeBanner';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { setOpen: setChatOpen } = useChatStore();
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  return (
    <header className="h-16 bg-surface border-b border-brand-line flex items-center px-4 lg:px-6">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setShowMobileMenu(!showMobileMenu)}
        className="lg:hidden p-2 text-brand-muted hover:text-brand-ink mr-2"
      >
        {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Page Title */}
      <div className="flex-1">
        {title && (
          <div>
            <h1 className="font-display text-lg font-semibold tracking-tight text-brand-ink">{title}</h1>
            {subtitle && (
              <p className="text-sm text-brand-muted">{subtitle}</p>
            )}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="hidden md:flex items-center mr-4">
        {showSearch ? (
          <div className="relative">
            <input
              type="text"
              placeholder="Search reviews, data..."
              className="w-64 pl-10 pr-4 py-2 border border-brand-line bg-surface-2 rounded-lg text-sm text-brand-text focus:outline-none focus:bg-surface focus:border-brand-primary focus:ring-[3px] focus:ring-brand-primary-bg"
              autoFocus
              onBlur={() => setShowSearch(false)}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
          </div>
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 text-brand-muted hover:text-brand-ink hover:bg-surface-2 rounded-lg transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Demo Mode Badge */}
        <DemoModeBadge />

        {/* Help */}
        <button
          onClick={() => setChatOpen(true)}
          className="p-2 text-brand-muted hover:text-brand-ink hover:bg-surface-2 rounded-lg transition-colors"
          title="Ask Mission-Bot"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <button className="relative p-2 text-brand-muted hover:text-brand-ink hover:bg-surface-2 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
        </button>

        {/* Current Cycle */}
        <div className="hidden sm:flex items-center ml-2 px-3 py-1.5 bg-brand-primary-bg text-brand-ink text-sm font-medium rounded-lg">
          2024-2025 Cycle
        </div>
      </div>
    </header>
  );
}
