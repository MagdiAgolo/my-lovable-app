import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { linearService } from '@/services/linearService';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock, BarChart3, AlertTriangle, BarChart, ClipboardList, Users, TrendingUp, History, LineChart, Calendar, PlusCircle } from 'lucide-react';
import { LinearIssue } from '@/types/linear';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart as RechartsLineChart, Line, ReferenceLine } from 'recharts';
import { VelocityPerEngineer } from './VelocityPerEngineer';
import { toast } from 'sonner';
import { SprintHistoryContent } from './SprintHistoryContent';
import '../../styles/chartTheme.scss';

interface VelocityTableProps {
  teamId: string;
  onRefresh: () => void;
  selectedCycleId: string | null;
  setSelectedCycleId: (id: string) => void;
  setSelectedTeamId?: (id: string) => void;
  activeSubTab?: 'chart' | 'trends' | 'scopeCreep' | 'comparison';
}

export default function VelocityTable({ 
  teamId, 
  onRefresh, 
  selectedCycleId, 
  setSelectedCycleId, 
  setSelectedTeamId,
  activeSubTab = 'chart'
}: VelocityTableProps) {
  const [showIssues, setShowIssues] = useState(false);
  const [activeTab, setActiveTab] = useState<'velocity' | 'issues'>('velocity');
  const [activeVelocitySubTab, setActiveVelocitySubTab] = useState<'total' | 'perEngineer'>('total');
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const [filteredIssues, setFilteredIssues] = useState<LinearIssue[]>([]);
  // Add state for selected filters
  const [selectedEngineer, setSelectedEngineer] = useState<string>('all');
  const [selectedEstimate, setSelectedEstimate] = useState<string>('-1');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Add refs to track previous values to prevent infinite loops
  const prevFilteredIssuesRef = useRef<LinearIssue[]>([]);
  const prevCycleIssuesRef = useRef<LinearIssue[]>([]);
  const prevSelectedEngineerRef = useRef<string>('all');
  const prevSelectedEstimateRef = useRef<string>('-1');
  const prevSearchQueryRef = useRef<string>('');

  // Add scope creep state here - MOVED UP to avoid conditional hooks
  const [scopeCreepHistory, setScopeCreepHistory] = useState<Array<{
    cycleId: string;
    cycleName: string;
    originalPoints: number;
    addedPoints: number;
    percentage: number;
    addedIssues: number;
  }>>([]);

  // Track previous cycle ID to detect actual cycle changes
  const [previousCycleId, setPreviousCycleId] = useState<string | null>(null);

  // Update lastRefresh when onRefresh is called
  const handleRefresh = () => {
    setLastRefresh(Date.now());
    onRefresh();
  };

  // Filter cutoffs
  const FEB_2025_CUTOFF = new Date('2025-02-01T00:00:00Z').getTime();
  const TODAY = new Date().getTime();

  const { data: issues, isLoading: isLoadingIssues, error: issuesError } = useQuery({
    queryKey: ["issues", teamId],
    queryFn: () => linearService.getIssuesByTeam(teamId),
    retry: 1, // Only retry once to avoid multiple error messages
  });

  const { data: allCycles, isLoading: isLoadingCycles, error: cyclesError } = useQuery({
    queryKey: ["cycles", teamId],
    queryFn: () => linearService.getTeamCycles(teamId),
    retry: 1, // Only retry once to avoid multiple error messages
  });

  // Filter cycles that started before Feb 2025 or haven't ended yet
  const cycles = allCycles?.filter(cycle => {
    // Skip cycles without dates
    if (!cycle.startsAt) return false;
    
    const cycleStartTime = new Date(cycle.startsAt).getTime();
    
    // Filter out cycles that haven't ended yet (end date is in the future)
    if (cycle.endsAt) {
      const cycleEndTime = new Date(cycle.endsAt).getTime();
      if (cycleEndTime > TODAY) return false;
    }
    
    return true;
  });

  // Automatically select the first cycle when teamId or cycles change
  useEffect(() => {
    if (cycles && cycles.length > 0) {
      // Only update if there's no selected cycle ID or the current one doesn't exist in the filtered cycles
      const cycleExists = selectedCycleId && cycles.some(c => c.id === selectedCycleId);
      
      if (!selectedCycleId || !cycleExists) {
        setSelectedCycleId(cycles[0].id);
      }
    }
  }, [teamId, cycles]);

  // Display a message if no cycles are available
  if (!isLoadingCycles && (!cycles || cycles.length === 0)) {
    return (
      <div className="p-6 text-center">
        <h3 className="text-lg font-medium text-gray-300 mb-2">No Sprint Cycles Found</h3>
        <p className="text-gray-400 mb-4">There are no sprint cycles available for this team.</p>
        <div className="flex justify-center">
          <button
            onClick={onRefresh}
            className="flex items-center px-3 py-2 bg-black text-green-400 hover:bg-gray-900 border border-primary rounded text-sm"
          >
            <RefreshCw className="w-3 h-3 mr-2" />
            Refresh Data
          </button>
        </div>
      </div>
    );
  }

  // Add scope creep useEffect here - MOVED UP to avoid conditional execution
  useEffect(() => {
    if (!cycles || !issues) return;
    
      const scopeCreepData = cycles.map(cycle => {
        const cycleIssues = issues.filter(issue => issue.cycle?.id === cycle.id);
        
        if (!cycle.startsAt) {
          return {
            cycleId: cycle.id,
            cycleName: cycle.name,
            originalPoints: cycle.points || 0,
            addedPoints: 0,
            percentage: 0,
            addedIssues: 0
          };
        }
        
        const cycleStartDate = new Date(cycle.startsAt);
        const addedIssues = cycleIssues.filter(issue => 
          new Date(issue.createdAt) > cycleStartDate
        );
        
        const addedPoints = addedIssues.reduce((sum, issue) => 
          sum + (issue.estimate || 0), 0);
        
        const originalPoints = cycle.points || 0;
        const percentage = originalPoints > 0 
          ? (addedPoints / originalPoints) * 100 
          : 0;
        
        return {
          cycleId: cycle.id,
          cycleName: cycle.name,
          originalPoints,
          addedPoints,
          percentage,
          addedIssues: addedIssues.length
        };
      });
      
    // Only update if data has changed to prevent unnecessary re-renders
    const dataString = JSON.stringify(scopeCreepData);
    const prevDataString = JSON.stringify(scopeCreepHistory);
    
    if (dataString !== prevDataString) {
      setScopeCreepHistory(scopeCreepData);
    }
  }, [cycles, issues]); // Removed lastRefresh from dependencies

  // Filter issues for selected cycle
  const cycleIssues = issues?.filter(issue => {
    // Skip issues without cycle data
    if (!issue.cycle?.startsAt || !issue.cycle?.endsAt) return false;
    
    const cycleStartTime = new Date(issue.cycle.startsAt).getTime();
    const cycleEndTime = new Date(issue.cycle.endsAt).getTime();
    
    // Skip canceled or duplicate issues
    const isCanceled = 
      issue.state?.name?.toLowerCase().includes('cancel') ||
      issue.state?.name?.toLowerCase().includes('duplicate') ||
      issue.state?.type === 'canceled';
    
    if (isCanceled) return false;
    
    // Only include issues from completed cycles
    return cycleEndTime <= TODAY && 
           issue.cycle?.id === selectedCycleId;
  }) || [];

  // Initialize filteredIssues whenever cycleIssues changes
  useEffect(() => {
    // Only process if we have valid data
    if (!cycleIssues) return;
    
    // Only reset filters when the cycle actually changes
    if (selectedCycleId !== previousCycleId) {
      setSelectedEngineer('all');
      setSelectedEstimate('-1');
      setSearchQuery('');
      setPreviousCycleId(selectedCycleId);
    }
    
    // Log the total number of non-canceled issues in this cycle
    console.log(`Total non-canceled issues in cycle: ${cycleIssues.length}`);
    
    // Only update filteredIssues if cycleIssues has actually changed
    const currentIssuesIds = cycleIssues.map(issue => issue.id).join(',');
    const prevIssuesIds = prevCycleIssuesRef.current.map(issue => issue.id).join(',');
    
    if (currentIssuesIds !== prevIssuesIds && cycleIssues.length > 0) {
    setFilteredIssues(cycleIssues);
      prevCycleIssuesRef.current = cycleIssues;
    }
  }, [cycleIssues, selectedCycleId]); // Removed previousCycleId from dependencies

  // Apply filters when they change
  useEffect(() => {
    // Skip if no cycleIssues or no changes in filters
    if (cycleIssues.length === 0) return;
    
    // Check if any filters have changed
    if (
      selectedEngineer === prevSelectedEngineerRef.current && 
      selectedEstimate === prevSelectedEstimateRef.current && 
      searchQuery === prevSearchQueryRef.current
    ) {
      return;
    }
    
    // Update previous filter values
    prevSelectedEngineerRef.current = selectedEngineer;
    prevSelectedEstimateRef.current = selectedEstimate;
    prevSearchQueryRef.current = searchQuery;
    
    let filtered = [...cycleIssues];
    
    // Apply engineer filter
    if (selectedEngineer !== 'all') {
      const normalizedSelectedEngineer = selectedEngineer.toLowerCase().trim();
      
      filtered = filtered.filter(issue => {
        // Handle "Unassigned" as a special case
        if (normalizedSelectedEngineer === "unassigned") {
          return !issue.engineer;
        }
        
        // Handle null or undefined engineer
        if (!issue.engineer) return false;
        
        // Normalize the issue's engineer name and compare
        return issue.engineer.toLowerCase().trim() === normalizedSelectedEngineer;
      });
    }
    
    // Apply estimate filter
    if (selectedEstimate !== '-1') {
      const estimateValue = parseInt(selectedEstimate, 10);
      filtered = filtered.filter(issue => issue.estimate === estimateValue);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(issue => 
        issue.title.toLowerCase().includes(query) ||
        (issue.identifier && issue.identifier.toLowerCase().includes(query))
      );
    }
    
    // Only update state if filtered results have changed
    const filteredIds = filtered.map(issue => issue.id).sort().join(',');
    const prevFilteredIds = prevFilteredIssuesRef.current.map(issue => issue.id).sort().join(',');
    
    if (filteredIds !== prevFilteredIds) {
    setFilteredIssues(filtered);
      prevFilteredIssuesRef.current = filtered;
    }
  }, [cycleIssues, selectedEngineer, selectedEstimate, searchQuery]);

  // Get the selected cycle
  const selectedCycle = cycles?.find(cycle => cycle.id === selectedCycleId);
  
  // Use the cycle's points value directly
  const totalVelocity = selectedCycle?.points || 0;
  
  // Add debug logging to verify the velocity value
  if (selectedCycle) {
    console.log(`Selected cycle: ${selectedCycle.name}, points: ${selectedCycle.points}`);
    
    // Calculate velocity directly from issues to double-check
    const cycleCompletedIssues = cycleIssues.filter(issue => linearService.isIssueCompleted(issue));
    const calculatedVelocity = cycleCompletedIssues.reduce((sum, issue) => sum + (issue.estimate || 0), 0);
    console.log(`Direct calculation for cycle ${selectedCycle.name}: ${cycleCompletedIssues.length} completed issues, ${calculatedVelocity} total points`);
  }
  
  // Calculate cycle time for completed issues
  const calculateCycleTime = () => {
    // Filter for completed issues with both created and completed dates
    const completedIssues = cycleIssues.filter(issue => 
      issue.createdAt && 
      issue.completedAt && 
      linearService.isIssueCompleted(issue)
    );
    
    if (completedIssues.length === 0) return 0;
    
    // Calculate time difference in days for each issue
    const cycleTimes = completedIssues.map(issue => {
      const createdDate = new Date(issue.createdAt);
      const completedDate = new Date(issue.completedAt!);
      const diffTime = completedDate.getTime() - createdDate.getTime();
      return diffTime / (1000 * 60 * 60 * 24); // Convert to days
    });
    
    // Calculate average cycle time
    const totalTime = cycleTimes.reduce((sum, time) => sum + time, 0);
    return totalTime / cycleTimes.length;
  };
  
  const averageCycleTime = calculateCycleTime();
  
  // Prepare data for the sprint velocity chart
  const prepareChartData = () => {
    if (!cycles || cycles.length === 0) {
      console.log('No cycles available for chart data');
      return [];
    }
    
    // Sort cycles chronologically (oldest to newest)
    const sortedCycles = [...cycles].sort((a, b) => a.number - b.number);
    
    // Format data for the bar chart
    const data = sortedCycles.map(cycle => ({
      name: cycle.name,
      velocity: cycle.points || 0, // Ensure points is not undefined
      cycleId: cycle.id,
      startDate: cycle.startsAt || '',
      endDate: cycle.endsAt || ''
    }));
    
    console.log(`Chart data prepared: ${data.length} completed cycles`);
    return data;
  };
  
  const chartData = prepareChartData();

  // Add a helper function to extract and format issue IDs
  const formatIssueIdentifier = (issue: LinearIssue): string => {
    // If issue already has a properly formatted identifier, use it (most reliable)
    if (issue.identifier && /^[A-Z]+-\d{1,6}$/.test(issue.identifier)) {
      return issue.identifier;
    }
    
    // Try to extract from the title if it contains a pattern like "ARC-935: Fix the bug"
    const titleMatch = issue.title.match(/^([A-Z]+-\d{1,5}):/);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1];
    }
    
    // Extract from team key + some ID
    if (issue.team?.key) {
      // Generate a unique but reasonable ID number based on characters in the issue ID
      // Convert last 3 chars of ID to a number and take modulo 10000 to keep it reasonable
      const chars = issue.id.replace(/[^a-zA-Z0-9]/g, '').slice(-3);
      let numberValue = 0;
      for (let i = 0; i < chars.length; i++) {
        numberValue += chars.charCodeAt(i);
      }
      // Use modulo to keep the number reasonable (4 digits max)
      const reasonableNumber = (numberValue % 10000) + 1;
      return `${issue.team.key}-${reasonableNumber}`;
    }
    
    // If we can't extract a proper ID, fallback to shortened ID
    return issue.id.substring(0, 6);
  };

  // Check for the specific "Entity not found: Team" error
  const hasTeamNotFoundError = 
    (issuesError && issuesError.message?.includes("Entity not found: Team")) ||
    (cyclesError && cyclesError.message?.includes("Entity not found: Team"));

  if (hasTeamNotFoundError) {
    return (
      <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex items-center space-x-2 mb-2">
          <AlertTriangle className="w-6 h-6 text-yellow-500" />
          <h2 className="text-xl font-bold text-yellow-700">Team Not Found</h2>
        </div>
        <p className="mb-4">The selected team ID "{teamId}" could not be found in Linear. This might be due to:</p>
        <ul className="list-disc ml-6 mb-4 text-gray-700">
          <li>The team no longer exists in Linear</li>
          <li>Your API key doesn't have access to this team</li>
          <li>A temporary connection issue with Linear's API</li>
        </ul>
        <Button onClick={handleRefresh} size="xs" className="implicit-btn black">
          <RefreshCw className="h-2.5 w-2.5 mr-1" />
          Try Again
        </Button>
      </div>
    );
  }

  if (isLoadingIssues || isLoadingCycles) {
    return <div>Loading velocity data...</div>;
  }

  // Show a generic error for other error types
  if (issuesError || cyclesError) {
    return (
      <div className="p-6 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-center space-x-2 mb-2">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <h2 className="text-xl font-bold text-red-700">Error Loading Data</h2>
        </div>
        <p className="mb-4">{issuesError?.message || cyclesError?.message || "An unknown error occurred"}</p>
        <Button onClick={handleRefresh} size="xs" className="implicit-btn black">
          <RefreshCw className="h-2.5 w-2.5 mr-1" />
          Try Again
        </Button>
      </div>
    );
  }

  if (!issues || !cycles || cycles.length === 0) {
    return (
      <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex items-center space-x-2 mb-2">
          <AlertTriangle className="w-6 h-6 text-yellow-500" />
          <h2 className="text-xl font-bold text-yellow-700">No Completed Sprint Data Available</h2>
        </div>
        <p className="mb-4">There are no completed sprints available.</p>
        <Button onClick={handleRefresh} size="xs" className="implicit-btn black">
          <RefreshCw className="h-2.5 w-2.5 mr-1" />
          Refresh Data
        </Button>
      </div>
    );
  }

  // Display appropriate content based on activeSubTab
  const renderSprintHistoryContent = () => {
    return (
      <SprintHistoryContent
        activeSubTab={activeSubTab}
        cycles={cycles}
        cycleIssues={cycleIssues}
        selectedCycleId={selectedCycleId || ''}
        setSelectedCycleId={setSelectedCycleId}
        selectedTeamId={teamId}
        handleRefresh={handleRefresh}
        isLoading={isLoadingCycles || isLoadingIssues}
        error={cyclesError || issuesError || null}
        scopeCreepHistory={scopeCreepHistory}
        teams={allCycles ? [{ id: teamId, name: 'Current Team', key: 'TEAM' }] : undefined}
        setSelectedTeamId={setSelectedTeamId || (() => {})}
      />
    );
  };

  return (
    <div className="space-y-6 w-full">
      <div className="p-4 bg-white rounded-lg shadow w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
          <h2 className="text-xl font-bold mb-4 sm:mb-0">Sprint Metrics</h2>
          <div className="flex items-center space-x-3">
            {/* Refresh button removed */}
          </div>
        </div>

        {/* Main Content */}
        <div className="mb-6">
            <div className="space-y-6">
            {/* Render Sprint History Content based on the sidebar selection */}
            {renderSprintHistoryContent()}
      </div>
        </div>
      </div>

      {showIssues && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl w-full relative">
            <button onClick={() => setShowIssues(false)} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">&times;</button>
            <h2 className="text-lg font-semibold mb-4">Issues for {selectedCycle?.name || 'Selected Cycle'}</h2>
            
            <div className="mb-4 flex space-x-2 flex-wrap">
              <select 
                value={selectedEngineer}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedEngineer(value);
                }}
                className="px-3 py-1 border rounded text-sm mb-2"
              >
                <option value="all">All Engineers</option>
                <option value="unassigned">Unassigned</option>
                {Array.from(new Set(cycleIssues.map(issue => issue.engineer)))
                  .filter(Boolean)
                  .sort()
                  .map(engineer => (
                    <option key={engineer} value={engineer}>{engineer}</option>
                  ))
                }
              </select>

              <select 
                value={selectedEstimate}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedEstimate(value);
                }}
                className="px-3 py-1 border rounded text-sm mb-2"
              >
                <option value="-1">All Estimates</option>
                {Array.from(new Set(cycleIssues.map(issue => issue.estimate)))
                  .filter(est => est !== null && est !== undefined)
                  .sort((a, b) => {
                    // Handle potential undefined values
                    const valA = a ?? 0;
                    const valB = b ?? 0;
                    return valA - valB;
                  })
                  .map(estimate => (
                    <option key={estimate} value={estimate}>{estimate}</option>
                  ))
                }
              </select>

              <input
                type="text"
                placeholder="Search issues..."
                className="px-3 py-1 border rounded text-sm mb-2"
                value={searchQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchQuery(value);
                }}
              />
            </div>
            
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Issue</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estimate</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Engineer</th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.map((issue: LinearIssue) => (
                  <tr key={issue.id}>
                    <td className="px-4 py-2 text-sm text-primary">
                      <a 
                        href={`https://linear.app/implicit/issue/${issue.identifier || issue.id}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {formatIssueIdentifier(issue)}
                      </a>
                    </td>
                    <td className="px-4 py-2 text-sm">{issue.title}</td>
                    <td className="px-4 py-2 text-sm">{issue.estimate ?? '-'}</td>
                    <td className="px-4 py-2 text-sm">{issue.state?.name ?? '-'}</td>
                    <td className="px-4 py-2 text-sm">{issue.engineer ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 