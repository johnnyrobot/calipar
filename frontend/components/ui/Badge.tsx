'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps {
  /** Badge content */
  children: ReactNode;
  /** Badge variant */
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'draft' | 'review' | 'validated' | 'approved';
  /** Badge size */
  size?: 'sm' | 'md';
  /** Optional dot indicator */
  dot?: boolean;
  /** Additional className */
  className?: string;
}

const variantStyles = {
  default: 'bg-gray-100 text-gray-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  error: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  // Review status variants
  draft: 'bg-gray-100 text-gray-800',
  review: 'bg-amber-100 text-amber-800',
  validated: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
};

const dotColors = {
  default: 'bg-gray-400',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  draft: 'bg-gray-400',
  review: 'bg-amber-500',
  validated: 'bg-blue-500',
  approved: 'bg-green-500',
};

const sizeStyles = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-0.5',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', dotColors[variant])} />
      )}
      {children}
    </span>
  );
}

// ============ Status Badge ============
export interface StatusBadgeProps {
  status: 'draft' | 'in_review' | 'validated' | 'approved' | string;
  showDot?: boolean;
}

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  in_review: 'In Review',
  validated: 'Validated',
  approved: 'Approved',
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  ongoing: 'Ongoing',
  institutionalized: 'Institutionalized',
};

const statusVariants: Record<string, BadgeProps['variant']> = {
  draft: 'draft',
  in_review: 'review',
  validated: 'validated',
  approved: 'approved',
  not_started: 'default',
  in_progress: 'info',
  completed: 'success',
  ongoing: 'warning',
  institutionalized: 'success',
};

export function StatusBadge({ status, showDot = true }: StatusBadgeProps) {
  const label = statusLabels[status] || status;
  const variant = statusVariants[status] || 'default';

  return (
    <Badge variant={variant} dot={showDot}>
      {label}
    </Badge>
  );
}

export default Badge;
