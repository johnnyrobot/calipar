'use client';

import { ReactNode, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card content */
  children: ReactNode;
  /** Optional header */
  header?: ReactNode;
  /** Optional footer */
  footer?: ReactNode;
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Make card clickable/hoverable */
  interactive?: boolean;
  /** Card variant */
  variant?: 'default' | 'outlined' | 'elevated';
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const variantStyles = {
  default: 'bg-surface border border-brand-line shadow-sm',
  outlined: 'bg-surface border border-brand-line',
  elevated: 'bg-surface border border-brand-line shadow-md',
};

export function Card({
  children,
  header,
  footer,
  padding = 'md',
  interactive = false,
  variant = 'default',
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden',
        variantStyles[variant],
        interactive && 'cursor-pointer hover:shadow-md hover:border-brand-primary/50 transition-all duration-200',
        className
      )}
      {...props}
    >
      {header && (
        <div className="px-4 py-3 border-b border-brand-line bg-surface-2">
          {header}
        </div>
      )}
      <div className={paddingStyles[padding]}>{children}</div>
      {footer && (
        <div className="px-4 py-3 border-t border-brand-line bg-surface-2">
          {footer}
        </div>
      )}
    </div>
  );
}

// ============ Card Header ============
export interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function CardHeader({ title, description, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h3 className="font-display text-lg font-semibold tracking-tight text-brand-ink">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-brand-muted">{description}</p>
        )}
      </div>
      {action && <div className="ml-4 flex-shrink-0">{action}</div>}
    </div>
  );
}

// ============ Stat Card ============
export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
}

const colorStyles = {
  blue: 'bg-brand-primary-bg text-brand-primary',
  green: 'bg-brand-success-bg text-status-approved',
  amber: 'bg-brand-review-bg text-status-review',
  red: 'bg-[#FBEAEA] text-destructive',
  purple: 'bg-[#F3E7FB] text-[#7A3FA0]',
};

export function StatCard({ title, value, icon, trend, color = 'blue' }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-brand-muted">{title}</p>
          <p className="font-mono text-3xl font-semibold tabular-nums text-brand-ink mt-1">{value}</p>
          {trend && (
            <p
              className={cn(
                'text-sm mt-2',
                trend.isPositive ? 'text-status-approved' : 'text-destructive'
              )}
            >
              {trend.isPositive ? '+' : ''}{trend.value}% from last period
            </p>
          )}
        </div>
        {icon && (
          <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', colorStyles[color])}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

export default Card;
