import { useEffect, useState } from 'react';
import { LinearIssue } from '@/types/linear';
import { useQuery } from '@tanstack/react-query';
import { linearService } from '@/services/linearService';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface VelocityPerEngineerProps {
  issues: LinearIssue[];
  loading: boolean;
  onRefresh: () => void;
  error: Error | null;
  selectedTeamId: string | null;
  selectedCycleId?: string | null;
}

export function VelocityPerEngineer({ issues, loading, onRefresh, error, selectedTeamId, selectedCycleId }: VelocityPerEngineerProps) {
  const [totalCyclePoints, setTotalCyclePoints] = useState<number>(0);
  
  // Get cycle data to match the dropdown value
  const { data: cycles, error: cyclesError } = useQuery({
    queryKey: ["cycles", selectedTeamId],
    queryFn: () => linearService.getTeamCycles(selectedTeamId || ""),
    enabled: !!selectedTeamId,
    retry: 1 // Only retry once
  });
  
  // Set the total points from the cycle data to match dropdown
  useEffect(() => {
    if (cycles && selectedCycleId) {
      const selectedCycle = cycles.find(cycle => cycle.id === selectedCycleId);
      if (selectedCycle) {
        setTotalCyclePoints(selectedCycle.points || 0);
      }
    }
  }, [cycles, selectedCycleId]);

  // Check for the specific "Entity not found: Team" error
  const hasTeamNotFoundError = 
    (error && error.message?.includes("Entity not found: Team")) ||
    (cyclesError && cyclesError.message?.includes("Entity not found: Team"));

  if (hasTeamNotFoundError) {
    return (
      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 mt-2">
        <div className="flex items-center space-x-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <p className="font-medium text-yellow-700">Team Not Found</p>
        </div>
        <p className="text-sm mb-2">Unable to load engineer velocity data.</p>
        <button 
          onClick={onRefresh}
          className="flex items-center space-x-1 text-sm px-2 py-1 bg-yellow-100 hover:bg-yellow-200 rounded"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading velocity per engineer data...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg border border-red-200 mt-2">
        <div className="flex items-center space-x-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <p className="font-medium text-red-700">Error Loading Data</p>
        </div>
        <p className="text-sm mb-2">{error.message || "An unknown error occurred"}</p>
        <button 
          onClick={onRefresh}
          className="flex items-center space-x-1 text-sm px-2 py-1 bg-red-100 hover:bg-red-200 rounded"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  // Filter issues by cycle and remove canceled/duplicate issues
  const filteredIssues = selectedCycleId 
    ? issues.filter(issue => {
        // Filter by cycle ID
        if (issue.cycle?.id !== selectedCycleId) return false;
        
        // Remove canceled and duplicate issues
        const isCanceled = 
          issue.state?.name?.toLowerCase().includes('cancel') || 
          issue.state?.name?.toLowerCase().includes('duplicate') || 
          issue.state?.type === 'canceled';
          
        return !isCanceled;
      }) 
    : issues.filter(issue => {
        // Remove canceled and duplicate issues
        const isCanceled = 
          issue.state?.name?.toLowerCase().includes('cancel') || 
          issue.state?.name?.toLowerCase().includes('duplicate') || 
          issue.state?.type === 'canceled';
          
        return !isCanceled;
      });

  // Debug logging
  console.log(`Total non-canceled issues for cycle: ${filteredIssues.length}`);
  
  // Log engineers and their issues
  const engineerIssues = new Map<string, LinearIssue[]>();
  filteredIssues.forEach(issue => {
    const engineer = issue.engineer || "Unassigned";
    if (!engineerIssues.has(engineer)) {
      engineerIssues.set(engineer, []);
    }
    engineerIssues.get(engineer)?.push(issue);
  });
  
  // Print engineer issue counts
  engineerIssues.forEach((issues, engineer) => {
    const completedCount = issues.filter(issue => linearService.isIssueCompleted(issue)).length;
    
    console.log(`Engineer ${engineer}: ${completedCount} completed issues out of ${issues.length} total issues`);
  });

  // Get all engineers who have any issues in this cycle
  const allEngineers = new Set<string>();
  filteredIssues.forEach(issue => {
    const engineer = issue.engineer || "Unassigned";
    allEngineers.add(engineer);
  });
  
  // If no engineers found, don't show anything
  if (allEngineers.size === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
        <p>No issues found in this cycle.</p>
        <p className="text-sm text-gray-500">Total cycle points: {totalCyclePoints}</p>
      </div>
    );
  }

  // Calculate initial velocity based on completed issues
  const initialVelocity: Record<string, number> = {};
  filteredIssues.forEach(issue => {
    const engineer = issue.engineer || "Unassigned";
    
    // Use linearService's isIssueCompleted function for consistency
    if (linearService.isIssueCompleted(issue)) {
      const estimate = typeof issue.estimate === 'number' ? issue.estimate : 0;
      initialVelocity[engineer] = (initialVelocity[engineer] || 0) + estimate;
      
      // Debug logging for Fatma's issues specifically
      if (engineer.toLowerCase().includes('fatma')) {
        console.log(`Added ${estimate} points for Fatma from issue: ${issue.identifier || issue.id} - ${issue.title} (state: ${issue.state?.name})`);
      }
    }
  });
  
  // Initialize all engineers with 0 if they don't have completed issues
  Array.from(allEngineers).forEach(engineer => {
    if (!initialVelocity[engineer]) {
      initialVelocity[engineer] = 0;
    }
  });
  
  // Calculate actual total
  const calculatedTotal = Object.values(initialVelocity).reduce((sum, v) => sum + v, 0);
  
  // Use the raw velocity values directly without any scaling or distribution
  const engineerVelocity = initialVelocity;
  
  console.log('Final velocity per engineer:', engineerVelocity);
  console.log('Total calculated velocity:', calculatedTotal);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full border-collapse">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Engineer</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Velocity</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">% of Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {Object.entries(engineerVelocity)
            .sort(([_, velocityA], [__, velocityB]) => velocityB - velocityA)
            .map(([engineer, velocity]) => {
              const isLowVelocity = velocity < 6;
              const isUnassigned = engineer === "Unassigned";
              return (
                <tr 
                  key={engineer} 
                  className={`hover:bg-gray-50 ${isLowVelocity ? 'bg-red-50' : ''} ${isUnassigned ? 'italic text-gray-500' : ''}`}
                >
                  <td className="px-4 py-3">{engineer}</td>
                  <td className={`px-4 py-3 text-right ${isLowVelocity ? 'text-red-600 font-semibold' : ''}`}>
                    {velocity}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {calculatedTotal > 0 ? Math.round((velocity / calculatedTotal) * 100) : 0}%
                  </td>
                </tr>
              );
            })}
          <tr className="font-bold bg-gray-50">
            <td className="px-4 py-3">Total</td>
            <td className="px-4 py-3 text-right">{calculatedTotal}</td>
            <td className="px-4 py-3 text-right">100%</td>
              </tr>
        </tbody>
      </table>
    </div>
  );
} 