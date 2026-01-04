'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Heading2,
  Heading3,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Unlink,
} from 'lucide-react';

export interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

interface ToolbarButton {
  icon: React.ComponentType<{ className?: string }>;
  command: string;
  argument?: string;
  label: string;
  type?: 'command' | 'block';
}

export function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Start writing your narrative here...',
  className = '',
  minHeight = '300px',
  disabled = false,
  onFocus,
  onBlur,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // History for undo/redo
  const historyRef = useRef<string[]>([value]);
  const historyIndexRef = useRef(0);
  const isHistoryOperationRef = useRef(false);

  // Initialize editor content
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      // Only update if the content is actually different
      // This prevents cursor jumping during typing
      if (!isFocused || editorRef.current.innerHTML === '') {
        editorRef.current.innerHTML = value;
      }
    }
  }, [value, isFocused]);

  // Check active formatting at cursor position
  const updateActiveFormats = useCallback(() => {
    const formats = new Set<string>();

    if (document.queryCommandState('bold')) formats.add('bold');
    if (document.queryCommandState('italic')) formats.add('italic');
    if (document.queryCommandState('underline')) formats.add('underline');
    if (document.queryCommandState('insertUnorderedList')) formats.add('insertUnorderedList');
    if (document.queryCommandState('insertOrderedList')) formats.add('insertOrderedList');

    setActiveFormats(formats);
  }, []);

  // Save to history for undo/redo
  const saveToHistory = useCallback((content: string) => {
    if (isHistoryOperationRef.current) return;

    // Remove any forward history when making a new change
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(content);
    historyIndexRef.current = historyRef.current.length - 1;

    // Limit history size
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }

    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  // Handle content changes
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange?.(content);
      updateActiveFormats();

      // Debounce history saving
      const timeoutId = setTimeout(() => {
        saveToHistory(content);
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [onChange, updateActiveFormats, saveToHistory]);

  // Execute formatting command
  const execCommand = useCallback((command: string, argument?: string) => {
    if (disabled) return;

    editorRef.current?.focus();
    document.execCommand(command, false, argument);
    handleInput();
  }, [disabled, handleInput]);

  // Handle undo
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      isHistoryOperationRef.current = true;
      historyIndexRef.current--;
      const content = historyRef.current[historyIndexRef.current];
      if (editorRef.current) {
        editorRef.current.innerHTML = content;
        onChange?.(content);
      }
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(true);
      isHistoryOperationRef.current = false;
    }
  }, [onChange]);

  // Handle redo
  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isHistoryOperationRef.current = true;
      historyIndexRef.current++;
      const content = historyRef.current[historyIndexRef.current];
      if (editorRef.current) {
        editorRef.current.innerHTML = content;
        onChange?.(content);
      }
      setCanUndo(true);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      isHistoryOperationRef.current = false;
    }
  }, [onChange]);

  // Format block (heading, paragraph, quote)
  const formatBlock = useCallback((tag: string) => {
    if (disabled) return;

    editorRef.current?.focus();
    document.execCommand('formatBlock', false, tag);
    handleInput();
  }, [disabled, handleInput]);

  // Insert link
  const insertLink = useCallback(() => {
    const url = window.prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  }, [execCommand]);

  // Remove link
  const removeLink = useCallback(() => {
    execCommand('unlink');
  }, [execCommand]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          execCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          execCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          execCommand('underline');
          break;
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
          break;
        case 'y':
          e.preventDefault();
          handleRedo();
          break;
      }
    }
  }, [execCommand, handleUndo, handleRedo]);

  // Handle focus
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    updateActiveFormats();
    onFocus?.();
  }, [updateActiveFormats, onFocus]);

  // Handle blur
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  // Handle paste - strip formatting
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  // Toolbar button groups
  const formatButtons: ToolbarButton[] = [
    { icon: Bold, command: 'bold', label: 'Bold (Ctrl+B)' },
    { icon: Italic, command: 'italic', label: 'Italic (Ctrl+I)' },
    { icon: Underline, command: 'underline', label: 'Underline (Ctrl+U)' },
  ];

  const blockButtons: ToolbarButton[] = [
    { icon: Heading2, command: 'h2', label: 'Heading 2', type: 'block' },
    { icon: Heading3, command: 'h3', label: 'Heading 3', type: 'block' },
    { icon: Quote, command: 'blockquote', label: 'Block Quote', type: 'block' },
  ];

  const listButtons: ToolbarButton[] = [
    { icon: List, command: 'insertUnorderedList', label: 'Bullet List' },
    { icon: ListOrdered, command: 'insertOrderedList', label: 'Numbered List' },
  ];

  const alignButtons: ToolbarButton[] = [
    { icon: AlignLeft, command: 'justifyLeft', label: 'Align Left' },
    { icon: AlignCenter, command: 'justifyCenter', label: 'Align Center' },
    { icon: AlignRight, command: 'justifyRight', label: 'Align Right' },
  ];

  const ToolbarButton = ({ button }: { button: ToolbarButton }) => {
    const Icon = button.icon;
    const isActive = activeFormats.has(button.command);

    return (
      <button
        type="button"
        onClick={() => {
          if (button.type === 'block') {
            formatBlock(button.command);
          } else {
            execCommand(button.command, button.argument);
          }
        }}
        disabled={disabled}
        title={button.label}
        className={`p-1.5 rounded transition-colors ${
          isActive
            ? 'bg-lamc-blue text-white'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <Icon className="w-4 h-4" />
      </button>
    );
  };

  const Divider = () => <div className="w-px h-6 bg-gray-200 mx-1" />;

  return (
    <div className={`border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-lamc-blue focus-within:border-transparent ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200 flex-wrap">
        {/* Undo/Redo */}
        <button
          type="button"
          onClick={handleUndo}
          disabled={disabled || !canUndo}
          title="Undo (Ctrl+Z)"
          className={`p-1.5 rounded transition-colors text-gray-600 hover:bg-gray-100 hover:text-gray-900 ${
            (!canUndo || disabled) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleRedo}
          disabled={disabled || !canRedo}
          title="Redo (Ctrl+Y)"
          className={`p-1.5 rounded transition-colors text-gray-600 hover:bg-gray-100 hover:text-gray-900 ${
            (!canRedo || disabled) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Redo className="w-4 h-4" />
        </button>

        <Divider />

        {/* Text Formatting */}
        {formatButtons.map((button) => (
          <ToolbarButton key={button.command} button={button} />
        ))}

        <Divider />

        {/* Block Formatting */}
        {blockButtons.map((button) => (
          <ToolbarButton key={button.command} button={button} />
        ))}

        <Divider />

        {/* Lists */}
        {listButtons.map((button) => (
          <ToolbarButton key={button.command} button={button} />
        ))}

        <Divider />

        {/* Alignment */}
        {alignButtons.map((button) => (
          <ToolbarButton key={button.command} button={button} />
        ))}

        <Divider />

        {/* Links */}
        <button
          type="button"
          onClick={insertLink}
          disabled={disabled}
          title="Insert Link"
          className={`p-1.5 rounded transition-colors text-gray-600 hover:bg-gray-100 hover:text-gray-900 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={removeLink}
          disabled={disabled}
          title="Remove Link"
          className={`p-1.5 rounded transition-colors text-gray-600 hover:bg-gray-100 hover:text-gray-900 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <Unlink className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Area */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onPaste={handlePaste}
          onSelect={updateActiveFormats}
          className={`px-4 py-3 outline-none prose prose-sm max-w-none ${
            disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
          }`}
          style={{ minHeight }}
          suppressContentEditableWarning
        />

        {/* Placeholder */}
        {(!value || value === '<br>' || value === '') && !isFocused && (
          <div className="absolute top-3 left-4 text-gray-400 pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>

      {/* Editor Styles */}
      <style jsx global>{`
        .prose h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: #111827;
        }
        .prose h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
          color: #374151;
        }
        .prose p {
          margin-bottom: 0.5rem;
        }
        .prose ul, .prose ol {
          margin-left: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .prose ul {
          list-style-type: disc;
        }
        .prose ol {
          list-style-type: decimal;
        }
        .prose blockquote {
          border-left: 3px solid #d1a63c;
          padding-left: 1rem;
          margin: 0.75rem 0;
          font-style: italic;
          color: #4b5563;
          background-color: #fef9e7;
          padding: 0.5rem 1rem;
          border-radius: 0 0.25rem 0.25rem 0;
        }
        .prose a {
          color: #003366;
          text-decoration: underline;
        }
        .prose a:hover {
          color: #002244;
        }
      `}</style>
    </div>
  );
}

export default RichTextEditor;
