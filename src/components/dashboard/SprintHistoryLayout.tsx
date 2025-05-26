import React, { useState } from 'react';
import { SprintHistorySidebar } from './SprintHistorySidebar';
import { SprintHistoryContent } from './SprintHistoryContent';
import { LinearCycle, LinearIssue, LinearTeam } from '@/types/linear';

interface SprintHistoryLayoutProps {
  cycles: LinearCycle[] | undefined;
  cycleIssues: LinearIssue[];
  selectedCycleId: string | null;
  setSelectedCycleId: (id: string) => void;
  selectedTeamId: string;
  setSelectedTeamId: (id: string) => void;
  handleRefresh: () => void;
  isLoading: boolean;
  error: Error | null;
  scopeCreepHistory: Array<{
    cycleId: string;
    cycleName: string;
    originalPoints: number;
    addedPoints: number;
    percentage: number;
    addedIssues: number;
  }>;
  teams: LinearTeam[] | undefined;
}

export const SprintHistoryLayout: React.FC<SprintHistoryLayoutProps> = ({
  cycles,
  cycleIssues,
  selectedCycleId,
  setSelectedCycleId,
  selectedTeamId,
  setSelectedTeamId,
  handleRefresh,
  isLoading,
  error,
  scopeCreepHistory,
  teams
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'chart' | 'trends' | 'scopeCreep' | 'comparison'>('chart');

  return (
    <div className="flex h-full">
      <SprintHistorySidebar 
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
      />
      
      <div className="flex-1 p-4 overflow-auto">
        <SprintHistoryContent 
          activeSubTab={activeSubTab}
          cycles={cycles}
          cycleIssues={cycleIssues}
          selectedCycleId={selectedCycleId}
          setSelectedCycleId={setSelectedCycleId}
          selectedTeamId={selectedTeamId}
          handleRefresh={handleRefresh}
          isLoading={isLoading}
          error={error}
          scopeCreepHistory={scopeCreepHistory}
          teams={teams}
          setSelectedTeamId={setSelectedTeamId}
        />
      </div>
    </div>
  );
}; 