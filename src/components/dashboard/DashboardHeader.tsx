import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import '../../styles/_colors.scss';

interface DashboardHeaderProps {
  title: string;
  subtitle: string;
  onRefresh?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ title, subtitle, onRefresh }) => {
  return (
    <div className="dashboard-header flex justify-between items-center w-full py-2">
      <div>
        <h1 style={{ 
          color: 'var(--theme-header-color)',
          fontSize: '2.25rem',
          fontWeight: '700',
          margin: '0 0 0.5rem 0',
          letterSpacing: '-0.04em',
          lineHeight: 1.2
        }}>
          {title}
        </h1>
        <p style={{ 
          color: 'var(--theme-text-secondary)',
          fontSize: '0.875rem',
          margin: '0',
          letterSpacing: '0.02em'
        }}>
          {subtitle}
        </p>
      </div>
      {onRefresh && (
        <Button
          onClick={onRefresh}
          size="xs"
          className="implicit-btn black"
        >
          <RefreshCw className="h-2.5 w-2.5 mr-1" />
          Refresh
        </Button>
      )}
    </div>
  );
}; 