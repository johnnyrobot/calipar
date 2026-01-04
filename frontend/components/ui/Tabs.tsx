'use client';

import { useState, createContext, useContext, useCallback, useMemo, useId } from 'react';

// Tab context for sharing state
interface TabContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
  baseId: string;
}

const TabContext = createContext<TabContextValue | null>(null);

function useTabContext() {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('Tab components must be used within a Tabs component');
  }
  return context;
}

// Types
export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsProps {
  defaultTab?: string;
  tabs?: TabItem[];
  onChange?: (tabId: string) => void;
  children?: React.ReactNode;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

export interface TabListProps {
  children: React.ReactNode;
  className?: string;
}

export interface TabProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
  badge?: string | number;
  className?: string;
}

export interface TabPanelsProps {
  children: React.ReactNode;
  className?: string;
}

export interface TabPanelProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

// Main Tabs container
export function Tabs({
  defaultTab,
  tabs,
  onChange,
  children,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  className = '',
}: TabsProps) {
  const baseId = useId();
  const [activeTab, setActiveTabState] = useState(() => {
    if (defaultTab) return defaultTab;
    if (tabs && tabs.length > 0) return tabs[0].id;
    return '';
  });

  const setActiveTab = useCallback(
    (id: string) => {
      setActiveTabState(id);
      onChange?.(id);
    },
    [onChange]
  );

  const contextValue = useMemo(
    () => ({ activeTab, setActiveTab, baseId }),
    [activeTab, setActiveTab, baseId]
  );

  // If using simplified tabs prop
  if (tabs) {
    return (
      <TabContext.Provider value={contextValue}>
        <div className={className}>
          <TabList>
            {tabs.map((tab) => (
              <Tab
                key={tab.id}
                id={tab.id}
                disabled={tab.disabled}
                icon={tab.icon}
                badge={tab.badge}
              >
                {tab.label}
              </Tab>
            ))}
          </TabList>
          {children && <TabPanels>{children}</TabPanels>}
        </div>
      </TabContext.Provider>
    );
  }

  // Compound component pattern
  return (
    <TabContext.Provider value={contextValue}>
      <div className={className}>{children}</div>
    </TabContext.Provider>
  );
}

// Tab list container
export function TabList({ children, className = '' }: TabListProps) {
  return (
    <div
      role="tablist"
      className={`flex border-b border-gray-200 ${className}`}
    >
      {children}
    </div>
  );
}

// Individual tab button
export function Tab({
  id,
  children,
  disabled = false,
  icon,
  badge,
  className = '',
}: TabProps) {
  const { activeTab, setActiveTab, baseId } = useTabContext();
  const isActive = activeTab === id;
  const tabId = `${baseId}-tab-${id}`;
  const panelId = `${baseId}-panel-${id}`;

  const handleClick = () => {
    if (!disabled) {
      setActiveTab(id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      id={tabId}
      role="tab"
      aria-selected={isActive}
      aria-controls={panelId}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`
        relative px-4 py-2.5 text-sm font-medium transition-colors
        flex items-center gap-2
        ${isActive
          ? 'text-lamc-blue border-b-2 border-lamc-blue -mb-px'
          : 'text-gray-600 hover:text-gray-900 border-b-2 border-transparent'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {badge !== undefined && (
        <span
          className={`
            ml-1 px-1.5 py-0.5 text-xs font-medium rounded-full
            ${isActive
              ? 'bg-lamc-blue/10 text-lamc-blue'
              : 'bg-gray-100 text-gray-600'
            }
          `}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// Tab panels container
export function TabPanels({ children, className = '' }: TabPanelsProps) {
  return <div className={`mt-4 ${className}`}>{children}</div>;
}

// Individual tab panel
export function TabPanel({ id, children, className = '' }: TabPanelProps) {
  const { activeTab, baseId } = useTabContext();
  const isActive = activeTab === id;
  const tabId = `${baseId}-tab-${id}`;
  const panelId = `${baseId}-panel-${id}`;

  if (!isActive) {
    return null;
  }

  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={tabId}
      tabIndex={0}
      className={className}
    >
      {children}
    </div>
  );
}

// Alternative pill-style tabs
export interface PillTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PillTabs({
  tabs,
  activeTab,
  onChange,
  size = 'md',
  className = '',
}: PillTabsProps) {
  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3.5 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <div
      role="tablist"
      className={`inline-flex bg-gray-100 rounded-lg p-1 ${className}`}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          disabled={tab.disabled}
          onClick={() => !tab.disabled && onChange(tab.id)}
          className={`
            ${sizeClasses[size]}
            font-medium rounded-md transition-all
            flex items-center gap-2
            ${activeTab === tab.id
              ? 'bg-white text-lamc-blue shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
            }
            ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
          <span>{tab.label}</span>
          {tab.badge !== undefined && (
            <span
              className={`
                px-1.5 py-0.5 text-xs font-medium rounded-full
                ${activeTab === tab.id
                  ? 'bg-lamc-blue/10 text-lamc-blue'
                  : 'bg-gray-200 text-gray-600'
                }
              `}
            >
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export default Tabs;
