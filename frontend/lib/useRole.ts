/**
 * Role-Based Access Control Hooks
 *
 * Custom hooks for checking user roles and permissions
 * throughout the application.
 */

import { useMemo } from 'react';
import { useAuth } from './auth-context';
import {
  UserRole,
  Permission,
  roleHasPermission,
  roleAtLeast,
  roleIsOneOf,
  getRoleDisplayName,
  getRoleBadgeColor,
} from './roles';

/**
 * Hook to check if the current user has a specific role or is one of allowed roles
 *
 * @example
 * const isAdmin = useHasRole('admin');
 * const canValidate = useHasRole(['proc', 'admin']);
 */
export function useHasRole(allowedRoles: UserRole | UserRole[]): boolean {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user?.role) return false;

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return roleIsOneOf(user.role, roles);
  }, [user?.role, allowedRoles]);
}

/**
 * Hook to check if the current user has at least the specified role level
 *
 * @example
 * const isChairOrAbove = useRoleAtLeast('chair'); // true for chair, dean, admin
 */
export function useRoleAtLeast(minRole: UserRole): boolean {
  const { user } = useAuth();

  return useMemo(() => {
    return roleAtLeast(user?.role, minRole);
  }, [user?.role, minRole]);
}

/**
 * Hook to check if the current user has a specific permission
 *
 * @example
 * const canApprove = useHasPermission('reviews.approve');
 */
export function useHasPermission(permission: Permission): boolean {
  const { user } = useAuth();

  return useMemo(() => {
    return roleHasPermission(user?.role, permission);
  }, [user?.role, permission]);
}

/**
 * Hook to check multiple permissions at once
 *
 * @example
 * const { canEdit, canDelete } = usePermissions(['reviews.edit', 'reviews.delete']);
 */
export function usePermissions(
  permissions: Permission[]
): Partial<Record<Permission, boolean>> {
  const { user } = useAuth();

  return useMemo(() => {
    return permissions.reduce(
      (acc, permission) => {
        acc[permission] = roleHasPermission(user?.role, permission);
        return acc;
      },
      {} as Partial<Record<Permission, boolean>>
    );
  }, [user?.role, permissions]);
}

/**
 * Hook to get comprehensive role information for the current user
 *
 * @example
 * const { role, displayName, badgeColor, isAdmin } = useCurrentRole();
 */
export function useCurrentRole() {
  const { user } = useAuth();

  return useMemo(() => {
    const role = (user?.role?.toLowerCase() || '') as UserRole;

    return {
      role,
      displayName: getRoleDisplayName(role),
      badgeColor: getRoleBadgeColor(role),
      isAdmin: role === 'admin',
      isFaculty: role === 'faculty',
      isChair: role === 'chair',
      isDean: role === 'dean',
      isProc: role === 'proc',
      isChairOrAbove: roleAtLeast(role, 'chair'),
      isDeanOrAbove: roleAtLeast(role, 'dean'),
      canManageUsers: roleHasPermission(role, 'users.manage'),
      canValidate: roleHasPermission(role, 'validation.score'),
      canFundResources: roleHasPermission(role, 'resources.fund'),
      canViewAllReviews: roleHasPermission(role, 'reviews.view_all'),
    };
  }, [user?.role]);
}
