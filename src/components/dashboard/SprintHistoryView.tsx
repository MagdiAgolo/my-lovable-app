import React, { useState } from 'react';
import { BarChart3, TrendingUp, PlusCircle, LineChart, RefreshCw, Settings, GitBranch, Activity, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VelocityTable from './VelocityTable';
import { DashboardHeader } from './DashboardHeader';
import { LinearTeam } from '@/types/linear';
import '../../styles/_colors.scss';
import { FlowBoard } from './FlowBoard';
import { BacklogHealthMonitor } from './BacklogHealthMonitor';
import SimpleSprintIssues from './SimpleSprintIssues';
import { ApiKeyConfig } from '@/components/config/ApiKeyConfig';

const TEXT = {
  velocityChart: 'Velocity History',
  velocityTrends: 'Velocity Trends',
  scopeCreep: 'Scope Creep',
  doneIssues: 'Done Issues',
  flowBoard: 'Flow Board',
  backlogHealth: 'Backlog Health Monitor',
  settings: 'Settings'
};

interface SprintHistoryViewProps {
  selectedTeamId: string;
  filteredTeams: LinearTeam[] | undefined;
  setSelectedTeamId: (id: string) => void;
  onRefresh: () => void;
  selectedCycleId: string | null;
  setSelectedCycleId: (id: string) => void;
  teamName: string;
  showApiConfig: boolean;
  onApiConfigClick: () => void;
  onApiConfigClose: () => void;
}

export const SprintHistoryView: React.FC<SprintHistoryViewProps> = ({
  selectedTeamId,
  filteredTeams,
  setSelectedTeamId,
  onRefresh,
  selectedCycleId,
  setSelectedCycleId,
  teamName,
  showApiConfig,
  onApiConfigClick,
  onApiConfigClose
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'chart' | 'trends' | 'scopeCreep'>('chart');
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
    }
  ];

  const handleFlowBoardClick = () => {
    console.log('Flow Board clicked, setting showFlowBoard to true');
    setShowFlowBoard(true);
    setShowBacklogHealth(false);
    setActiveSubTab('chart'); // Reset sub tab when switching to flow board
    onApiConfigClose(); // Close settings when switching to flow board
  };

  const handleBacklogHealthClick = () => {
    console.log('Backlog Health Monitor clicked');
    setShowBacklogHealth(true);
    setShowFlowBoard(false);
    setActiveSubTab('chart'); // Reset sub tab
    onApiConfigClose(); // Close settings when switching to backlog health
  };

  const handleSubTabClick = (tabId: 'chart' | 'trends' | 'scopeCreep') => {
    setActiveSubTab(tabId);
    setShowFlowBoard(false);
    setShowBacklogHealth(false);
    onApiConfigClose(); // Close settings when switching to other tabs
  };

  const handleApiConfigClick = () => {
    setActiveSubTab('chart'); // Reset sub tab
    setShowFlowBoard(false);
    setShowBacklogHealth(false);
    onApiConfigClick();
  };

  return (
    <div className="app-container">
      {/* Left Sidebar */}
      <div className="sidebar-fixed">
        <nav className="px-4 mt-8">
          <ul className="space-y-2">
            {navItems.map(item => (
              <li key={item.id}>
                <button
                  onClick={() => handleSubTabClick(item.id as any)}
                  aria-label={`View ${item.label}`}
                  tabIndex={0}
                  className="implicit-nav-item w-full"
                  style={{ 
                    backgroundColor: activeSubTab === item.id && !showFlowBoard && !showBacklogHealth ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
                    color: activeSubTab === item.id && !showFlowBoard && !showBacklogHealth ? 'var(--theme-menu-color)' : 'var(--theme-text-secondary)'
                  }}
                >
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
                  backgroundColor: showFlowBoard ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
                  color: showFlowBoard ? 'var(--theme-menu-color)' : 'var(--theme-text-secondary)'
                }}
              >
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
                  backgroundColor: showBacklogHealth ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
                  color: showBacklogHealth ? 'var(--theme-menu-color)' : 'var(--theme-text-secondary)',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{TEXT.backlogHealth}</span>
              </button>
            </li>

            {/* Settings Menu Item */}
            <li>
              <button
                onClick={handleApiConfigClick}
                aria-label="Settings"
                tabIndex={0}
                className="implicit-nav-item w-full"
                style={{ 
                  backgroundColor: showApiConfig ? 'rgba(37, 99, 235, 0.12)' : 'transparent',
                  color: showApiConfig ? 'var(--theme-menu-color)' : 'var(--theme-text-secondary)'
                }}
              >
                <span>{TEXT.settings}</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>
      
      {/* Right Content */}
      <div className="main-content grid-pattern">
        <div className="px-8 pt-6 pb-8 space-y-6">
          <div className="flex justify-between items-center">
            <DashboardHeader 
              title={showApiConfig ? 'Settings' : `${teamName} ${showFlowBoard ? 'Flow Board' : showBacklogHealth ? 'Backlog Health' : 'Performance'}`}
              subtitle={
                showApiConfig
                  ? "API config"
                  : showFlowBoard 
                    ? "Visualize your team's workflow" 
                    : showBacklogHealth 
                      ? "Monitor the health of your team's backlog"
                      : activeSubTab === 'chart'
                        ? "Track historical velocity and completed story points across sprints"
                        : activeSubTab === 'trends'
                          ? "Analyze velocity patterns and predict future sprint performance"
                          : "Identify scope changes and measure work added mid-sprint"
              } 
              onRefresh={onRefresh}
            />
          </div>
          
          {/* Team Selection - Hidden when showing settings */}
          {!showApiConfig && (
            <div className="flex flex-wrap gap-2">
              {filteredTeams?.map((team) => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                  className="px-4 py-2 text-sm font-medium rounded-md transition-colors"
                  style={{ 
                    backgroundColor: selectedTeamId === team.id 
                      ? 'var(--color-primary)' 
                      : 'rgba(37, 99, 235, 0.08)',
                    color: selectedTeamId === team.id 
                      ? 'var(--color-bg-darker)' 
                      : 'var(--theme-text-primary)',
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
          )}
          
          {/* Main Content */}
          {showApiConfig ? (
            <div className="implicit-card">
              <h2 className="text-xl font-bold text-white mb-6">Settings</h2>
              <ApiKeyConfig onSuccessfulConnection={onApiConfigClose} />
            </div>
          ) : showFlowBoard ? (
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