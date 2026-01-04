/**
 * Auth Components
 *
 * Export all authentication-related components
 */

export { ProtectedRoute, withProtectedRoute } from './ProtectedRoute';
export {
  RoleGuard,
  AdminOnly,
  ChairOrAbove,
  DeanOrAbove,
  ProcOnly,
  CanValidate,
  CanManageUsers,
} from './RoleGuard';
