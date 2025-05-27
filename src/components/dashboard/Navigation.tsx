import React from 'react';
import { BarChart3, TrendingUp, PlusCircle, LayoutDashboard, Users } from 'lucide-react';

interface NavigationProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

// Define the navigation items that will appear in the sidebar
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'velocityChart', label: 'Velocity History', icon: BarChart3 },
  { id: 'velocityTrends', label: 'Velocity Trends', icon: TrendingUp },
  { id: 'scopeCreep', label: 'Scope Creep', icon: PlusCircle },
  { id: 'engineers', label: 'Engineer Performance', icon: Users }
];

const TEXT = {
  navigation: 'Navigation',
  title: 'Linear Dashboard',
  subtitle: 'Sprint Performance',
  copyright: '© 2023 Linear Dashboard',
  version: 'Version 1.0.0'
};

export const Navigation: React.FC<NavigationProps> = ({ activeView, setActiveView }) => {
  return (
    <div className="h-full w-full bg-white py-4 flex flex-col h-screen">
      <div className="px-4 mb-6 border-b border-gray-200 pb-4">
        <h1 className="text-xl font-bold text-gray-800">{TEXT.title}</h1>
        <p className="text-sm text-gray-500">{TEXT.subtitle}</p>
      </div>
      
      {/* Navigation Items */}
      <div className="px-4 mb-4">
        <h2 className="text-xs uppercase font-semibold text-gray-500 mb-2">{TEXT.navigation}</h2>
      </div>
      
      <nav className="flex-1 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {NAV_ITEMS.map(item => (
            <li key={item.id}>
              <button
                onClick={() => setActiveView(item.id)}
                aria-label={`Navigate to ${item.label}`}
                tabIndex={0}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  activeView === item.id
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="px-4 mt-auto pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p>{TEXT.copyright}</p>
          <p>{TEXT.version}</p>
        </div>
      </div>
    </div>
  );
}; 