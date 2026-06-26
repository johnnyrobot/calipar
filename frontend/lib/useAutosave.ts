/**
 * Custom hook for autosaving content with debounce
 * Provides visual feedback for save status
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutosaveOptions<T> {
  /** Delay in milliseconds before saving (default: 2000ms) */
  delay?: number;
  /** Callback function to save the content */
  onSave: (content: T) => Promise<void>;
  /** Whether autosave is enabled (default: true) */
  enabled?: boolean;
}

interface UseAutosaveReturn<T> {
  /** Current autosave status */
  status: AutosaveStatus;
  /** Last saved timestamp */
  lastSaved: Date | null;
  /** Trigger an immediate save */
  saveNow: () => Promise<void>;
  /** Register content changes */
  registerChange: (content: T) => void;
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
}

export function useAutosave<T = unknown>({
  delay = 2000,
  onSave,
  enabled = true,
}: UseAutosaveOptions<T>): UseAutosaveReturn<T> {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const contentRef = useRef<T | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);

  // Clear pending timers on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  // Schedule the status -> 'idle' reset, cancelling any previous one so an old timer
  // can't reset the status during a newer save.
  const scheduleStatusReset = useCallback((delay: number) => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => setStatus('idle'), delay);
  }, []);

  const performSave = useCallback(async () => {
    if (isSavingRef.current || contentRef.current === null) return;

    const snapshot = contentRef.current;
    isSavingRef.current = true;
    // Cancel any pending status reset so a previous save's timer can't flip us to
    // 'idle' during this in-flight save.
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    setStatus('saving');

    try {
      await onSave(snapshot);
      setLastSaved(new Date());
      // Only mark clean if no newer edit arrived while saving — otherwise the pending
      // debounce from registerChange will persist the newer content.
      if (contentRef.current === snapshot) {
        setHasUnsavedChanges(false);
      }
      setStatus('saved');
      scheduleStatusReset(2000);
    } catch (error) {
      console.error('Autosave failed:', error);
      setStatus('error');
      scheduleStatusReset(3000);
    } finally {
      isSavingRef.current = false;
    }
  }, [onSave, scheduleStatusReset]);

  const registerChange = useCallback((content: T) => {
    if (!enabled) return;

    contentRef.current = content;
    setHasUnsavedChanges(true);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(() => {
      performSave();
    }, delay);
  }, [enabled, delay, performSave]);

  const saveNow = useCallback(async () => {
    // Clear any pending autosave
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    await performSave();
  }, [performSave]);

  return {
    status,
    lastSaved,
    saveNow,
    registerChange,
    hasUnsavedChanges,
  };
}

/**
 * Format the last saved time for display
 */
export function formatLastSaved(date: Date | null): string {
  if (!date) return 'Not saved yet';

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);

  if (seconds < 10) {
    return 'Just now';
  } else if (seconds < 60) {
    return `${seconds} seconds ago`;
  } else if (minutes < 60) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  } else {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}
