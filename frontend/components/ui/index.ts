/**
 * UI Component Library
 * Reusable components for the CALIPAR platform
 */

// Button
export { Button } from './Button';
export type { ButtonProps } from './Button';

// Spinner/Loading
export { Spinner, FullPageSpinner, InlineSpinner } from './Spinner';
export type { SpinnerProps, FullPageSpinnerProps, InlineSpinnerProps } from './Spinner';

// Toast Notifications
export { ToastProvider, useToast } from './Toast';

// Form Inputs
export { Input, Textarea, Select, Checkbox } from './Input';
export type { InputProps, TextareaProps, SelectProps, SelectOption, CheckboxProps } from './Input';

// Modal/Dialog
export { Modal, ConfirmDialog } from './Modal';
export type { ModalProps, ConfirmDialogProps } from './Modal';

// Card
export { Card, CardHeader, StatCard } from './Card';
export type { CardProps, CardHeaderProps, StatCardProps } from './Card';

// Badge
export { Badge, StatusBadge } from './Badge';
export type { BadgeProps, StatusBadgeProps } from './Badge';

// Rich Text Editor
export { RichTextEditor } from './RichTextEditor';
export type { RichTextEditorProps } from './RichTextEditor';

// Autosave Indicator
export { AutosaveIndicator } from './AutosaveIndicator';

// Table
export { Table } from './Table';
export type { TableProps, TableColumn } from './Table';

// Pagination
export { Pagination, PageSizeSelector } from './Pagination';
export type { PaginationProps, PageSizeSelectorProps } from './Pagination';

// Tabs
export { Tabs, TabList, Tab, TabPanels, TabPanel, PillTabs } from './Tabs';
export type { TabsProps, TabListProps, TabProps, TabPanelsProps, TabPanelProps, TabItem, PillTabsProps } from './Tabs';
