'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  TrendingUp,
  Target,
  DollarSign,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Activity,
  ClipboardCheck,
  Users,
  Shield,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useCurrentRole } from '@/lib/useRole';
import { UserRole } from '@/lib/roles';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  /** Roles that can see this nav item (empty = all roles) */
  allowedRoles?: UserRole[];
  /** Minimum role required to see this item */
  minRole?: UserRole;
}

// Navigation items with role-based visibility
const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Program Reviews', href: '/reviews', icon: FileText, badge: 3 },
  { label: 'Data Analytics', href: '/data', icon: TrendingUp },
  { label: 'Planning', href: '/planning', icon: Target },
  { label: 'Resources', href: '/resources', icon: DollarSign },
  {
    label: 'PROC Validation',
    href: '/validation',
    icon: ClipboardCheck,
    badge: 2,
    allowedRoles: ['proc', 'admin'], // Only PROC members and admins
  },
  { label: 'Activity', href: '/activity', icon: Activity },
];

// Admin-only navigation items
const adminNavItems: NavItem[] = [
  {
    label: 'User Management',
    href: '/admin/users',
    icon: Users,
    allowedRoles: ['admin'],
  },
  {
    label: 'System Settings',
    href: '/admin/settings',
    icon: Shield,
    allowedRoles: ['admin'],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, isLoading } = useAuth();
  const { role, displayName, isAdmin, canValidate } = useCurrentRole();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Filter nav items based on user role
  const filteredNavItems = useMemo(() => {
    return navItems.filter((item) => {
      // If no role restrictions, show to everyone
      if (!item.allowedRoles && !item.minRole) return true;

      // Check allowed roles
      if (item.allowedRoles) {
        return item.allowedRoles.includes(role as UserRole);
      }

      return true;
    });
  }, [role]);

  // Filter admin nav items
  const filteredAdminItems = useMemo(() => {
    if (!isAdmin) return [];
    return adminNavItems;
  }, [isAdmin]);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      // Redirect to login page after successful logout
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Force redirect even if logout fails
      router.push('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <aside
      className={`bg-lamc-blue text-white flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-blue-800">
        <Link
          href="/dashboard"
          onClick={(e) => {
            e.preventDefault();
            router.push('/dashboard');
          }}
          className="flex items-center gap-3"
        >
          <div className="w-8 h-8 bg-lamc-gold rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-lamc-blue font-bold text-lg">L</span>
          </div>
          {!isCollapsed && (
            <span className="font-bold text-lg">CALIPAR</span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {filteredNavItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(item.href);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-white/20 text-white'
                    : 'text-blue-200 hover:bg-white/10 hover:text-white'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="bg-lamc-gold text-lamc-blue text-xs font-medium px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            </li>
          ))}
        </ul>

        {/* Admin Section - Only visible to admins */}
        {filteredAdminItems.length > 0 && (
          <div className="mt-6 px-2">
            <div className={`px-3 py-2 text-xs uppercase tracking-wider text-blue-300 ${isCollapsed ? 'hidden' : ''}`}>
              Administration
            </div>
            <ul className="space-y-1">
              {filteredAdminItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(item.href);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActive(item.href)
                        ? 'bg-red-500/20 text-red-200'
                        : 'text-blue-200 hover:bg-white/10 hover:text-white'
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Mission-Bot Link */}
        <div className="mt-6 px-2">
          <div className={`px-3 py-2 text-xs uppercase tracking-wider text-blue-300 ${isCollapsed ? 'hidden' : ''}`}>
            AI Assistant
          </div>
          <Link
            href="/chat"
            onClick={(e) => {
              e.preventDefault();
              router.push('/chat');
            }}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              isActive('/chat')
                ? 'bg-lamc-gold/20 text-lamc-gold'
                : 'text-blue-200 hover:bg-white/10 hover:text-white'
            }`}
            title={isCollapsed ? 'Mission-Bot' : undefined}
          >
            <MessageSquare className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>Mission-Bot</span>}
          </Link>
        </div>
      </nav>

      {/* User Section */}
      <div className="border-t border-blue-800">
        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center py-2 text-blue-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>

        {/* User Info */}
        <div className={`px-3 py-3 ${isCollapsed ? 'hidden' : ''}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isAdmin ? 'bg-red-600' : 'bg-blue-700'
            }`}>
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.full_name || 'Guest User'}
              </p>
              <p className="text-xs text-blue-300">
                {displayName}
                {isAdmin && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-red-500/30 text-red-200 rounded">
                    Admin
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/settings"
              onClick={(e) => {
                e.preventDefault();
                router.push('/settings');
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            >
              <LogOut className={`w-4 h-4 ${isLoggingOut ? 'animate-pulse' : ''}`} />
              {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
            </button>
          </div>
        </div>

        {/* Collapsed User Actions */}
        {isCollapsed && (
          <div className="px-2 py-2 space-y-1">
            <Link
              href="/settings"
              onClick={(e) => {
                e.preventDefault();
                router.push('/settings');
              }}
              className="flex items-center justify-center p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </Link>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              title={isLoggingOut ? 'Signing Out...' : 'Sign Out'}
            >
              <LogOut className={`w-5 h-5 ${isLoggingOut ? 'animate-pulse' : ''}`} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
