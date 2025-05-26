import React from 'react';
import { BarChart3, TrendingUp, PlusCircle, Calendar, LineChart } from 'lucide-react';

const TEXT = {
  title: 'Agile Metrics',
  velocityChart: 'Velocity Chart',
  velocityTrends: 'Velocity Trends',
  scopeCreep: 'Scope Creep',
  sprintComparison: 'Sprint Comparison'
};

interface SprintHistorySidebarProps {
  activeSubTab: 'chart' | 'trends' | 'scopeCreep' | 'comparison';
  setActiveSubTab: (tab: 'chart' | 'trends' | 'scopeCreep' | 'comparison') => void;
}

export const SprintHistorySidebar: React.FC<SprintHistorySidebarProps> = ({
  activeSubTab,
  setActiveSubTab
}) => {
  const navItems = [
    {
      id: 'chart',
      label: TEXT.velocityChart,
      icon: BarChart3
    },
    {
      id: 'trends',
      label: TEXT.velocityTrends,
      icon: TrendingUp
    },
    {
      id: 'scopeCreep',
      label: TEXT.scopeCreep,
      icon: PlusCircle
    },
    {
      id: 'comparison',
      label: TEXT.sprintComparison,
      icon: Calendar
    }
  ];

  return (
    <div className="h-full bg-white border-r border-gray-200 w-full py-4 sticky top-0">
      <div className="px-4 mb-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center">
          <LineChart className="mr-2 h-5 w-5 text-blue-600" />
          {TEXT.title}
        </h2>
      </div>
      
      <nav className="flex-1 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map(item => (
            <li key={item.id}>
              <button
                onClick={() => setActiveSubTab(item.id as any)}
                aria-label={`View ${item.label}`}
                tabIndex={0}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  activeSubTab === item.id
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}; 