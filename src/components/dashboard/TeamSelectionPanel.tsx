import React from 'react';
import { Button } from '@/components/ui/button';
import { Users, Settings, RefreshCw } from 'lucide-react';
import { LinearTeam } from '@/types/linear';

interface TeamSelectionPanelProps {
  filteredTeams: LinearTeam[] | undefined;
  selectedTeamId: string | null;
  setSelectedTeamId: (id: string) => void;
  teamName: string;
  onRefresh: () => void;
  onConfigClick: () => void;
}

const TEXT = {
  teamLabel: 'Team:',
  apiConfig: 'API Config',
  refreshData: 'Refresh Data'
};

export const TeamSelectionPanel: React.FC<TeamSelectionPanelProps> = ({
  filteredTeams,
  selectedTeamId,
  setSelectedTeamId,
  teamName,
  onRefresh,
  onConfigClick
}) => {
  return (
    <div className="bg-white p-4 border-b border-gray-200 shadow-md">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <Users className="h-5 w-5 text-blue-600 mr-2" />
            <span className="font-semibold text-gray-700">{TEXT.teamLabel}</span>
          </div>
          
          <select
            value={selectedTeamId || ''}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="bg-white border border-gray-300 text-gray-700 rounded px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label="Select team"
          >
            <option value="" disabled>Select a team</option>
            {filteredTeams?.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          
          {teamName && (
            <div className="border-l border-gray-300 pl-4 ml-2">
              <span className="text-sm font-medium text-gray-900">{teamName}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="xs"
            onClick={onRefresh}
            className="flex items-center gap-1 implicit-btn black"
          >
            <RefreshCw className="h-2.5 w-2.5" />
            <span>{TEXT.refreshData}</span>
          </Button>
          
          <Button
            size="sm"
            onClick={onConfigClick}
            className="flex items-center gap-1"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>{TEXT.apiConfig}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}; 