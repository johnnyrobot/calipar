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
  default: 'bg-surface-2 text-status-draft',
  success: 'bg-brand-success-bg text-status-approved',
  warning: 'bg-brand-review-bg text-status-review',
  error: 'bg-[#FBEAEA] text-destructive',
  info: 'bg-brand-primary-bg text-brand-primary',
  // Review status variants
  draft: 'bg-surface-2 text-status-draft',
  review: 'bg-brand-review-bg text-status-review',
  validated: 'bg-brand-primary-bg text-status-validated',
  approved: 'bg-brand-success-bg text-status-approved',
};

const dotColors = {
  default: 'bg-status-draft',
  success: 'bg-status-approved',
  warning: 'bg-status-review',
  error: 'bg-destructive',
  info: 'bg-brand-primary',
  draft: 'bg-status-draft',
  review: 'bg-status-review',
  validated: 'bg-status-validated',
  approved: 'bg-status-approved',
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
        'inline-flex items-center gap-1.5 font-semibold rounded-full',
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
