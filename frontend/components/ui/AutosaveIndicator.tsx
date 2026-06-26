'use client';

import { Cloud, Check, Loader2, AlertCircle } from 'lucide-react';
import { AutosaveStatus, formatLastSaved } from '@/lib/useAutosave';

interface AutosaveIndicatorProps {
  status: AutosaveStatus;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  className?: string;
}

export function AutosaveIndicator({
  status,
  lastSaved,
  hasUnsavedChanges,
  className = '',
}: AutosaveIndicatorProps) {
  const getIcon = () => {
    switch (status) {
      case 'saving':
        return <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />;
      case 'saved':
        return <Check className="w-4 h-4 text-status-approved" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        if (hasUnsavedChanges) {
          return <Cloud className="w-4 h-4 text-status-review" />;
        }
        return <Cloud className="w-4 h-4 text-brand-muted" />;
    }
  };

  const getMessage = () => {
    switch (status) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Saved';
      case 'error':
        return 'Save failed';
      default:
        if (hasUnsavedChanges) {
          return 'Unsaved changes';
        }
        return formatLastSaved(lastSaved);
    }
  };

  const getStatusClasses = () => {
    switch (status) {
      case 'saving':
        return 'text-brand-primary bg-brand-primary-bg';
      case 'saved':
        return 'text-status-approved bg-brand-success-bg';
      case 'error':
        return 'text-destructive bg-[#FBEAEA]';
      default:
        if (hasUnsavedChanges) {
          return 'text-status-review bg-brand-review-bg';
        }
        return 'text-brand-muted bg-surface-2';
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${getStatusClasses()} ${className}`}
    >
      {getIcon()}
      <span>{getMessage()}</span>
    </div>
  );
}
