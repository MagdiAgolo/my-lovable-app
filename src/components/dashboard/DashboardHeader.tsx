import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  onRefresh?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ title, subtitle, onRefresh }) => {
  return (
    <div className="dashboard-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {onRefresh && (
        <Button
          onClick={onRefresh}
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      )}
    </div>
  );
}; 