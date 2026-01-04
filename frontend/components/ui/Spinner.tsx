'use client';

import { cn } from '@/lib/utils';

export interface SpinnerProps {
  /** Spinner size */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Optional loading text */
  label?: string;
  /** Color variant */
  variant?: 'primary' | 'white' | 'gray';
  /** Additional CSS classes */
  className?: string;
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

const colorMap = {
  primary: 'text-lamc-blue',
  white: 'text-white',
  gray: 'text-gray-400',
};

export function Spinner({
  size = 'md',
  label,
  variant = 'primary',
  className,
}: SpinnerProps) {
  return (
    <div
      className={cn('inline-flex items-center gap-2', className)}
      role="status"
      aria-label={label || 'Loading'}
    >
      <svg
        className={cn('animate-spin', sizeMap[size], colorMap[variant])}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {label && (
        <span className={cn('text-sm', colorMap[variant])}>{label}</span>
      )}
    </div>
  );
}

export interface FullPageSpinnerProps {
  /** Loading text to display */
  label?: string;
}

export function FullPageSpinner({ label = 'Loading...' }: FullPageSpinnerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="xl" variant="primary" />
        <p className="text-sm text-gray-600 font-medium">{label}</p>
      </div>
    </div>
  );
}

export interface InlineSpinnerProps {
  /** Size of the spinner */
  size?: 'sm' | 'md';
}

export function InlineSpinner({ size = 'sm' }: InlineSpinnerProps) {
  return <Spinner size={size} variant="gray" />;
}

export default Spinner;
