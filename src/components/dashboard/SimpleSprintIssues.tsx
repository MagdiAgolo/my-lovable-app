import React, { useState, useEffect } from 'react';
import { linearService } from '@/services/linearService';
import { LinearIssue, LinearCycle } from '@/types/linear';

interface SimpleSprintIssuesProps {
  teamId: string;
}

const SimpleSprintIssues: React.FC<SimpleSprintIssuesProps> = ({ teamId }) => {
  const [cycles, setCycles] = useState<LinearCycle[]>([]);
  const [issues, setIssues] = useState<LinearIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!teamId) return;

    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching data for team:', teamId);
      
      // Fetch cycles and issues in parallel
      const [cyclesData, issuesData] = await Promise.all([
        linearService.getTeamCycles(teamId),
        linearService.getIssuesByTeam(teamId)
      ]);
      
      console.log('✅ Cycles retrieved:', cyclesData.length);
      console.log('✅ Issues retrieved:', issuesData.length);
      
      setCycles(cyclesData);
      setIssues(issuesData);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Error fetching data:', errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [teamId]);

  const getSprintData = () => {
    if (!cycles.length || !issues.length) return [];

    return cycles.map(cycle => {
      // Get all issues for this sprint - EXACT SAME as SimpleSprintDetails
      const sprintIssues = issues.filter(issue => issue.cycle?.id === cycle.id);
      
      // Get done issues using the service's completion check - EXACT SAME as SimpleSprintDetails
      const doneIssues = sprintIssues.filter(issue => {
        const isCompleted = linearService.isIssueCompleted(issue);
        return isCompleted;
      });
      
      // Calculate velocity (sum of estimates for done issues) - EXACT SAME as SimpleSprintDetails
      const velocity = doneIssues.reduce((sum, issue) => sum + (issue.estimate || 0), 0);
      
      console.log(`📊 SimpleSprintIssues - ${cycle.name}: ${sprintIssues.length} total, ${doneIssues.length} done, ${velocity} velocity`);
      
      return {
        cycle,
        totalIssues: sprintIssues.length,
        doneIssues: doneIssues.length,
        velocity: velocity,
        issues: sprintIssues,
        doneIssuesList: doneIssues
      };
    }).filter(sprint => sprint.doneIssues > 0); // Only show sprints with done issues
  };

  const sprintData = getSprintData();

  if (loading) {
    return <div className="p-4">Loading sprint data...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <h3 className="text-red-800 font-semibold">Error</h3>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!cycles.length) {
    return <div className="p-4">No cycles found for this team.</div>;
  }

  if (sprintData.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <h2 className="text-2xl font-bold">Done Issues Per Sprint</h2>
        
        {/* Summary */}
        <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
          <h3 className="font-semibold text-yellow-800">No Done Issues Found</h3>
          <p className="text-yellow-600">
            Found {cycles.length} sprints and {issues.length} total issues, but no sprints have completed work yet.
          </p>
        </div>
        
        {/* Show all sprints for debugging */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-700">All Sprints:</h3>
          {cycles.map(cycle => (
            <div key={cycle.id} className="border border-gray-200 rounded p-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">{cycle.name}</span>
                <span className="text-sm text-gray-500">
                  {issues.filter(issue => issue.cycle?.id === cycle.id).length} issues
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Done Issues Per Sprint</h2>
      
      {/* Summary */}
      <div className="bg-blue-50 p-4 rounded border border-blue-200">
        <h3 className="font-semibold text-blue-800">Summary</h3>
        <p className="text-blue-600">
          Found {cycles.length} total sprints, showing {sprintData.length} sprints with done issues • {issues.length} total issues
        </p>
      </div>

      {/* Sprint List */}
      <div className="space-y-4">
        {sprintData.map(({ cycle, totalIssues, doneIssues, velocity, issues, doneIssuesList }) => (
          <div key={cycle.id} className="border border-gray-200 rounded p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{cycle.name}</h3>
                <p className="text-sm text-gray-600">
                  Sprint {cycle.number} • {cycle.startsAt ? new Date(cycle.startsAt).toLocaleDateString() : 'No start date'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-green-600">{velocity} pts</div>
                <div className="text-sm text-gray-500">
                  {doneIssues}/{totalIssues} done
                </div>
              </div>
            </div>

            {/* Done Issues */}
            {doneIssues > 0 ? (
              <div>
                <h4 className="font-medium text-green-700 mb-2">
                  ✅ Done Issues ({doneIssues})
                </h4>
                <div className="space-y-1">
                  {doneIssuesList.map(issue => (
                    <div key={issue.id} className="flex justify-between items-center text-sm">
                      <span>
                        <a 
                          href={`https://linear.app/implicit/issue/${issue.identifier || issue.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {issue.identifier}
                        </a>
                        <span className="ml-2">{issue.title}</span>
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                          {issue.state?.name}
                        </span>
                        <span className="font-semibold text-green-600">
                          {issue.estimate || 0} pts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-gray-500 italic">No done issues in this sprint</div>
            )}

            {/* Show remaining issues for debugging */}
            {totalIssues > doneIssues && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-600">
                  🔍 Show remaining {totalIssues - doneIssues} issues
                </summary>
                <div className="mt-2 space-y-1">
                  {issues
                    .filter(issue => !linearService.isIssueCompleted(issue))
                    .map(issue => (
                      <div key={issue.id} className="flex justify-between items-center text-sm">
                        <span>
                          <a 
                            href={`https://linear.app/implicit/issue/${issue.identifier || issue.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono hover:text-blue-600 hover:underline"
                          >
                            {issue.identifier}
                          </a>
                          <span className="ml-2">{issue.title}</span>
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                            {issue.state?.name}
                          </span>
                          <span className="font-semibold">
                            {issue.estimate || 0} pts
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SimpleSprintIssues; 