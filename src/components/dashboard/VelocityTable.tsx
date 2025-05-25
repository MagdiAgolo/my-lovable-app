import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { linearService } from '@/services/linearService';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock, BarChart3, AlertTriangle, BarChart, ClipboardList, Users, TrendingUp, History, LineChart, Calendar, PlusCircle } from 'lucide-react';
import { LinearIssue } from '@/types/linear';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart as RechartsLineChart, Line, ReferenceLine } from 'recharts';
import { VelocityPerEngineer } from './VelocityPerEngineer';
import { toast } from 'sonner';

interface VelocityTableProps {
  teamId: string;
  onRefresh: () => void;
  selectedCycleId: string | null;
  setSelectedCycleId: (id: string) => void;
}

export default function VelocityTable({ teamId, onRefresh, selectedCycleId, setSelectedCycleId }: VelocityTableProps) {
  const [showIssues, setShowIssues] = useState(false);
  const [activeTab, setActiveTab] = useState<'velocity' | 'issues' | 'history'>('velocity');
  const [activeHistorySubTab, setActiveHistorySubTab] = useState<'chart' | 'trends' | 'comparison' | 'scopeCreep'>('chart');
  const [activeVelocitySubTab, setActiveVelocitySubTab] = useState<'total' | 'perEngineer'>('total');
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const [filteredIssues, setFilteredIssues] = useState<LinearIssue[]>([]);
  // Add state for selected filters
  const [selectedEngineer, setSelectedEngineer] = useState<string>('all');
  const [selectedEstimate, setSelectedEstimate] = useState<string>('-1');
  const [searchQuery, setSearchQuery] = useState<string>('');

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
    
    // Filter out cycles that start before Feb 2025
    if (cycleStartTime < FEB_2025_CUTOFF) return false;
    
    // Filter out cycles that haven't ended yet (end date is in the future)
    if (cycle.endsAt) {
      const cycleEndTime = new Date(cycle.endsAt).getTime();
      if (cycleEndTime > TODAY) return false;
    }
    
    return true;
  });

  // Automatically select the first cycle when teamId or cycles change
  useEffect(() => {
    if (cycles && cycles.length > 0 && !selectedCycleId) {
      setSelectedCycleId(cycles[0].id);
    } else if (cycles && cycles.length > 0 && selectedCycleId) {
      // Check if selected cycle is still valid after filtering
      const cycleExists = cycles.some(c => c.id === selectedCycleId);
      if (!cycleExists) {
        setSelectedCycleId(cycles[0].id);
      }
    }
  }, [teamId, cycles, selectedCycleId]);
  
  // Add scope creep useEffect here - MOVED UP to avoid conditional execution
  useEffect(() => {
    if (cycles && issues) {
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
      
      setScopeCreepHistory(scopeCreepData);
    }
  }, [cycles, issues, lastRefresh]);

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
    
    // Only include issues from completed cycles that started after Feb 2025
    return cycleStartTime >= FEB_2025_CUTOFF && 
           cycleEndTime <= TODAY && 
           issue.cycle?.id === selectedCycleId;
  }) || [];

  // Initialize filteredIssues whenever cycleIssues changes
  useEffect(() => {
    // Only reset filters when the cycle actually changes
    if (selectedCycleId !== previousCycleId) {
      setSelectedEngineer('all');
      setSelectedEstimate('-1');
      setSearchQuery('');
      setPreviousCycleId(selectedCycleId);
    }
    
    // Log the total number of non-canceled issues in this cycle
    console.log(`Total non-canceled issues in cycle: ${cycleIssues.length}`);
    
    setFilteredIssues(cycleIssues);
  }, [cycleIssues, selectedCycleId, previousCycleId]);

  // Apply filters when they change
  useEffect(() => {
    let filtered = [...cycleIssues];
    
    // Apply engineer filter with robust case-insensitive and whitespace-tolerant matching
    if (selectedEngineer !== 'all') {
      // Normalize the selected engineer name for comparison
      const normalizedSelectedEngineer = selectedEngineer.toLowerCase().trim();
      
      console.log(`Filtering for engineer "${selectedEngineer}" (normalized: "${normalizedSelectedEngineer}")`);
      
      // Log all unique engineer names for debugging
      const uniqueEngineers = new Set<string>();
      cycleIssues.forEach(issue => {
        const engineer = issue.engineer || "Unassigned";
        uniqueEngineers.add(engineer);
      });
      console.log('Available engineers in current cycle:', Array.from(uniqueEngineers));
      
      // Filter with robust matching
      filtered = filtered.filter(issue => {
        // Handle "Unassigned" as a special case
        if (normalizedSelectedEngineer === "unassigned") {
          return !issue.engineer;
        }
        
        // Handle null or undefined engineer
        if (!issue.engineer) return false;
        
        // Normalize the issue's engineer name
        const normalizedIssueEngineer = issue.engineer.toLowerCase().trim();
        
        // Case-insensitive, whitespace-tolerant matching
        const isMatch = normalizedIssueEngineer === normalizedSelectedEngineer;
        
        // Debug output for problematic cases
        if (issue.engineer.includes("Fatma") || normalizedIssueEngineer.includes("fatma")) {
          console.log(`Fatma issue: "${issue.title}", engineer: "${issue.engineer}", normalized: "${normalizedIssueEngineer}", selected: "${selectedEngineer}", match: ${isMatch}`);
        }
        
        return isMatch;
      });
      
      // Debug log to see how many issues match the engineer filter
      console.log(`Filtered for engineer "${selectedEngineer}": ${filtered.length} issues match out of ${cycleIssues.length} total issues`);
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
    
    setFilteredIssues(filtered);
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
    
    // Sort cycles chronologically (oldest to newest) - already filtered for completed cycles after Feb 2025
    const sortedCycles = [...cycles].sort((a, b) => a.number - b.number);
    
    // Format data for the bar chart
    const data = sortedCycles.map(cycle => ({
      name: cycle.name,
      velocity: cycle.points || 0, // Ensure points is not undefined
      cycleId: cycle.id,
      startDate: cycle.startsAt || '',
      endDate: cycle.endsAt || ''
    }));
    
    console.log(`Chart data prepared: ${data.length} completed cycles after Feb 2025`);
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
        <Button onClick={handleRefresh} className="bg-yellow-600 hover:bg-yellow-700">
          <RefreshCw className="w-4 h-4 mr-2" />
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
        <Button onClick={handleRefresh} className="bg-red-600 hover:bg-red-700">
          <RefreshCw className="w-4 h-4 mr-2" />
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
        <p className="mb-4">There are no completed sprints that started on or after February 2025.</p>
        <Button onClick={handleRefresh} className="bg-yellow-600 hover:bg-yellow-700">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <div className="p-4 bg-white rounded-lg shadow w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
          <h2 className="text-xl font-bold mb-4 sm:mb-0">Completed Cycle Performance (Post Feb 2025)</h2>
          <div className="flex items-center space-x-3">
        <select
          value={selectedCycleId || ""}
          onChange={(e) => setSelectedCycleId(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          {cycles.map((cycle) => (
            <option key={cycle.id} value={cycle.id}>
                  {cycle.name} ({cycle.points} points) - Ended {new Date(cycle.endsAt || '').toLocaleDateString()}
            </option>
          ))}
        </select>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-4">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('velocity')}
              className={`py-2 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                activeTab === 'velocity'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              aria-current={activeTab === 'velocity' ? 'page' : undefined}
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              <span>Velocity</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              aria-current={activeTab === 'history' ? 'page' : undefined}
            >
              <History className="mr-2 h-4 w-4" />
              <span>History</span>
            </button>
            <button
              onClick={() => setActiveTab('issues')}
              className={`py-2 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                activeTab === 'issues'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              aria-current={activeTab === 'issues' ? 'page' : undefined}
            >
              <ClipboardList className="mr-2 h-4 w-4" />
              <span>Issues</span>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mb-6">
          {activeTab === 'velocity' && (
            <div className="space-y-6">
              {/* Velocity Sub-tabs */}
              <div className="flex space-x-2 bg-gray-50 p-1 rounded-md mb-4">
                <button
                  onClick={() => setActiveVelocitySubTab('total')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    activeVelocitySubTab === 'total'
                      ? 'bg-white shadow text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <BarChart className="inline-block w-4 h-4 mr-1" />
                  Total Velocity
                </button>
                <button
                  onClick={() => setActiveVelocitySubTab('perEngineer')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    activeVelocitySubTab === 'perEngineer'
                      ? 'bg-white shadow text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Users className="inline-block w-4 h-4 mr-1" />
                  Per Engineer
                </button>
      </div>

              {/* Velocity Sub-tab Content */}
              {activeVelocitySubTab === 'total' && (
                <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                  {/* Total Velocity Card */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
        <h3 className="text-lg font-semibold mb-2">Total Velocity</h3>
                    <p className="text-3xl font-bold text-blue-700">{totalVelocity} points</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Total points for {selectedCycle?.name || 'selected cycle'}
                    </p>
                  </div>
                </div>
              )}

              {activeVelocitySubTab === 'perEngineer' && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Velocity Per Engineer</h3>
                  {!isLoadingIssues && issues && (
                    <VelocityPerEngineer 
                      issues={cycleIssues}
                      loading={isLoadingIssues}
                      onRefresh={handleRefresh}
                      error={issuesError || null}
                      selectedTeamId={teamId}
                      selectedCycleId={selectedCycleId}
                    />
                  )}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <History className="w-5 h-5 text-blue-500" />
                  <h2 className="text-xl font-bold">Sprint History</h2>
                </div>
                
                {/* History Sub-tabs */}
                <div className="flex space-x-2 bg-gray-50 p-1 rounded-md">
                  <button
                    onClick={() => setActiveHistorySubTab('chart')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      activeHistorySubTab === 'chart'
                        ? 'bg-white shadow text-blue-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <BarChart3 className="inline-block w-4 h-4 mr-1" />
                    Velocity Chart
                  </button>
                  <button
                    onClick={() => setActiveHistorySubTab('trends')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      activeHistorySubTab === 'trends'
                        ? 'bg-white shadow text-blue-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <TrendingUp className="inline-block w-4 h-4 mr-1" />
                    Velocity Trends
                  </button>
                  <button
                    onClick={() => setActiveHistorySubTab('scopeCreep')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      activeHistorySubTab === 'scopeCreep'
                        ? 'bg-white shadow text-blue-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <PlusCircle className="inline-block w-4 h-4 mr-1" />
                    Scope Creep
                  </button>
                  <button
                    onClick={() => setActiveHistorySubTab('comparison')}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      activeHistorySubTab === 'comparison'
                        ? 'bg-white shadow text-blue-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Calendar className="inline-block w-4 h-4 mr-1" />
                    Sprint Comparison
                  </button>
                </div>
              </div>
              
              {/* Velocity Chart Sub-tab */}
              {activeHistorySubTab === 'chart' && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold mb-3">Completed Sprint Velocity History (Post Feb 2025)</h3>
                  
                  {chartData.length === 0 ? (
                    <div className="h-80 w-full flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-gray-500 mb-2">No completed sprint velocity data available after February 2025</p>
                      <Button onClick={handleRefresh} variant="outline" size="sm">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh Data
                      </Button>
                    </div>
                  ) : (
                    <>
                      {/* Sprint Velocity Table */}
                      <div className="overflow-hidden rounded-lg border border-gray-200 mb-6">
                        <table className="w-full border-collapse">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sprint</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Velocity (points)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {[...chartData]
                              .sort((a, b) => {
                                // Sort by start date if available
                                const cycleA = cycles?.find(c => c.id === a.cycleId);
                                const cycleB = cycles?.find(c => c.id === b.cycleId);
                                
                                if (cycleA?.startsAt && cycleB?.startsAt) {
                                  return new Date(cycleA.startsAt).getTime() - new Date(cycleB.startsAt).getTime();
                                }
                                
                                // Fallback to sprint name
                                return a.name.localeCompare(b.name);
                              })
                              .map((cycle) => {
                                const selectedCycleObj = cycles?.find(c => c.id === cycle.cycleId);
                                return (
                                  <tr 
                                    key={cycle.cycleId} 
                                    className={`hover:bg-gray-50 cursor-pointer ${cycle.cycleId === selectedCycleId ? 'bg-blue-50' : ''}`}
                                    onClick={() => setSelectedCycleId(cycle.cycleId)}
                                  >
                                    <td className="px-4 py-3 font-medium">{cycle.name}</td>
                                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                                      {selectedCycleObj?.startsAt ? new Date(selectedCycleObj.startsAt).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm text-gray-600">
                                      {selectedCycleObj?.endsAt ? new Date(selectedCycleObj.endsAt).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold">{cycle.velocity}</td>
                                  </tr>
                                );
                            })}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Sprint Velocity Chart - Standalone Implementation */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-600 mb-4">Velocity Trend Chart (Completed Sprints Only)</h4>
                      </div>
                      
                      {/* Fixed size container with border for visibility */}
                      <div className="border border-gray-200 rounded-lg p-4 mb-4" style={{ height: '400px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart
                            data={[...chartData].sort((a, b) => {
                              // Sort by start date if available
                              const cycleA = cycles?.find(c => c.id === a.cycleId);
                              const cycleB = cycles?.find(c => c.id === b.cycleId);
                              
                              if (cycleA?.startsAt && cycleB?.startsAt) {
                                return new Date(cycleA.startsAt).getTime() - new Date(cycleB.startsAt).getTime();
                              }
                              
                              // Fallback to sprint name
                              return a.name.localeCompare(b.name);
                            })}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="name" 
                              height={60}
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) => {
                                // Extract sprint number using regex
                                const matches = value.match(/\d+/);
                                if (matches && matches.length > 0) {
                                  return `Sprint ${matches[0]}`;
                                }
                                // Fallback to short name for unusual formats
                                return value.split(' ').slice(0, 1).join(' ');
                              }}
                              label={{ value: 'Sprint Number', position: 'bottom', offset: 20 }}
                            />
                            <YAxis label={{ value: 'Velocity (points)', angle: -90, position: 'insideLeft', offset: 10 }} />
                            <Tooltip 
                              formatter={(value) => [`${value} points`, 'Velocity']}
                              labelFormatter={(value) => {
                                // Show full name in tooltip
                                return `Sprint: ${value}`;
                              }}
                            />
                            <Legend verticalAlign="top" height={36} />
                            <Bar 
                              dataKey="velocity" 
                              name="Sprint Velocity"
                              fill="#3b82f6"
                            />
                          </RechartsBarChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="text-center mt-4">
                        <p className="text-sm text-gray-600">
                          {`Total completed sprints after Feb 2025: ${chartData.length}`}
                          {` | Average velocity: ${(chartData.reduce((sum, item) => sum + item.velocity, 0) / chartData.length).toFixed(1)} points`}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
              
              {/* Velocity Trends Sub-tab */}
              {activeHistorySubTab === 'trends' && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold mb-3">Velocity Trends</h3>
                  
                  {chartData.length === 0 ? (
                    <div className="h-40 w-full flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-gray-500 mb-2">No trend data available</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <table className="w-full border-collapse">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sprint</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Velocity</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {chartData.slice(0, 10).map((cycle, index) => {
                            const previous = index < chartData.length - 1 ? chartData[index + 1].velocity : cycle.velocity;
                            const change = cycle.velocity - previous;
                            // Extract sprint number
                            const matches = cycle.name.match(/\d+/);
                            const sprintNumber = matches && matches.length > 0 ? matches[0] : '';
                            
                            return (
                              <tr 
                                key={cycle.cycleId} 
                                className={`hover:bg-gray-50 cursor-pointer ${cycle.cycleId === selectedCycleId ? 'bg-blue-50' : ''}`}
                                onClick={() => setSelectedCycleId(cycle.cycleId)}
                              >
                                <td className="px-4 py-3">
                                  <span className="font-medium">Sprint {sprintNumber}</span>
                                  <span className="text-xs text-gray-500 ml-2">({cycle.name})</span>
                                </td>
                                <td className="px-4 py-3 text-right">{cycle.velocity}</td>
                                <td className={`px-4 py-3 text-right ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                  {change !== 0 ? (change > 0 ? '+' : '') + change : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              
              {/* Scope Creep Indicator Tab */}
              {activeHistorySubTab === 'scopeCreep' && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold mb-3">Sprint Scope Creep Analysis</h3>
                  
                  {chartData.length === 0 ? (
                    <div className="h-40 w-full flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-gray-500 mb-2">No scope creep data available</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Current Cycle Scope Creep */}
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="text-md font-semibold mb-3">
                          Current Sprint: {selectedCycle?.name || 'N/A'}
                        </h4>
                        
                        {selectedCycleId && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                            <div className="p-3 bg-white rounded-lg border border-gray-100">
                              <p className="text-sm text-gray-500 mb-1">Original Scope</p>
                              <p className="text-xl font-semibold">{selectedCycle?.points || 0} points</p>
                            </div>
                            
                            <div className="p-3 bg-white rounded-lg border border-gray-100">
                              <p className="text-sm text-gray-500 mb-1">Added Issues</p>
                              <p className="text-xl font-semibold">
                                {scopeCreepHistory.find(item => item.cycleId === selectedCycleId)?.addedIssues || 0} issues
                              </p>
                            </div>
                            
                            <div className="p-3 bg-white rounded-lg border border-gray-100">
                              <p className="text-sm text-gray-500 mb-1">Scope Change</p>
                              <p className={`text-xl font-semibold ${
                                (scopeCreepHistory.find(item => item.cycleId === selectedCycleId)?.percentage || 0) > 20 
                                  ? 'text-red-600' 
                                  : (scopeCreepHistory.find(item => item.cycleId === selectedCycleId)?.percentage || 0) > 10
                                    ? 'text-yellow-600' 
                                    : 'text-green-600'
                              }`}>
                                +{(scopeCreepHistory.find(item => item.cycleId === selectedCycleId)?.percentage || 0).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        )}
                        
                        <div className="relative pt-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs font-semibold inline-block text-gray-600">
                                Scope Creep
                              </span>
                            </div>
                            <div>
                              <span className="text-xs font-semibold inline-block text-gray-600">
                                {(scopeCreepHistory.find(item => item.cycleId === selectedCycleId)?.percentage || 0).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="overflow-hidden h-2 mt-1 text-xs flex rounded bg-gray-200">
                            <div 
                              style={{ width: `${Math.min(100, scopeCreepHistory.find(item => item.cycleId === selectedCycleId)?.percentage || 0)}%` }}
                              className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                                (scopeCreepHistory.find(item => item.cycleId === selectedCycleId)?.percentage || 0) > 20 
                                  ? 'bg-red-600' 
                                  : (scopeCreepHistory.find(item => item.cycleId === selectedCycleId)?.percentage || 0) > 10
                                    ? 'bg-yellow-600' 
                                    : 'bg-green-600'
                              }`}
                            ></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Scope Creep Trend Chart */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-600 mb-4">Scope Creep Trend Across Sprints</h4>
                      </div>
                      
                      <div className="border border-gray-200 rounded-lg p-4 mb-4" style={{ height: '350px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsLineChart
                            data={scopeCreepHistory
                              .filter(item => item.cycleId) // Ensure valid data
                              .map(item => ({
                                name: item.cycleName,
                                scopeCreep: item.percentage
                              }))}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="name" 
                              height={60}
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) => {
                                const matches = value.match(/\d+/);
                                if (matches && matches.length > 0) {
                                  return `Sprint ${matches[0]}`;
                                }
                                return value.split(' ').slice(0, 1).join(' ');
                              }}
                              label={{ value: 'Sprint Number', position: 'bottom', offset: 20 }}
                            />
                            <YAxis 
                              label={{ value: 'Scope Creep (%)', angle: -90, position: 'insideLeft' }}
                              domain={[0, 30]}
                            />
                            <Tooltip 
                              formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Scope Creep']}
                              labelFormatter={(value) => `Sprint: ${value}`}
                            />
                            <ReferenceLine y={10} stroke="#10b981" strokeDasharray="3 3" label="Good" />
                            <ReferenceLine y={20} stroke="#f59e0b" strokeDasharray="3 3" label="Warning" />
                            <Line 
                              type="monotone" 
                              dataKey="scopeCreep" 
                              name="Scope Creep"
                              stroke="#3b82f6" 
                              activeDot={{ r: 8 }}
                              strokeWidth={2}
                            />
                          </RechartsLineChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Scope Change Details Table */}
                      <div className="overflow-hidden rounded-lg border border-gray-200">
                        <table className="w-full border-collapse">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sprint</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Original Scope</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Added Issues</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Scope Change</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {scopeCreepHistory.length > 0 && scopeCreepHistory
                              .sort((a, b) => {
                                const cycleA = cycles?.find(c => c.id === a.cycleId);
                                const cycleB = cycles?.find(c => c.id === b.cycleId);
                                if (cycleA?.number && cycleB?.number) {
                                  return cycleB.number - cycleA.number; // Newer first
                                }
                                return 0;
                              })
                              .slice(0, 5)
                              .map((item) => {
                                const matches = item.cycleName.match(/\d+/);
                                const sprintNumber = matches && matches.length > 0 ? matches[0] : '';
                                
                                return (
                                  <tr 
                                    key={item.cycleId} 
                                    className={`hover:bg-gray-50 cursor-pointer ${item.cycleId === selectedCycleId ? 'bg-blue-50' : ''}`}
                                    onClick={() => setSelectedCycleId(item.cycleId)}
                                  >
                                    <td className="px-4 py-3">
                                      <span className="font-medium">Sprint {sprintNumber}</span>
                                      <span className="text-xs text-gray-500 ml-2">({item.cycleName})</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">{item.originalPoints} points</td>
                                    <td className="px-4 py-3 text-right">{item.addedIssues}</td>
                                    <td className={`px-4 py-3 text-right ${
                                      item.percentage > 20 ? 'text-red-600' : 
                                      item.percentage > 10 ? 'text-yellow-600' : 'text-green-600'
                                    }`}>
                                      +{item.percentage.toFixed(1)}%
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Sprint Comparison Sub-tab */}
              {activeHistorySubTab === 'comparison' && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold mb-3">Sprint Comparison</h3>
                  
                  {chartData.length < 2 ? (
                    <div className="h-40 w-full flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-gray-100">
                      <p className="text-gray-500 mb-2">Need at least 2 sprints for comparison</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-500 mb-1">Average Velocity</p>
                          <p className="text-xl font-semibold">
                            {(chartData.reduce((sum, cycle) => sum + cycle.velocity, 0) / chartData.length).toFixed(1)}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-500 mb-1">High</p>
                          <p className="text-xl font-semibold text-green-600">
                            {Math.max(...chartData.map(cycle => cycle.velocity))}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-500 mb-1">Low</p>
                          <p className="text-xl font-semibold text-red-600">
                            {Math.min(...chartData.map(cycle => cycle.velocity))}
                          </p>
                        </div>
                      </div>
                      
                      <div className="overflow-hidden rounded-lg border border-gray-200">
                        <table className="w-full border-collapse">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sprint</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Velocity</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Vs. Avg</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {chartData.slice(0, 5).map((cycle) => {
                              const average = chartData.reduce((sum, c) => sum + c.velocity, 0) / chartData.length;
                              const diff = cycle.velocity - average;
                              // Extract sprint number
                              const matches = cycle.name.match(/\d+/);
                              const sprintNumber = matches && matches.length > 0 ? matches[0] : '';
                              
                              return (
                                <tr 
                                  key={cycle.cycleId} 
                                  className={`hover:bg-gray-50 cursor-pointer ${cycle.cycleId === selectedCycleId ? 'bg-blue-50' : ''}`}
                                  onClick={() => setSelectedCycleId(cycle.cycleId)}
                                >
                                  <td className="px-4 py-3">
                                    <span className="font-medium">Sprint {sprintNumber}</span>
                                    <span className="text-xs text-gray-500 ml-2">({cycle.name})</span>
                                  </td>
                                  <td className="px-4 py-3 text-center">{cycle.velocity}</td>
                                  <td className={`px-4 py-3 text-center ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                    {diff !== 0 ? (diff > 0 ? '+' : '') + diff.toFixed(1) : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'issues' && (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <div className="flex space-x-2">
                  <select 
                    value={selectedEngineer}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedEngineer(value);
                    }}
                    className="px-3 py-1 border rounded text-sm"
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

                  <input
                    type="text"
                    placeholder="Search issues..."
                    className="px-3 py-1 border rounded text-sm"
                    value={searchQuery}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSearchQuery(value);
                    }}
                  />
                </div>
                <Button
                  onClick={() => setShowIssues(true)}
                  variant="outline"
                  size="sm"
                >
                  View All Issues
                </Button>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estimate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Engineer</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredIssues.slice(0, 5).map((issue: LinearIssue) => (
                    <tr key={issue.id}>
                      <td className="px-4 py-2 text-sm text-blue-600">
                        <a 
                          href={`https://linear.app/implicit/issue/${issue.identifier || issue.id}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {formatIssueIdentifier(issue)}
                        </a>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">{issue.title}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{issue.estimate ?? '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{issue.state?.name ?? '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{issue.engineer ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredIssues.length > 5 && (
                <div className="mt-2 text-center">
                  <button 
                    onClick={() => setShowIssues(true)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    View all {filteredIssues.length} issues...
                  </button>
                </div>
              )}
            </div>
          )}
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
                    <td className="px-4 py-2 text-sm text-blue-600">
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