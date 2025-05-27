import React, { useState } from 'react';
import { LinearCycle, LinearIssue, LinearTeam } from '@/types/linear';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, ReferenceLine } from 'recharts';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock, BarChart3, AlertTriangle, TrendingUp, PlusCircle, Calendar } from 'lucide-react';
import '../../styles/chartTheme.scss';
import SprintDetailView from './SprintDetailView';

interface SprintHistoryContentProps {
  activeSubTab: 'chart' | 'trends' | 'scopeCreep' | 'comparison';
  cycles: LinearCycle[] | undefined;
  cycleIssues: LinearIssue[];
  selectedCycleId: string | null;
  setSelectedCycleId: (id: string) => void;
  selectedTeamId: string;
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
  setSelectedTeamId: (id: string) => void;
}

export const SprintHistoryContent: React.FC<SprintHistoryContentProps> = ({
  activeSubTab,
  cycles,
  cycleIssues,
  selectedCycleId,
  setSelectedCycleId,
  selectedTeamId,
  handleRefresh,
  isLoading,
  error,
  scopeCreepHistory,
  teams,
  setSelectedTeamId
}) => {
  const [viewingSprintId, setViewingSprintId] = useState<string | null>(null);
  const selectedCycle = cycles?.find(cycle => cycle.id === selectedCycleId);
  
  // Function to show sprint details when clicked
  const showSprintDetails = (cycleId: string) => {
    setViewingSprintId(cycleId);
  };
  
  // Function to go back to list view
  const handleBackToList = () => {
    setViewingSprintId(null);
  };

  // Get the current viewing cycle and its issues
  const viewingCycle = cycles?.find(cycle => cycle.id === viewingSprintId);
  
  // Helper function to check if an issue is "done"
  const isDoneIssue = (issue: LinearIssue): boolean => {
    // Check type first (most reliable)
    if (issue.state?.type === 'completed') {
      return true;
    }
    
    // Check state name contains done/complete/merged/shipped keywords
    const stateName = issue.state?.name?.toLowerCase() || '';
    return stateName.includes('done') || 
           stateName.includes('complete') || 
           stateName.includes('merged') || 
           stateName.includes('shipped') ||
           stateName.includes('delivered');
  };
  
  // Helper function to check if an issue should be excluded (canceled, duplicate, etc.)
  const isExcludedIssue = (issue: LinearIssue): boolean => {
    const stateName = issue.state?.name?.toLowerCase() || '';
    const issueTitle = issue.title?.toLowerCase() || '';
    
    return stateName.includes('cancel') || 
           stateName.includes('duplicate') || 
           issueTitle.includes('cancel') || 
           issueTitle.includes('duplicate');
  };
  
  // Enhanced issue filtering that works consistently across all sprints
  const getIssuesForCycle = (cycleId: string) => {
    // Get the cycle we're looking for
    const targetCycle = cycles?.find(c => c.id === cycleId);
    if (!targetCycle) {
      console.log(`No cycle found with ID: ${cycleId}`);
      return [];
    }
    
    console.log(`Finding issues for cycle: ${targetCycle.name} (ID: ${cycleId})`);
    console.log(`Cycle dates: ${targetCycle.startsAt} to ${targetCycle.endsAt}`);
    console.log(`Cycle number: ${targetCycle.number}`);
    console.log(`Cycle points from API: ${targetCycle.points}`);
    
    // Collect all potential matches using multiple strategies
    const allMatches = new Map<string, LinearIssue>();
    
    // 1. Direct ID matching (most reliable)
    cycleIssues.filter(issue => issue.cycle?.id === cycleId && !isExcludedIssue(issue))
      .forEach(issue => {
        if (!allMatches.has(issue.id)) {
          allMatches.set(issue.id, issue);
          console.log(`Direct ID match: ${issue.identifier} - ${issue.title}`);
        }
      });

    // 2. Match by cycle number (more reliable than name)
    if (targetCycle.number) {
      cycleIssues.filter(issue => {
        // Skip issues already matched or excluded
        if (allMatches.has(issue.id) || isExcludedIssue(issue)) return false;
        
        return issue.cycle?.number === targetCycle.number;
      })
      .forEach(issue => {
        allMatches.set(issue.id, issue);
        console.log(`Number match: ${issue.identifier} - ${issue.title}`);
      });
    }
    
    // 3. Match by sprint name/number extracted from name
    if (targetCycle.name) {
      const targetSprintNumberMatch = targetCycle.name.match(/sprint\s*(\d+)/i);
      const targetSprintNumber = targetSprintNumberMatch ? targetSprintNumberMatch[1] : null;
      
      if (targetSprintNumber) {
        cycleIssues.filter(issue => {
          // Skip issues already matched or excluded
          if (allMatches.has(issue.id) || isExcludedIssue(issue)) return false;
          
          if (!issue.cycle?.name) return false;
          
          const issueSprintNumberMatch = issue.cycle.name.match(/sprint\s*(\d+)/i);
          const issueSprintNumber = issueSprintNumberMatch ? issueSprintNumberMatch[1] : null;
          
          return issueSprintNumber === targetSprintNumber;
        })
        .forEach(issue => {
          allMatches.set(issue.id, issue);
          console.log(`Sprint number match: ${issue.identifier} - ${issue.title}`);
        });
      }
    }
    
    // 4. Date-based matching with more flexible date range
    if (targetCycle.startsAt && targetCycle.endsAt) {
      const cycleStartDate = new Date(targetCycle.startsAt).getTime();
      const cycleEndDate = new Date(targetCycle.endsAt).getTime();
      
      // Add a buffer around dates (2 days) to catch edge cases
      const bufferMs = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds
      const extendedStartDate = cycleStartDate - bufferMs;
      const extendedEndDate = cycleEndDate + bufferMs;
      
      cycleIssues.filter(issue => {
        // Skip issues already matched or excluded
        if (allMatches.has(issue.id) || isExcludedIssue(issue)) return false;
        
        // Check if the issue has a completedAt date
        if (issue.completedAt) {
          const completedDate = new Date(issue.completedAt).getTime();
          // Check if the issue was completed within the sprint timeframe (with buffer)
          return completedDate >= extendedStartDate && completedDate <= extendedEndDate;
        }
        
        // If no completedAt, check if the issue was created during the sprint and is completed
        if (issue.createdAt && isDoneIssue(issue)) {
          const createdDate = new Date(issue.createdAt).getTime();
          return createdDate >= extendedStartDate && createdDate <= extendedEndDate;
        }
        
        return false;
      })
      .forEach(issue => {
        allMatches.set(issue.id, issue);
        console.log(`Date-based match: ${issue.identifier} - ${issue.title}`);
      });
    }
    
    // 5. Title or identifier contains sprint number
    if (targetCycle.name) {
      // Extract sprint number if available
      const sprintNumberMatch = targetCycle.name.match(/sprint\s*(\d+)/i);
      if (sprintNumberMatch) {
        const sprintNumber = sprintNumberMatch[1];
        
        cycleIssues.filter(issue => {
          // Skip issues already matched or excluded
          if (allMatches.has(issue.id) || isExcludedIssue(issue)) return false;
          
          // Look for sprint number in issue identifier or title
          const identifierMatch = issue.identifier && 
            (issue.identifier.toLowerCase().includes(`sprint-${sprintNumber.toLowerCase()}`) || 
             issue.identifier.toLowerCase().includes(`s${sprintNumber.toLowerCase()}`));
             
          const titleMatch = issue.title && 
            (issue.title.toLowerCase().includes(`sprint ${sprintNumber.toLowerCase()}`) || 
             issue.title.toLowerCase().includes(`s${sprintNumber}`));
             
          return identifierMatch || titleMatch;
        })
        .forEach(issue => {
          allMatches.set(issue.id, issue);
          console.log(`Identifier/title match: ${issue.identifier} - ${issue.title}`);
        });
      }
    }
    
    // 6. Special case for empty results - find completed issues that might belong to this cycle
    if (allMatches.size === 0 && targetCycle.startsAt && targetCycle.endsAt) {
      console.log(`No matches found for ${targetCycle.name}. Using time-based completed issue matching.`);
      
      const cycleStartDate = new Date(targetCycle.startsAt).getTime();
      const cycleEndDate = new Date(targetCycle.endsAt).getTime();
      
      // Find all completed issues that don't have a cycle assigned or have invalid cycle data
      cycleIssues.filter(issue => 
        (!issue.cycle || !issue.cycle.id || issue.cycle.id === 'undefined' || issue.cycle.id === 'null') &&
        !isExcludedIssue(issue)
      )
      .filter(issue => {
        // Only consider completed issues
        if (!isDoneIssue(issue)) {
          return false;
        }
        
        // Check if completed during this cycle
        if (issue.completedAt) {
          const completedDate = new Date(issue.completedAt).getTime();
          return completedDate >= cycleStartDate && completedDate <= cycleEndDate;
        }
        
        return false;
      })
      .forEach(issue => {
        allMatches.set(issue.id, issue);
        console.log(`Orphaned completed issue match: ${issue.identifier} - ${issue.title}`);
      });
    }
    
    // Fall back to all completed issues in date range if still no matches
    if (allMatches.size === 0 && targetCycle.startsAt && targetCycle.endsAt) {
      console.log(`Still no matches for ${targetCycle.name}. Using date range for all completed issues.`);
      
      const cycleStartDate = new Date(targetCycle.startsAt).getTime();
      const cycleEndDate = new Date(targetCycle.endsAt).getTime();
      
      // Find all completed issues in the date range, regardless of cycle
      cycleIssues.filter(issue => {
        // Exclude canceled/duplicate issues
        if (isExcludedIssue(issue)) return false;
        
        // Only consider completed issues
        if (!isDoneIssue(issue)) {
          return false;
        }
        
        // Check if completed during this cycle
        if (issue.completedAt) {
          const completedDate = new Date(issue.completedAt).getTime();
          return completedDate >= cycleStartDate && completedDate <= cycleEndDate;
        }
        
        return false;
      })
      .forEach(issue => {
        allMatches.set(issue.id, issue);
        console.log(`Last resort time-based match: ${issue.identifier} - ${issue.title}`);
      });
    }
    
    // Log summary of results
    const matchedIssues = Array.from(allMatches.values());
    console.log(`Total issues found for ${targetCycle.name}: ${matchedIssues.length}`);
    
    if (matchedIssues.length === 0) {
      console.log(`WARNING: No matching issues found for cycle: ${targetCycle.name}`);
      
      // Additional diagnostics for troubleshooting
      console.log(`All available issue cycle IDs:`);
      const uniqueCycleIds = new Set(
        cycleIssues
          .filter(issue => issue.cycle?.id)
          .map(issue => `${issue.cycle?.id} (${issue.cycle?.name})`)
      );
      console.log(Array.from(uniqueCycleIds).join(', '));
    }
    
    // Log completed issues for debugging
    const completedIssues = matchedIssues.filter(issue => isDoneIssue(issue));
    const completedCount = completedIssues.length;
    
    // Calculate the total points from completed issues
    const completedPoints = completedIssues
      .reduce((sum, issue) => sum + (issue.estimate || 0), 0);
    
    console.log(`Completed issues for ${targetCycle.name}: ${completedCount}, Total points: ${completedPoints}`);
    console.log(`Cycle points from API for ${targetCycle.name}: ${targetCycle.points}`);
    
    // If we have no issues but the cycle has points data from the API, return stub data
    if (matchedIssues.length === 0 && targetCycle.points > 0) {
      console.log(`Creating stub issues for ${targetCycle.name} based on API velocity data`);
      
      // Create a stub issue to ensure velocity data is represented
      const stubIssue: LinearIssue = {
        id: `stub-${targetCycle.id}`,
        title: `[Stub] ${targetCycle.name} aggregate data`,
        status: 'completed',
        state: { id: 'completed', name: 'Completed', type: 'completed' },
        estimate: targetCycle.points,
        createdAt: targetCycle.startsAt,
        completedAt: targetCycle.endsAt,
        team: { id: selectedTeamId, name: 'Selected Team' },
        cycle: targetCycle,
      };
      
      return [stubIssue];
    }
    
    return matchedIssues;
  };
  
  // Get issues for the current viewing cycle
  const viewingCycleIssues = viewingSprintId ? getIssuesForCycle(viewingSprintId) : [];
  // Debug logging for done issues
  if (viewingCycleIssues.length > 0) {
    const doneIssues = viewingCycleIssues.filter(issue => isDoneIssue(issue));
    console.log(`Found ${doneIssues.length} done issues out of ${viewingCycleIssues.length} total issues`);
    console.log(`Done issue states: ${doneIssues.map(i => i.state?.name).join(', ')}`);
  }
  const viewingScopeCreep = viewingSprintId ? 
    scopeCreepHistory.find(item => item.cycleId === viewingSprintId)?.percentage || 0 : 0;
  
  // Add debugging logs to troubleshoot missing data
  if (viewingSprintId) {
    console.log(`Debug - Viewing sprint: ${viewingSprintId}`);
    console.log(`Debug - Found cycle: ${viewingCycle ? 'Yes' : 'No'}`);
    console.log(`Debug - Cycle name: ${viewingCycle?.name || 'N/A'}`);
    console.log(`Debug - Cycle number: ${viewingCycle?.number || 'N/A'}`);
    console.log(`Debug - Total cycleIssues available: ${cycleIssues.length}`);
    console.log(`Debug - Filtered issues for this cycle: ${viewingCycleIssues.length}`);
    
    // Check for potential cycle ID mismatch
    if (viewingCycleIssues.length === 0 && cycleIssues.length > 0) {
      console.log('Debug - Checking cycle IDs in available issues:');
      const uniqueCycleIds = new Set(cycleIssues.filter(issue => issue.cycle).map(issue => issue.cycle?.id));
      console.log(`Debug - Unique cycle IDs in issues: ${Array.from(uniqueCycleIds).join(', ')}`);
      console.log(`Debug - Looking for cycle ID: ${viewingSprintId}`);
      
      // Check for cycle numbers and names in issues
      const uniqueCycleNumbers = new Set(cycleIssues.filter(issue => issue.cycle?.number).map(issue => issue.cycle?.number));
      const uniqueCycleNames = new Set(cycleIssues.filter(issue => issue.cycle?.name).map(issue => issue.cycle?.name));
      
      console.log(`Debug - Unique cycle numbers: ${Array.from(uniqueCycleNumbers).join(', ')}`);
      console.log(`Debug - Unique cycle names: ${Array.from(uniqueCycleNames).join(', ')}`);
      console.log(`Debug - Target cycle number: ${viewingCycle?.number || 'N/A'}`);
      console.log(`Debug - Target cycle name: ${viewingCycle?.name || 'N/A'}`);
    }
  }
  
  // If we're viewing a specific sprint, show its detailed view
  if (viewingCycle) {
    return (
      <SprintDetailView 
        cycle={viewingCycle}
        cycleIssues={viewingCycleIssues}
        onBack={handleBackToList}
        scopeCreepPercentage={viewingScopeCreep}
      />
    );
  }

  // Add debug logging for completed issues
  console.log('SprintDetailView - Completed issues count:', viewingCycleIssues.length);
  
  // Filter issues - handle both regular issues and stub data
  const completedIssues = viewingCycleIssues.length === 0 
    ? cycleIssues // If it's stub data, all issues are considered "completed"
    : cycleIssues.filter(issue => {
        const isDone = isDoneIssue(issue) && !isExcludedIssue(issue);
        if (isDone) {
          console.log(`Including done issue in velocity: ${issue.identifier} - ${issue.title} - State: ${issue.state?.name}`);
        }
        return isDone;
      });

  // Prepare data for the sprint velocity chart - ensure consistency with detail view
  const prepareChartData = () => {
    if (!cycles || cycles.length === 0) {
      console.log('No cycles available for chart data');
      return [];
    }
    
    // Sort cycles chronologically (oldest to newest)
    const sortedCycles = [...cycles].sort((a, b) => a.number - b.number);
    
    // Format data for the bar chart
    const data = sortedCycles.map(cycle => {
      // Pre-calculate issues to ensure consistency with detail view
      const cycleIssuesData = getIssuesForCycle(cycle.id);
      
      // Calculate points from completed issues
      const doneIssues = cycleIssuesData
        .filter(issue => isDoneIssue(issue) && !isExcludedIssue(issue));
      
      console.log(`Sprint ${cycle.name}: Found ${doneIssues.length} done issues for velocity calculation`);
      
      const calculatedPoints = doneIssues
        .reduce((sum, issue) => sum + (issue.estimate || 0), 0);
      
      // Use calculated points if available, otherwise fall back to API points
      const velocityPoints = calculatedPoints > 0 ? calculatedPoints : (cycle.points || 0);
      
      console.log(`Chart data for ${cycle.name}: API points=${cycle.points}, Calculated=${calculatedPoints}, Using=${velocityPoints}`);
      
      return {
        name: cycle.name,
        velocity: velocityPoints,
        cycleId: cycle.id,
        startDate: cycle.startsAt || '',
        endDate: cycle.endsAt || ''
      };
    });
    
    console.log(`Chart data prepared: ${data.length} completed cycles`);
    return data;
  };
  
  const chartData = prepareChartData();

  // Calculate the predicted velocity for the next sprint
  const calculatePredictedVelocity = () => {
    if (chartData.length === 0) return null;
    
    // Sort chart data chronologically to get recent sprints
    const sortedData = [...chartData].sort((a, b) => {
      const cycleA = cycles?.find(c => c.id === a.cycleId);
      const cycleB = cycles?.find(c => c.id === b.cycleId);
      
      if (cycleA?.startsAt && cycleB?.startsAt) {
        return new Date(cycleB.startsAt).getTime() - new Date(cycleA.startsAt).getTime();
      }
      
      return 0;
    });
    
    // Use the last 3 sprints for prediction if available
    const recentSprints = sortedData.slice(0, Math.min(3, sortedData.length));
    
    if (recentSprints.length === 0) return null;
    
    // Calculate weighted average (more recent sprints have higher weight)
    const weights = [0.5, 0.3, 0.2]; // 50% last sprint, 30% second-last, 20% third-last
    let predictedValue = 0;
    let totalWeight = 0;
    
    recentSprints.forEach((sprint, index) => {
      if (index < weights.length) {
        predictedValue += sprint.velocity * weights[index];
        totalWeight += weights[index];
      }
    });
    
    // Adjust weight if we have fewer than 3 sprints
    if (totalWeight > 0) {
      predictedValue = predictedValue / totalWeight;
    } else {
      // Fallback to simple average if weights are not applicable
      predictedValue = recentSprints.reduce((sum, sprint) => sum + sprint.velocity, 0) / recentSprints.length;
    }
    
    // Round to one decimal place
    return Math.round(predictedValue * 10) / 10;
  };

  const predictedVelocity = calculatePredictedVelocity();

  if (isLoading) {
    return <div className="p-6">Loading sprint history data...</div>;
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-center space-x-2 mb-2">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <h2 className="text-xl font-bold text-red-700">Error Loading Data</h2>
        </div>
        <p className="mb-4">{error.message || "An unknown error occurred"}</p>
        <Button onClick={handleRefresh} size="xs" className="implicit-btn black">
          <RefreshCw className="h-2.5 w-2.5 mr-1" />
          Try Again
        </Button>
      </div>
    );
  }

  if (!cycles || cycles.length === 0) {
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

  // Team tabs removed as per request

  const renderContent = () => {
    switch (activeSubTab) {
      case 'chart':
        return (
          <div className="implicit-card">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-primary" />
              Sprint Velocity History
            </h3>
            
            {chartData.length === 0 ? (
              <div className="h-80 w-full flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-gray-500 mb-2">No sprint velocity data available</p>
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
                              className="hover:bg-gray-50 cursor-pointer"
                              onClick={() => showSprintDetails(cycle.cycleId)}
                            >
                              <td className="px-4 py-3 font-medium text-primary hover:underline">{cycle.name}</td>
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
                
                {/* Sprint Velocity Chart */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-4">Historical sprint performance data showing completed story points across all sprints</h4>
                </div>
                
                {/* Fixed size container with border for visibility */}
                <div className="chart-container" style={{ height: '400px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
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
                      onClick={(data) => {
                        if (data && data.activePayload && data.activePayload[0]) {
                          const clickedData = data.activePayload[0].payload;
                          showSprintDetails(clickedData.cycleId);
                        }
                      }}
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
                        fill="var(--chart-primary)" 
                        className="cursor-pointer"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="text-center mt-4">
                  <p className="text-sm text-gray-600">
                    {`Total completed sprints: ${chartData.length}`}
                    {` | Average velocity: ${(chartData.reduce((sum, item) => sum + item.velocity, 0) / chartData.length).toFixed(1)} points`}
                  </p>
                </div>
              </>
            )}
          </div>
        );
      
      case 'trends':
        return (
          <div className="implicit-card">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-primary" />
              Velocity Trends
            </h3>
            
            {chartData.length === 0 ? (
              <div className="h-40 w-full flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-gray-500 mb-2">No trend data available</p>
              </div>
            ) : (
              <>
                {/* Velocity Trends Line Graph */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-4">Visualizes velocity patterns over time with prediction for the next sprint based on historical data</h4>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4 mb-6" style={{ height: '450px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={[
                        ...[...chartData]
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
                          .map(item => ({
                            name: item.name,
                            velocity: item.velocity,
                            cycleId: item.cycleId,
                            isPredicted: false
                          })),
                        // Add predicted data point if available
                        ...(predictedVelocity ? [{
                          name: "Next Sprint (Predicted)",
                          velocity: 0, // Actual value will be shown in the predictedVelocity line
                          predictedVelocity: predictedVelocity,
                          cycleId: "predicted",
                          isPredicted: true
                        }] : [])
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      onClick={(data) => {
                        if (data && data.activePayload && data.activePayload[0]) {
                          const clickedData = data.activePayload[0].payload;
                          // Only navigate to real sprints, not the predicted one
                          if (clickedData.cycleId !== "predicted") {
                            showSprintDetails(clickedData.cycleId);
                          }
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        height={60}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => {
                          // Special formatting for predicted sprint
                          if (value === "Next Sprint (Predicted)") {
                            return "Predicted";
                          }
                          const matches = value.match(/\d+/);
                          if (matches && matches.length > 0) {
                            return `Sprint ${matches[0]}`;
                          }
                          return value.split(' ').slice(0, 1).join(' ');
                        }}
                        label={{ value: 'Sprint Number', position: 'bottom', offset: 20 }}
                      />
                      <YAxis 
                        label={{ value: 'Velocity (points)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        formatter={(value, name, props) => {
                          // Check if this is the predicted data point
                          if (props.payload.isPredicted && name === "velocity") {
                            return ["Not available", "Actual Velocity"];
                          } else if (name === "predictedVelocity") {
                            return [`${value} points`, "Predicted Velocity"];
                          }
                          return [`${Number(value).toFixed(1)} points`, "Velocity"];
                        }}
                        labelFormatter={(value) => {
                          if (value === "Next Sprint (Predicted)") {
                            return "Next Sprint (Predicted)";
                          }
                          return `Sprint: ${value}`;
                        }}
                      />
                      {/* Actual velocity line */}
                      <Line 
                        type="monotone" 
                        dataKey="velocity" 
                        name="Velocity"
                        stroke="var(--chart-primary)" 
                        activeDot={{ 
                          r: 8, 
                          onClick: (data: any) => {
                            if (data && data.payload && data.payload.cycleId && data.payload.cycleId !== "predicted") {
                              showSprintDetails(data.payload.cycleId);
                            }
                          } 
                        }}
                        strokeWidth={2}
                        className="cursor-pointer"
                        connectNulls={false}
                      />
                      {/* Predicted velocity line */}
                      <Line 
                        type="monotone" 
                        dataKey="predictedVelocity" 
                        name="Predicted Velocity"
                        stroke="#f59e0b" // amber color for prediction
                        strokeDasharray="5 5" // dashed line
                        dot={{ 
                          r: 6, 
                          fill: "#f59e0b", 
                          stroke: "#f59e0b" 
                        }}
                        activeDot={{ r: 8, fill: "#f59e0b", stroke: "#f59e0b" }}
                        isAnimationActive={true}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
                  <table className="w-full border-collapse">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sprint</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Velocity</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {/* Add predicted sprint at the top of the table */}
                      {predictedVelocity && (
                        <tr className="bg-amber-50">
                          <td className="px-4 py-3">
                            <span className="font-medium text-amber-600">Next Sprint</span>
                            <span className="text-xs text-amber-500 ml-2">(Predicted)</span>
                          </td>
                          <td className="px-4 py-3 text-right text-amber-600 font-medium">{predictedVelocity}</td>
                          <td className="px-4 py-3 text-right">
                            {chartData.length > 0 && (
                              <span className={`${
                                predictedVelocity > chartData[0].velocity 
                                  ? 'text-green-600' 
                                  : predictedVelocity < chartData[0].velocity 
                                    ? 'text-red-600' 
                                    : 'text-gray-500'
                              }`}>
                                {predictedVelocity !== chartData[0].velocity 
                                  ? (predictedVelocity > chartData[0].velocity ? '+' : '') + 
                                    (predictedVelocity - chartData[0].velocity).toFixed(1)
                                  : '-'}
                              </span>
                            )}
                          </td>
                        </tr>
                      )}
                      
                      {/* Existing sprints */}
                      {chartData.slice(0, 10).map((cycle, index) => {
                        const previous = index < chartData.length - 1 ? chartData[index + 1].velocity : cycle.velocity;
                        const change = cycle.velocity - previous;
                        // Extract sprint number
                        const matches = cycle.name.match(/\d+/);
                        const sprintNumber = matches && matches.length > 0 ? matches[0] : '';
                        
                        return (
                          <tr 
                            key={cycle.cycleId} 
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => showSprintDetails(cycle.cycleId)}
                          >
                            <td className="px-4 py-3">
                              <span className="font-medium text-primary hover:underline">Sprint {sprintNumber}</span>
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
                
                {/* Sprint Comparison (moved from the separate tab) */}
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-primary" />
                    Sprint Comparison
                  </h3>
                  
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
                                  className="hover:bg-gray-50 cursor-pointer"
                                  onClick={() => showSprintDetails(cycle.cycleId)}
                                >
                                  <td className="px-4 py-3">
                                    <span className="font-medium text-primary hover:underline">Sprint {sprintNumber}</span>
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
              </>
            )}
          </div>
        );
      
      case 'scopeCreep':
        return (
          <div className="implicit-card">
            <h3 className="text-lg font-semibold mb-3 flex items-center">
              <PlusCircle className="w-5 h-5 mr-2 text-primary" />
              Sprint Scope Creep Analysis
            </h3>
            
            {chartData.length === 0 ? (
              <div className="h-40 w-full flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-gray-500 mb-2">No scope creep data available</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Current Cycle Scope Creep section removed */}
                
                {/* Scope Creep Trend Chart - now takes full space */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-4">Measures how much work was added to sprints after they started, with guidelines for acceptable levels</h4>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4 mb-4" style={{ height: '450px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={scopeCreepHistory
                        .filter(item => item.cycleId) // Ensure valid data
                        .map(item => ({
                          name: item.cycleName,
                          scopeCreep: item.percentage,
                          cycleId: item.cycleId
                        }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      onClick={(data) => {
                        if (data && data.activePayload && data.activePayload[0]) {
                          const clickedData = data.activePayload[0].payload;
                          showSprintDetails(clickedData.cycleId);
                        }
                      }}
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
                        stroke="var(--chart-primary)" 
                        activeDot={{ 
                          r: 8, 
                          onClick: (data: any) => {
                            if (data && data.payload && data.payload.cycleId) {
                              showSprintDetails(data.payload.cycleId);
                            }
                          } 
                        }}
                        strokeWidth={2}
                        className="cursor-pointer"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="text-center mt-4 text-sm text-gray-600">
                  <p>Clicking a point opens detailed breakdown of added issues and their impact on the sprint</p>
                </div>
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">
          Agile Metrics: {activeSubTab === 'chart' ? 'Velocity History' : 
                          activeSubTab === 'trends' ? 'Velocity Trends' : 
                          activeSubTab === 'scopeCreep' ? 'Scope Creep' : ''}
        </h2>
        <div className="flex space-x-2">
          {/* Refresh button removed */}
        </div>
      </div>
      {renderContent()}
    </div>
  );
}; 