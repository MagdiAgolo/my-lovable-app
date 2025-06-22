import React from 'react';
import { LineChart } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="py-3 px-5 flex justify-between items-center bg-gray-900 border-b border-gray-800" style={{ zIndex: 100, height: '60px', minHeight: '60px' }}>
      <div className="flex items-center">
        <LineChart className="h-5 w-5 mr-2" style={{ color: 'var(--color-primary)' }} />
        <h1 className="text-base font-bold text-white" style={{ whiteSpace: 'nowrap' }}>Implicit Agile Metrics</h1>
      </div>
      <div className="flex items-center justify-end">
      </div>
    </header>
  );
}; 