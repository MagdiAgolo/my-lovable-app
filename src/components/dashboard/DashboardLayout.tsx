import React from 'react';
import '../../styles/_colors.scss';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen grid-pattern" style={{ 
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--color-bg-dark)'
    }}>
      {children}
    </div>
  );
}; 