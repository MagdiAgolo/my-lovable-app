import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MetricsCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
}

export const MetricsCard: React.FC<MetricsCardProps> = ({ title, value, description, icon, trend }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <div className="mt-2 flex items-center text-xs">
            <span className={trend.isPositive ? 'text-green-500' : 'text-red-500'}>
              {trend.isPositive ? '+' : '-'}{trend.value}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 