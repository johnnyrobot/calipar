'use client';

/**
 * RoleGuard Component
 *
 * Conditionally renders children based on user role or permission.
 * Provides flexible access control for UI elements.
 */

import { ReactNode } from 'react';
import { useHasRole, useRoleAtLeast, useHasPermission } from '@/lib/useRole';
import { UserRole, Permission } from '@/lib/roles';

interface RoleGuardProps {
  children: ReactNode;
  /** Render if user has one of these roles */
  allowedRoles?: UserRole | UserRole[];
  /** Render if user has at least this role level */
  minRole?: UserRole;
  /** Render if user has this permission */
  permission?: Permission;
  /** Content to show when access is denied (defaults to nothing) */
  fallback?: ReactNode;
  /** Invert the condition (show if user does NOT have access) */
  invert?: boolean;
}

/**
 * RoleGuard - Conditionally render content based on user role/permission
 *
 * @example
 * // Show only to admins
 * <RoleGuard allowedRoles="admin">
 *   <AdminPanel />
 * </RoleGuard>
 *
 * @example
 * // Show to chair or above
 * <RoleGuard minRole="chair">
 *   <ApproveButton />
 * </RoleGuard>
 *
 * @example
 * // Show based on permission
 * <RoleGuard permission="reviews.validate">
 *   <ValidationForm />
 * </RoleGuard>
 *
 * @example
 * // Show fallback for unauthorized users
 * <RoleGuard allowedRoles={['dean', 'admin']} fallback={<ReadOnlyView />}>
 *   <EditableView />
 * </RoleGuard>
 */
export function RoleGuard({
  children,
  allowedRoles,
  minRole,
  permission,
  fallback = null,
  invert = false,
}: RoleGuardProps) {
  // Check role-based access
  const hasRole = useHasRole(allowedRoles || []);
  const hasMinRole = useRoleAtLeast(minRole || 'faculty');
  const hasPermission = useHasPermission(permission || 'chat.use');

  // Determine if access is granted based on props provided
  let hasAccess = false;

  if (allowedRoles) {
    hasAccess = hasRole;
  } else if (minRole) {
    hasAccess = hasMinRole;
  } else if (permission) {
    hasAccess = hasPermission;
  } else {
    // No conditions specified, default to showing content
    hasAccess = true;
  }

  // Apply inversion if needed
  const shouldRender = invert ? !hasAccess : hasAccess;

  return <>{shouldRender ? children : fallback}</>;
}

/**
 * AdminOnly - Shorthand for RoleGuard with admin role
 */
export function AdminOnly({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <RoleGuard allowedRoles="admin" fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

/**
 * ChairOrAbove - Shorthand for RoleGuard with minimum chair role
 */
export function ChairOrAbove({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <RoleGuard minRole="chair" fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

/**
 * DeanOrAbove - Shorthand for RoleGuard with minimum dean role
 */
export function DeanOrAbove({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <RoleGuard minRole="dean" fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

/**
 * ProcOnly - Shorthand for PROC members and admins
 */
export function ProcOnly({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <RoleGuard allowedRoles={['proc', 'admin']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

/**
 * CanValidate - Show content for users who can perform validation
 */
export function CanValidate({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <RoleGuard permission="validation.score" fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

/**
 * CanManageUsers - Show content for users who can manage other users
 */
export function CanManageUsers({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <RoleGuard permission="users.manage" fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export default RoleGuard;
