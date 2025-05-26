import React, { useEffect, useState } from 'react';
import { LinearCycle, LinearIssue } from '@/types/linear';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { ArrowLeft, Clock, CheckCircle, AlertTriangle, BarChart3, Calendar, Users, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TEXT = {
  backToList: 'Back',
  summary: 'Sprint Summary',
  issueBreakdown: 'Issue Breakdown',
  completedIssues: 'Completed Issues',
  openIssues: 'Open Issues',
  blockedIssues: 'Blocked Issues',
  notStarted: 'Not Started',
  startDate: 'Start Date',
  endDate: 'End Date',
  velocity: 'Velocity',
  scopeCreep: 'Scope Creep',
  issues: 'Issues',
  noIssues: 'No issues found for this sprint',
  velocityPerEngineer: 'Velocity Per Engineer',
  totalVelocity: 'Total Velocity',
  noEngineers: 'No engineers with completed points in this sprint',
  engineer: 'Engineer',
  points: 'Points',
  filterByEngineer: 'Filter by engineer',
  clearFilter: 'Clear filter',
  allEngineers: 'All Engineers',
};

interface SprintDetailViewProps {
  cycle: LinearCycle;
  cycleIssues: LinearIssue[];
  onBack: () => void;
  scopeCreepPercentage?: number;
}

interface EngineerVelocity {
  name: string;
  points: number;
}

const SprintDetailView: React.FC<SprintDetailViewProps> = ({
  cycle,
  cycleIssues,
  onBack,
  scopeCreepPercentage = 0
}) => {
  const [engineerFilter, setEngineerFilter] = useState<string>('');

  // Add debug logging
  useEffect(() => {
    console.log('SprintDetailView - cycle:', cycle);
    console.log('SprintDetailView - cycleIssues count:', cycleIssues.length);
    if (cycleIssues.length > 0) {
      console.log('SprintDetailView - Sample issue:', cycleIssues[0]);
      
      // Check state names for debugging
      const stateNames = new Set(cycleIssues.map(issue => issue.state?.name?.toLowerCase()));
      console.log('SprintDetailView - State names found:', Array.from(stateNames));
    }
  }, [cycle, cycleIssues]);

  // Helper function to check if an issue is a "done" issue - fixed to avoid type errors
  const isDoneIssue = (issue: LinearIssue): boolean => {
    // Check type first
    if (issue.state?.type === 'completed') {
      return true;
    }
    
    // Check state name contains done/complete/merged/shipped keywords
    const stateName = issue.state?.name?.toLowerCase() || '';
    return (stateName.includes('done') || 
            stateName.includes('complete') || 
            stateName.includes('merged') || 
            stateName.includes('shipped') ||
            stateName.includes('delivered'));
  };

  // Helper function to check if an issue should be excluded (canceled, duplicate, etc.)
  const isExcludedIssue = (issue: LinearIssue): boolean => {
    const stateName = issue.state?.name?.toLowerCase() || '';
    const issueTitle = issue.title?.toLowerCase() || '';
    
    return (
      stateName.includes('cancel') ||
      stateName.includes('duplicate') ||
      issueTitle.includes('cancel') ||
      issueTitle.includes('duplicate')
    );
  };

  // Check if this is a stub issue created by SprintHistoryContent
  const isStubData = cycleIssues.length === 1 && 
                     typeof cycleIssues[0].id === 'string' && 
                     cycleIssues[0].id.startsWith('stub-');

  // Filter issues - handle both regular issues and stub data
  const completedIssues = isStubData 
    ? cycleIssues // If it's stub data, all issues are considered "completed"
    : cycleIssues.filter(issue => isDoneIssue(issue) && !isExcludedIssue(issue));

  const blockedIssues = isStubData 
    ? [] 
    : cycleIssues.filter(issue => 
        !isDoneIssue(issue) && 
        issue.state?.name?.toLowerCase().includes('block') &&
        !isExcludedIssue(issue)
      );

  const notStartedIssues = isStubData
    ? []
    : cycleIssues.filter(issue => 
        !isDoneIssue(issue) && 
        (issue.state?.name?.toLowerCase().includes('to do') || 
         issue.state?.name?.toLowerCase().includes('backlog')) &&
        !isExcludedIssue(issue)
      );

  const inProgressIssues = isStubData
    ? []
    : cycleIssues.filter(issue => 
        !isDoneIssue(issue) && 
        !issue.state?.name?.toLowerCase().includes('block') && 
        !issue.state?.name?.toLowerCase().includes('to do') && 
        !issue.state?.name?.toLowerCase().includes('backlog') &&
        !isExcludedIssue(issue)
      );

  // Filter out canceled or duplicate issues
  const validIssues = isStubData ? cycleIssues : cycleIssues.filter(issue => !isExcludedIssue(issue));

  // Calculate velocity per engineer
  const engineerVelocities: EngineerVelocity[] = [];
  const engineerMap: Record<string, number> = {};
  
  // Debug logging for completed issues
  console.log('SprintDetailView - Completed issues count:', completedIssues.length);
  
  // Calculate total velocity based on completed issues or cycle data
  let totalEngineerVelocity = 0;

  if (isStubData) {
    // For stub data, use the provided estimate directly
    totalEngineerVelocity = cycleIssues[0].estimate || cycle.points || 0;
    
    // Create a single engineer entry for the team if we have stub data
    engineerVelocities.push({ 
      name: 'Team Total', 
      points: totalEngineerVelocity 
    });
    
    console.log(`SprintDetailView - Using stub data with velocity: ${totalEngineerVelocity}`);
  } else {
    // Only include done/completed issues for engineer velocity
    completedIssues.forEach(issue => {
      // Get the assignee name or mark as unassigned
      const engineer = issue.assignee?.name || 'Unassigned';
      // Get the points (estimate) or default to 0 if not set
      const points = issue.estimate || 0;
      
      console.log(`SprintDetailView - Engineer: ${engineer}, Issue: ${issue.identifier}, Points: ${points}`);
      
      if (!engineerMap[engineer]) {
        engineerMap[engineer] = 0;
      }
      
      engineerMap[engineer] += points;
    });
    
    // Debug logging for engineer map
    console.log('SprintDetailView - Engineer velocity map:', engineerMap);
    
    // Convert map to array and filter out zero velocities
    Object.entries(engineerMap).forEach(([name, points]) => {
      if (points > 0) {
        engineerVelocities.push({ name, points });
      }
    });
    
    // Sort by points descending
    engineerVelocities.sort((a, b) => b.points - a.points);
    
    // Total velocity for completed issues
    totalEngineerVelocity = engineerVelocities.reduce((sum, item) => sum + item.points, 0);
  }
  
  // Points calculations - use stub data if available, otherwise calculate from issues
  const completedPoints = isStubData 
    ? cycleIssues[0].estimate || cycle.points || 0 
    : completedIssues.reduce((sum, issue) => sum + (issue.estimate || 0), 0);
    
  const totalPoints = isStubData
    ? completedPoints // For stub data, total = completed
    : validIssues.reduce((sum, issue) => sum + (issue.estimate || 0), 0);

  // Use API velocity as a fallback if we have no completed points
  const effectiveCompletedPoints = completedPoints || cycle.points || 0;

  // Prepare data for the pie chart
  const pieChartData = [
    { name: TEXT.completedIssues, value: completedIssues.length, color: '#10b981' },
    { name: TEXT.openIssues, value: inProgressIssues.length, color: '#3b82f6' },
    { name: TEXT.blockedIssues, value: blockedIssues.length, color: '#f43f5e' },
    { name: TEXT.notStarted, value: notStartedIssues.length, color: '#94a3b8' },
  ].filter(item => item.value > 0);

  // State for filtered issues
  const [filterEngineer, setFilterEngineer] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredIssues = validIssues.filter(issue => {
    const matchesEngineer = !filterEngineer || (issue.assignee?.name === filterEngineer);
    const matchesSearch = !searchTerm || 
      (issue.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       issue.identifier?.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesEngineer && matchesSearch;
  });

  // Clear filters
  const handleClearFilters = () => {
    setFilterEngineer(null);
    setSearchTerm('');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button 
          onClick={onBack} 
          size="xs" 
          className="implicit-btn black flex items-center"
        >
          <ArrowLeft className="h-2.5 w-2.5 mr-1" />
          <span>{TEXT.backToList}</span>
        </Button>
      </div>

      <div className="implicit-card mb-6">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <Calendar className="mr-2 h-5 w-5 text-primary" />
          {cycle.name} Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">{TEXT.startDate}</p>
            <p className="text-xl font-semibold">
              {cycle.startsAt ? new Date(cycle.startsAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">{TEXT.endDate}</p>
            <p className="text-xl font-semibold">
              {cycle.endsAt ? new Date(cycle.endsAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">{TEXT.velocity}</p>
            <p className="text-xl font-semibold">{effectiveCompletedPoints} {!isStubData && totalPoints > effectiveCompletedPoints ? `/ ${totalPoints}` : ''} points</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">{TEXT.scopeCreep}</p>
            <p className={`text-xl font-semibold ${
              scopeCreepPercentage > 20 ? 'text-red-600' : 
              scopeCreepPercentage > 10 ? 'text-yellow-600' : 
              'text-green-600'
            }`}>
              +{scopeCreepPercentage.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Velocity Per Engineer Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <Users className="w-5 h-5 mr-2 text-primary" />
            {TEXT.velocityPerEngineer}
          </h3>
          
          {engineerVelocities.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{TEXT.engineer}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{TEXT.points}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">% of Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {engineerVelocities.map((engineer) => (
                    <tr key={engineer.name} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{engineer.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500">{engineer.points}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-500">
                        {((engineer.points / totalEngineerVelocity) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold">{TEXT.totalVelocity}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-right">{totalEngineerVelocity}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-right">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-20 bg-gray-50 rounded-lg">
              <p className="text-gray-500">{TEXT.noEngineers}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Issue Status Breakdown */}
          <div>
            <h3 className="text-lg font-semibold mb-3">{TEXT.issueBreakdown}</h3>
            {pieChartData.length > 0 ? (
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={60}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} issues`, 'Count']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 bg-gray-50 rounded-lg">
                <p className="text-gray-500">{TEXT.noIssues}</p>
              </div>
            )}
          </div>

          {/* Issues List */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">{TEXT.issues}</h3>
              
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <select
                    value={engineerFilter || ""}
                    onChange={(e) => setFilterEngineer(e.target.value || null)}
                    className="py-1 pl-2 pr-8 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">{TEXT.allEngineers}</option>
                    {Array.from(new Set(cycleIssues.map(issue => issue.assignee?.name || 'Unassigned'))).map(engineer => (
                      <option key={engineer} value={engineer}>{engineer}</option>
                    ))}
                  </select>
                </div>
                
                {filterEngineer && (
                  <Button 
                    onClick={handleClearFilters} 
                    size="xs" 
                    className="implicit-btn flex items-center h-7 px-2"
                  >
                    <X className="h-3 w-3 mr-1" />
                    <span className="text-xs">{TEXT.clearFilter}</span>
                  </Button>
                )}
              </div>
            </div>
            
            {filteredIssues.length > 0 ? (
              <div className="overflow-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issue</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{TEXT.engineer}</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredIssues.map((issue) => (
                      <tr key={issue.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm">
                          <a 
                            href={`https://linear.app/implicit/issue/${issue.identifier || issue.id}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline"
                          >
                            {issue.identifier || issue.id}
                          </a>
                          <div className="text-xs text-gray-600 truncate max-w-xs">{issue.title}</div>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            isDoneIssue(issue)
                              ? 'bg-green-100 text-green-800' 
                              : issue.state?.name?.toLowerCase().includes('block')
                                ? 'bg-red-100 text-red-800'
                                : issue.state?.name?.toLowerCase().includes('to do') || issue.state?.name?.toLowerCase().includes('backlog')
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-blue-100 text-blue-800'
                          }`}>
                            {issue.state?.name || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          {issue.assignee?.name || 'Unassigned'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500 text-right">
                          {issue.estimate || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 bg-gray-50 rounded-lg">
                <p className="text-gray-500">{TEXT.noIssues}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SprintDetailView; 