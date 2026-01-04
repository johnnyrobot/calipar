'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  showPageNumbers?: boolean;
  maxVisiblePages?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
  showFirstLast = true,
  showPageNumbers = true,
  maxVisiblePages = 5,
  size = 'md',
  className = '',
}: PaginationProps) {
  // Calculate visible page numbers
  const pageNumbers = useMemo(() => {
    if (!showPageNumbers || totalPages <= 1) return [];

    const pages: (number | 'ellipsis')[] = [];

    // Always show first page
    pages.push(1);

    // Calculate range around current page
    let startPage = Math.max(2, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 3);

    // Adjust if we're near the end
    if (endPage - startPage < maxVisiblePages - 3) {
      startPage = Math.max(2, endPage - maxVisiblePages + 3);
    }

    // Add ellipsis after first page if needed
    if (startPage > 2) {
      pages.push('ellipsis');
    }

    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add ellipsis before last page if needed
    if (endPage < totalPages - 1) {
      pages.push('ellipsis');
    }

    // Always show last page if more than 1 page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages, maxVisiblePages, showPageNumbers]);

  // Calculate showing items range
  const startItem = totalItems ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = totalItems ? Math.min(currentPage * itemsPerPage, totalItems) : 0;

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  const buttonSize = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
  const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Items info */}
      {totalItems !== undefined && (
        <p className={`${textSize} text-gray-500`}>
          Showing <span className="font-medium text-gray-900">{startItem}</span> to{' '}
          <span className="font-medium text-gray-900">{endItem}</span> of{' '}
          <span className="font-medium text-gray-900">{totalItems}</span> results
        </p>
      )}

      {/* Pagination controls */}
      <nav className="flex items-center gap-1" aria-label="Pagination">
        {/* First page button */}
        {showFirstLast && (
          <button
            onClick={() => onPageChange(1)}
            disabled={isFirstPage}
            className={`${buttonSize} flex items-center justify-center rounded-lg border border-gray-200 text-gray-600
              ${isFirstPage ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50 hover:border-gray-300'}
              transition-colors`}
            aria-label="Go to first page"
          >
            <ChevronsLeft className={iconSize} />
          </button>
        )}

        {/* Previous page button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isFirstPage}
          className={`${buttonSize} flex items-center justify-center rounded-lg border border-gray-200 text-gray-600
            ${isFirstPage ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50 hover:border-gray-300'}
            transition-colors`}
          aria-label="Go to previous page"
        >
          <ChevronLeft className={iconSize} />
        </button>

        {/* Page numbers */}
        {showPageNumbers && (
          <div className="hidden sm:flex items-center gap-1">
            {pageNumbers.map((page, index) => {
              if (page === 'ellipsis') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className={`${buttonSize} flex items-center justify-center ${textSize} text-gray-400`}
                  >
                    ...
                  </span>
                );
              }

              const isCurrentPage = page === currentPage;
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`${buttonSize} flex items-center justify-center rounded-lg ${textSize} font-medium transition-colors
                    ${isCurrentPage
                      ? 'bg-lamc-blue text-white border border-lamc-blue'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  aria-label={`Go to page ${page}`}
                  aria-current={isCurrentPage ? 'page' : undefined}
                >
                  {page}
                </button>
              );
            })}
          </div>
        )}

        {/* Mobile page indicator */}
        {showPageNumbers && (
          <span className={`sm:hidden ${textSize} text-gray-600 px-2`}>
            Page {currentPage} of {totalPages}
          </span>
        )}

        {/* Next page button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={isLastPage}
          className={`${buttonSize} flex items-center justify-center rounded-lg border border-gray-200 text-gray-600
            ${isLastPage ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50 hover:border-gray-300'}
            transition-colors`}
          aria-label="Go to next page"
        >
          <ChevronRight className={iconSize} />
        </button>

        {/* Last page button */}
        {showFirstLast && (
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={isLastPage}
            className={`${buttonSize} flex items-center justify-center rounded-lg border border-gray-200 text-gray-600
              ${isLastPage ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-gray-50 hover:border-gray-300'}
              transition-colors`}
            aria-label="Go to last page"
          >
            <ChevronsRight className={iconSize} />
          </button>
        )}
      </nav>
    </div>
  );
}

export interface PageSizeSelectorProps {
  pageSize: number;
  options?: number[];
  onPageSizeChange: (size: number) => void;
  className?: string;
}

export function PageSizeSelector({
  pageSize,
  options = [10, 25, 50, 100],
  onPageSizeChange,
  className = '',
}: PageSizeSelectorProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label htmlFor="page-size" className="text-sm text-gray-600">
        Items per page:
      </label>
      <select
        id="page-size"
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lamc-blue focus:border-transparent"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export default Pagination;
