/**
 * Role-Based Access Control (RBAC) utilities
 *
 * Defines user roles, permissions, and helper functions for
 * controlling access to features throughout the application.
 */

// User role enum matching backend
export type UserRole = 'faculty' | 'chair' | 'dean' | 'admin' | 'proc';

// Role hierarchy (higher index = more permissions)
export const ROLE_HIERARCHY: UserRole[] = ['faculty', 'chair', 'dean', 'proc', 'admin'];

// Permission types for different actions
export type Permission =
  | 'reviews.create'
  | 'reviews.edit'
  | 'reviews.delete'
  | 'reviews.submit'
  | 'reviews.approve'
  | 'reviews.validate'
  | 'reviews.view_all'
  | 'action_plans.create'
  | 'action_plans.edit'
  | 'resources.create'
  | 'resources.edit'
  | 'resources.fund'
  | 'users.manage'
  | 'settings.admin'
  | 'data.view'
  | 'data.export'
  | 'validation.score'
  | 'chat.use';

// Role to permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  faculty: [
    'reviews.create',
    'reviews.edit',
    'reviews.submit',
    'action_plans.create',
    'action_plans.edit',
    'resources.create',
    'resources.edit',
    'data.view',
    'chat.use',
  ],
  chair: [
    'reviews.create',
    'reviews.edit',
    'reviews.submit',
    'reviews.approve', // Can approve department reviews
    'action_plans.create',
    'action_plans.edit',
    'resources.create',
    'resources.edit',
    'data.view',
    'data.export',
    'chat.use',
  ],
  dean: [
    'reviews.create',
    'reviews.edit',
    'reviews.submit',
    'reviews.approve',
    'reviews.view_all', // Can see all division reviews
    'action_plans.create',
    'action_plans.edit',
    'resources.create',
    'resources.edit',
    'resources.fund', // Can mark resources as funded
    'data.view',
    'data.export',
    'chat.use',
  ],
  proc: [
    'reviews.view_all',
    'reviews.validate', // PROC validation scoring
    'validation.score',
    'data.view',
    'data.export',
    'chat.use',
  ],
  admin: [
    // Admin has all permissions
    'reviews.create',
    'reviews.edit',
    'reviews.delete',
    'reviews.submit',
    'reviews.approve',
    'reviews.validate',
    'reviews.view_all',
    'action_plans.create',
    'action_plans.edit',
    'resources.create',
    'resources.edit',
    'resources.fund',
    'users.manage',
    'settings.admin',
    'data.view',
    'data.export',
    'validation.score',
    'chat.use',
  ],
};

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: UserRole | string | undefined, permission: Permission): boolean {
  if (!role) return false;
  const normalizedRole = role.toLowerCase() as UserRole;
  const permissions = ROLE_PERMISSIONS[normalizedRole];
  return permissions?.includes(permission) ?? false;
}

/**
 * Check if a role meets or exceeds a minimum role level
 * Uses the role hierarchy to determine access
 */
export function roleAtLeast(userRole: UserRole | string | undefined, minRole: UserRole): boolean {
  if (!userRole) return false;
  const normalizedRole = userRole.toLowerCase() as UserRole;
  const userRoleIndex = ROLE_HIERARCHY.indexOf(normalizedRole);
  const minRoleIndex = ROLE_HIERARCHY.indexOf(minRole);

  if (userRoleIndex === -1 || minRoleIndex === -1) return false;
  return userRoleIndex >= minRoleIndex;
}

/**
 * Check if user role is one of the allowed roles
 */
export function roleIsOneOf(userRole: UserRole | string | undefined, allowedRoles: UserRole[]): boolean {
  if (!userRole) return false;
  const normalizedRole = userRole.toLowerCase() as UserRole;
  return allowedRoles.includes(normalizedRole);
}

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: UserRole | string | undefined): string {
  if (!role) return 'Guest';

  const displayNames: Record<UserRole, string> = {
    faculty: 'Faculty',
    chair: 'Department Chair',
    dean: 'Dean',
    proc: 'PROC Member',
    admin: 'Administrator',
  };

  return displayNames[role.toLowerCase() as UserRole] || role;
}

/**
 * Get role badge color for UI
 */
export function getRoleBadgeColor(role: UserRole | string | undefined): string {
  if (!role) return 'bg-gray-100 text-gray-800';

  const colors: Record<UserRole, string> = {
    faculty: 'bg-blue-100 text-blue-800',
    chair: 'bg-green-100 text-green-800',
    dean: 'bg-purple-100 text-purple-800',
    proc: 'bg-orange-100 text-orange-800',
    admin: 'bg-red-100 text-red-800',
  };

  return colors[role.toLowerCase() as UserRole] || 'bg-gray-100 text-gray-800';
}
