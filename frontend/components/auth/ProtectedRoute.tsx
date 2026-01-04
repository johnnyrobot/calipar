'use client';

/**
 * Protected Route Component
 *
 * Wraps pages that require authentication. Redirects to login if not authenticated.
 * Shows a loading spinner while checking authentication status.
 */

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Spinner } from '@/components/ui';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Optional: Required roles to access this route
   * If not specified, any authenticated user can access
   */
  allowedRoles?: string[];
  /**
   * Optional: Custom fallback component while loading
   */
  loadingFallback?: React.ReactNode;
  /**
   * Optional: Custom redirect path (default: /login)
   */
  redirectTo?: string;
}

/**
 * Default loading component
 */
function DefaultLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-lamc-light">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4" />
        <p className="text-gray-600">Verifying authentication...</p>
      </div>
    </div>
  );
}

/**
 * Access Denied component
 */
function AccessDenied({ requiredRoles }: { requiredRoles: string[] }) {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-lamc-light">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-4">
          You don&apos;t have permission to access this page.
          {requiredRoles.length > 0 && (
            <span className="block mt-1 text-sm">
              Required role: {requiredRoles.join(' or ')}
            </span>
          )}
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 bg-lamc-blue text-white rounded-lg hover:bg-blue-800 transition-colors"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

/**
 * ProtectedRoute Component
 *
 * Usage:
 * ```tsx
 * <ProtectedRoute>
 *   <YourProtectedPage />
 * </ProtectedRoute>
 *
 * // With role restrictions
 * <ProtectedRoute allowedRoles={['admin', 'dean']}>
 *   <AdminOnlyPage />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({
  children,
  allowedRoles,
  loadingFallback,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // Wait for auth state to be determined
    if (isLoading) {
      return;
    }

    // Not authenticated - redirect to login
    if (!isAuthenticated || !user) {
      // Preserve the intended destination in the URL
      const returnUrl = encodeURIComponent(pathname);
      router.replace(`${redirectTo}?returnUrl=${returnUrl}`);
      return;
    }

    // Check role-based access
    if (allowedRoles && allowedRoles.length > 0) {
      const hasRequiredRole = allowedRoles.some(
        (role) => user.role.toLowerCase() === role.toLowerCase()
      );
      setIsAuthorized(hasRequiredRole);
    } else {
      // No specific roles required, just need to be authenticated
      setIsAuthorized(true);
    }
  }, [isLoading, isAuthenticated, user, allowedRoles, pathname, router, redirectTo]);

  // Show loading state while checking auth
  if (isLoading || isAuthorized === null) {
    return loadingFallback || <DefaultLoadingFallback />;
  }

  // Show access denied if not authorized
  if (!isAuthorized) {
    return <AccessDenied requiredRoles={allowedRoles || []} />;
  }

  // User is authenticated and authorized
  return <>{children}</>;
}

/**
 * Higher-order component version for wrapping page components
 *
 * Usage:
 * ```tsx
 * export default withProtectedRoute(MyPage, { allowedRoles: ['admin'] });
 * ```
 */
export function withProtectedRoute<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) {
  const WithProtectedRouteComponent = (props: P) => {
    return (
      <ProtectedRoute {...options}>
        <WrappedComponent {...props} />
      </ProtectedRoute>
    );
  };

  // Set display name for debugging
  const wrappedName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  WithProtectedRouteComponent.displayName = `withProtectedRoute(${wrappedName})`;

  return WithProtectedRouteComponent;
}

export default ProtectedRoute;
