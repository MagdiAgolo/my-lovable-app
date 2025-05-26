import React, { useState } from 'react';
import { BarChart3, TrendingUp, PlusCircle, Calendar, LineChart, RefreshCw, Settings, GitBranch, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VelocityTable from './VelocityTable';
import { DashboardHeader } from './DashboardHeader';
import { LinearTeam } from '@/types/linear';
import '../../styles/_colors.scss';
import { FlowBoard } from './FlowBoard';
import { BacklogHealthMonitor } from './BacklogHealthMonitor';

const TEXT = {
  title: 'Agile Metrics',
  velocityChart: 'Velocity Chart',
  velocityTrends: 'Velocity Trends',
  scopeCreep: 'Scope Creep',
  sprintComparison: 'Sprint Comparison',
  flowBoard: 'Flow Board',
  backlogHealth: 'Backlog Health Monitor',
  settings: 'API Config'
};

interface SprintHistoryViewProps {
  selectedTeamId: string;
  filteredTeams: LinearTeam[] | undefined;
  setSelectedTeamId: (id: string) => void;
  onRefresh: () => void;
  selectedCycleId: string | null;
  setSelectedCycleId: (id: string) => void;
  teamName: string;
  onApiConfigClick: () => void;
}

export const SprintHistoryView: React.FC<SprintHistoryViewProps> = ({
  selectedTeamId,
  filteredTeams,
  setSelectedTeamId,
  onRefresh,
  selectedCycleId,
  setSelectedCycleId,
  teamName,
  onApiConfigClick
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'chart' | 'trends' | 'scopeCreep' | 'comparison'>('chart');
  const [showFlowBoard, setShowFlowBoard] = useState(false);
  const [showBacklogHealth, setShowBacklogHealth] = useState(false);

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

  const handleFlowBoardClick = () => {
    console.log('Flow Board clicked, setting showFlowBoard to true');
    setShowFlowBoard(true);
    setShowBacklogHealth(false);
    setActiveSubTab('chart'); // Reset sub tab when switching to flow board
  };

  const handleBacklogHealthClick = () => {
    console.log('Backlog Health Monitor clicked');
    setShowBacklogHealth(true);
    setShowFlowBoard(false);
    setActiveSubTab('chart'); // Reset sub tab
  };

  const handleSubTabClick = (tabId: 'chart' | 'trends' | 'scopeCreep' | 'comparison') => {
    setActiveSubTab(tabId);
    setShowFlowBoard(false);
    setShowBacklogHealth(false);
  };

  return (
    <div className="app-container">
      {/* Left Sidebar */}
      <div className="sidebar-fixed">
        <div className="px-6 py-6">
          <h2 className="text-xl font-bold flex items-center">
            <LineChart className="mr-3 h-5 w-5" style={{ color: 'var(--color-primary)' }} />
            {TEXT.title}
          </h2>
        </div>
        
        <nav className="px-4 mt-4">
          <ul className="space-y-2">
            {navItems.map(item => (
              <li key={item.id}>
                <button
                  onClick={() => handleSubTabClick(item.id as any)}
                  aria-label={`View ${item.label}`}
                  tabIndex={0}
                  className="implicit-nav-item w-full"
                  style={{ 
                    backgroundColor: activeSubTab === item.id && !showFlowBoard && !showBacklogHealth ? 'rgba(75, 202, 122, 0.12)' : 'transparent',
                    color: activeSubTab === item.id && !showFlowBoard && !showBacklogHealth ? 'var(--color-primary)' : 'var(--color-neutral-300)'
                  }}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              </li>
            ))}

            {/* Flow Board Menu Item */}
            <li>
              <button
                onClick={handleFlowBoardClick}
                aria-label="Flow Board"
                tabIndex={0}
                className="implicit-nav-item w-full"
                style={{ 
                  backgroundColor: showFlowBoard ? 'rgba(75, 202, 122, 0.12)' : 'transparent',
                  color: showFlowBoard ? 'var(--color-primary)' : 'var(--color-neutral-300)'
                }}
              >
                <GitBranch className="h-4 w-4" />
                <span>{TEXT.flowBoard}</span>
              </button>
            </li>

            {/* Backlog Health Monitor Menu Item */}
            <li>
              <button
                onClick={handleBacklogHealthClick}
                aria-label="Backlog Health Monitor"
                tabIndex={0}
                className="implicit-nav-item w-full"
                style={{ 
                  backgroundColor: showBacklogHealth ? 'rgba(75, 202, 122, 0.12)' : 'transparent',
                  color: showBacklogHealth ? 'var(--color-primary)' : 'var(--color-neutral-300)',
                  whiteSpace: 'nowrap'
                }}
              >
                <Activity className="h-4 w-4" />
                <span>{TEXT.backlogHealth}</span>
              </button>
            </li>

            {/* Settings Menu Item */}
            <li>
              <button
                onClick={onApiConfigClick}
                aria-label="API Configuration"
                tabIndex={0}
                className="implicit-nav-item w-full"
                style={{ 
                  backgroundColor: 'transparent',
                  color: 'var(--color-neutral-300)'
                }}
              >
                <Settings className="h-4 w-4" />
                <span>{TEXT.settings}</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>
      
      {/* Right Content */}
      <div className="main-content grid-pattern">
        <div className="p-8 space-y-6">
          <div className="flex justify-between items-center">
            <DashboardHeader 
              title={`${teamName} ${showFlowBoard ? 'Flow Board' : showBacklogHealth ? 'Backlog Health' : 'Performance'}`}
              subtitle={
                showFlowBoard 
                  ? "Visualize your team's workflow" 
                  : showBacklogHealth 
                    ? "Monitor the health of your team's backlog"
                    : "Monitor your team's performance metrics from Linear"
              } 
              onRefresh={onRefresh}
            />
          </div>
          
          {/* Team Selection */}
          <div className="flex flex-wrap gap-2 mb-6">
            {filteredTeams?.map((team) => (
              <button
                key={team.id}
                onClick={() => setSelectedTeamId(team.id)}
                className="px-4 py-2 text-sm font-medium rounded-md transition-colors"
                style={{ 
                  backgroundColor: selectedTeamId === team.id 
                    ? 'var(--color-primary)' 
                    : 'rgba(75, 202, 122, 0.08)',
                  color: selectedTeamId === team.id 
                    ? 'var(--color-bg-darker)' 
                    : 'var(--color-neutral-100)',
                  boxShadow: selectedTeamId === team.id 
                    ? '0 4px 10px var(--glow-primary)' 
                    : 'none',
                  borderRadius: '6px'
                }}
              >
                {team.name}
              </button>
            ))}
          </div>
          
          {/* Main Content */}
          {showFlowBoard ? (
            <div className="implicit-card">
              {/* Debug info */}
              {(() => { console.log('Rendering FlowBoard component with teamId:', selectedTeamId); return null; })()}
              <FlowBoard teamId={selectedTeamId || ''} />
            </div>
          ) : showBacklogHealth ? (
            <div className="implicit-card">
              <BacklogHealthMonitor teamId={selectedTeamId || ''} />
            </div>
          ) : (
            <div className="implicit-card">
              <VelocityTable 
                teamId={selectedTeamId || ''}
                onRefresh={onRefresh}
                selectedCycleId={selectedCycleId}
                setSelectedCycleId={setSelectedCycleId}
                setSelectedTeamId={setSelectedTeamId}
                activeSubTab={activeSubTab}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 