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
  default: 'bg-white border border-gray-200 shadow-sm',
  outlined: 'bg-white border-2 border-gray-200',
  elevated: 'bg-white shadow-lg',
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
        interactive && 'cursor-pointer hover:shadow-md hover:border-lamc-blue/50 transition-all duration-200',
        className
      )}
      {...props}
    >
      {header && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          {header}
        </div>
      )}
      <div className={paddingStyles[padding]}>{children}</div>
      {footer && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
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
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
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
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  amber: 'bg-amber-100 text-amber-600',
  red: 'bg-red-100 text-red-600',
  purple: 'bg-purple-100 text-purple-600',
};

export function StatCard({ title, value, icon, trend, color = 'blue' }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && (
            <p
              className={cn(
                'text-sm mt-2',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
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
