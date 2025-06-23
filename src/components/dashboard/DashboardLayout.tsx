import React, { ReactNode } from 'react';
import '../../styles/_colors.scss';
import { Header } from '../layout/Header';

interface DashboardLayoutProps {
  children: ReactNode;
  onSettingsClick?: () => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, onSettingsClick }) => {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <div className="flex flex-col flex-1">
        <Header onSettingsClick={onSettingsClick} />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}; 