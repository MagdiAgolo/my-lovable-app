import React from 'react';

interface TabsProps {
  children: React.ReactNode;
  defaultValue: string;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ children, defaultValue, className }) => {
  return (
    <div className={`tabs ${className || ''}`}>
      {children}
    </div>
  );
};

export const TabsList: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="tabs-list">
      {children}
    </div>
  );
};

export const TabsTrigger: React.FC<{ value: string; children: React.ReactNode }> = ({ value, children }) => {
  return (
    <button className="tabs-trigger" data-value={value}>
      {children}
    </button>
  );
};

export const TabsContent: React.FC<{ value: string; children: React.ReactNode; className?: string }> = ({ value, children, className }) => {
  return (
    <div className={`tabs-content ${className || ''}`} data-value={value}>
      {children}
    </div>
  );
}; 