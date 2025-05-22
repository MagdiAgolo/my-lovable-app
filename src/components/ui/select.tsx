import React from 'react';

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

interface SelectContentProps {
  children: React.ReactNode;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

interface SelectValueProps {
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({ value, onValueChange, children, className }) => {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}
    >
      {children}
    </select>
  );
};

export const SelectTrigger: React.FC<SelectTriggerProps> = ({ children, className }) => {
  return <div className={className}>{children}</div>;
};

export const SelectContent: React.FC<SelectContentProps> = ({ children }) => {
  return <>{children}</>;
};

export const SelectItem: React.FC<SelectItemProps> = ({ value, children }) => {
  return <option value={value}>{children}</option>;
};

export const SelectValue: React.FC<SelectValueProps> = ({ placeholder }) => {
  return <>{placeholder}</>;
}; 