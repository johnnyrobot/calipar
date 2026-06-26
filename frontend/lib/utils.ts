/**
 * Utility functions
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date with time
 */
export function formatDateTime(date: string | Date): string {
  // toLocaleString (not toLocaleDateString) so the hour/minute options actually render.
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Get status color class
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    in_review: 'bg-amber-100 text-amber-800',
    validated: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    not_started: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    ongoing: 'bg-amber-100 text-amber-800',
    institutionalized: 'bg-purple-100 text-purple-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get review type label
 */
export function getReviewTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    comprehensive: 'Comprehensive (6-Year)',
    annual: 'Annual Update',
  };
  return labels[type] || type;
}

/**
 * Get ISMP goal title
 */
export function getISMPGoalTitle(goalNumber: number): string {
  const titles: Record<number, string> = {
    1: 'Expand Access',
    2: 'Student-Centered Institution',
    3: 'Student Success and Equity',
    4: 'Organizational Effectiveness',
    5: 'Financial Stability',
  };
  return titles[goalNumber] || `Goal ${goalNumber}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Object code descriptions (LACCD chart of accounts)
 */
export const OBJECT_CODE_DESCRIPTIONS: Record<string, string> = {
  '1000': 'Academic Salaries',
  '2000': 'Classified Salaries',
  '3000': 'Employee Benefits',
  '4000': 'Books, Supplies, Materials',
  '5000': 'Services & Operating Expenses',
  '6000': 'Capital Outlay',
};

/**
 * Get object code description
 */
export function getObjectCodeDescription(code: string): string {
  const prefix = code.slice(0, 4);
  return OBJECT_CODE_DESCRIPTIONS[prefix] || 'Unknown';
}
