import React from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

interface ContentAreaProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export const ContentArea: React.FC<ContentAreaProps> = ({ title, subtitle, children }) => {
  return (
    <div className="bg-white flex-1 p-6 overflow-auto rounded-lg shadow-sm m-4">
      <DashboardHeader 
        title={title}
        subtitle={subtitle} 
      />
      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}; 