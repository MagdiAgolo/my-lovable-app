import React, { ReactNode } from 'react';
import '../../styles/_colors.scss';
import { Header } from '../layout/Header';
import { useGoogleAuth } from '../../context/GoogleAuthContext';

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user } = useGoogleAuth();

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <Header />
      <main className="flex-1 overflow-auto" style={{ padding: 0, margin: 0 }}>
        {children}
      </main>
    </div>
  );
}; 