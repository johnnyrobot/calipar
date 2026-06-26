'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button style variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'link' | 'ink';
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
      'inline-flex items-center justify-center font-semibold rounded-lg transition-colors duration-200',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      fullWidth && 'w-full'
    );

    const variantStyles = {
      primary: cn(
        'bg-brand-primary text-white',
        'hover:bg-brand-primary-hover active:bg-brand-primary-hover'
      ),
      secondary: cn(
        'bg-surface text-brand-ink border border-brand-line',
        'hover:bg-surface-2 active:bg-surface-2'
      ),
      outline: cn(
        'bg-transparent text-brand-text border border-brand-line',
        'hover:bg-surface-2 active:bg-surface-2'
      ),
      danger: cn(
        'bg-destructive text-destructive-foreground',
        'hover:bg-[#B91C1C] active:bg-[#991B1B]'
      ),
      ghost: cn(
        'bg-transparent text-brand-text',
        'hover:bg-surface-2 active:bg-surface-2'
      ),
      link: cn(
        'bg-transparent text-brand-primary underline-offset-4',
        'hover:underline p-0'
      ),
      // Signature maritime CTA — navy with a brass-accented icon (the Golden Thread).
      ink: cn(
        'bg-brand-ink text-brand-on-ink',
        'hover:bg-brand-ink-soft active:bg-brand-ink-soft'
      ),
    };

    const sizeStyles = {
      sm: 'h-9 text-sm px-3.5 gap-1.5',
      md: 'h-10 text-sm px-5 gap-2',
      lg: 'h-11 text-[15px] px-6 gap-2.5',
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
