'use client';

import { Cloud, CloudOff, Check, Loader2, AlertCircle } from 'lucide-react';
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
        return <Loader2 className="w-4 h-4 animate-spin text-lamc-blue" />;
      case 'saved':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        if (hasUnsavedChanges) {
          return <Cloud className="w-4 h-4 text-amber-500" />;
        }
        return <Cloud className="w-4 h-4 text-gray-400" />;
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
        return 'text-lamc-blue bg-blue-50';
      case 'saved':
        return 'text-green-600 bg-green-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        if (hasUnsavedChanges) {
          return 'text-amber-600 bg-amber-50';
        }
        return 'text-gray-500 bg-gray-50';
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
