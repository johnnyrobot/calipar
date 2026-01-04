'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button style variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'link';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Show loading spinner */
  isLoading?: boolean;
  /** Text to show while loading */
  loadingText?: string;
  /** Icon to display before text */
  leftIcon?: React.ReactNode;
  /** Icon to display after text */
  rightIcon?: React.ReactNode;
  /** Make button full width */
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    const baseStyles = cn(
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      fullWidth && 'w-full'
    );

    const variantStyles = {
      primary: cn(
        'bg-lamc-blue text-white',
        'hover:bg-blue-800 active:bg-blue-900',
        'focus:ring-lamc-blue'
      ),
      secondary: cn(
        'bg-white text-lamc-blue border-2 border-lamc-blue',
        'hover:bg-lamc-light active:bg-blue-100',
        'focus:ring-lamc-blue'
      ),
      outline: cn(
        'bg-white text-gray-700 border border-gray-300',
        'hover:bg-gray-50 active:bg-gray-100',
        'focus:ring-gray-400'
      ),
      danger: cn(
        'bg-red-600 text-white',
        'hover:bg-red-700 active:bg-red-800',
        'focus:ring-red-500'
      ),
      ghost: cn(
        'bg-transparent text-gray-700',
        'hover:bg-gray-100 active:bg-gray-200',
        'focus:ring-gray-400'
      ),
      link: cn(
        'bg-transparent text-lamc-blue underline-offset-4',
        'hover:underline',
        'focus:ring-lamc-blue p-0'
      ),
    };

    const sizeStyles = {
      sm: 'text-sm px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-6 py-3 gap-2.5',
    };

    // Link variant doesn't use size padding
    const appliedSizeStyles = variant === 'link' ? 'text-sm' : sizeStyles[size];

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          appliedSizeStyles,
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin h-4 w-4" />
            {loadingText || children}
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export default Button;
