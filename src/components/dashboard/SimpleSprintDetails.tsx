import React, { useState, useEffect } from 'react';
import { linearService } from '@/services/linearService';
import { LinearIssue, LinearCycle } from '@/types/linear';
import { ArrowLeft, Calendar, User, CheckCircle, Clock, AlertTriangle, Pause } from 'lucide-react';

interface SimpleSprintDetailsProps {
  cycleId: string;
  teamId: string;
  onBack: () => void;
}

const SimpleSprintDetails: React.FC<SimpleSprintDetailsProps> = ({ cycleId, teamId, onBack }) => {
  const [cycle, setCycle] = useState<LinearCycle | null>(null);
  const [issues, setIssues] = useState<LinearIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSprintDetails = async () => {
    if (!cycleId || !teamId) return;

    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching sprint details for:', cycleId);
      
      // Fetch cycle and all team issues in parallel
      const [cyclesData, issuesData] = await Promise.all([
        linearService.getTeamCycles(teamId),
        linearService.getIssuesByTeam(teamId)
      ]);
      
      // Find the specific cycle
      const targetCycle = cyclesData.find(c => c.id === cycleId);
      if (!targetCycle) {
        throw new Error(`Sprint not found: ${cycleId}`);
      }
      
      // Filter issues for this specific cycle
      const cycleIssues = issuesData.filter(issue => issue.cycle?.id === cycleId);
      
      console.log('✅ Sprint details retrieved:', {
        cycle: targetCycle.name,
        totalIssues: cycleIssues.length
      });
      
      setCycle(targetCycle);
      setIssues(cycleIssues);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Error fetching sprint details:', errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSprintDetails();
  }, [cycleId, teamId]);

  const getIssuesByStatus = () => {
    if (!issues.length) return { done: [], inProgress: [], blocked: [], notStarted: [] };

    // Special debug logging for Sprint New Architecture 18
    if (cycle?.name?.includes('New Architecture 18')) {
      console.log('🔍 SPRINT DETAILS DEBUG - New Architecture 18:');
      console.log(`📊 Total issues found: ${issues.length}`);
      
      issues.forEach((issue, index) => {
        const isCompleted = linearService.isIssueCompleted(issue);
        console.log(`  ${index + 1}. ${issue.identifier} - "${issue.title}"`);
        console.log(`     State: ${issue.state?.name} (type: ${issue.state?.type})`);
        console.log(`     Points: ${issue.estimate || 0}`);
        console.log(`     Completed: ${isCompleted ? 'YES' : 'NO'}`);
        console.log(`     Assignee: ${issue.assignee?.name || 'Unassigned'}`);
        console.log('     ---');
      });
    }

    const done = issues.filter(issue => {
      const isCompleted = linearService.isIssueCompleted(issue);
      
      // Special logging for New Architecture 18
      if (cycle?.name?.includes('New Architecture 18')) {
        console.log(`Issue ${issue.identifier}: ${issue.state?.name} -> ${isCompleted ? 'DONE' : 'NOT_DONE'}`);
      }
      
      return isCompleted;
    });

    // Special velocity calculation debug for New Architecture 18
    if (cycle?.name?.includes('New Architecture 18')) {
      const totalVelocity = done.reduce((sum, issue) => sum + (issue.estimate || 0), 0);
      console.log(`🎯 SPRINT DETAILS VELOCITY CALCULATION:`);
      console.log(`   Done issues: ${done.length}/${issues.length}`);
      console.log(`   Total velocity: ${totalVelocity} points`);
      console.log(`   Done issues breakdown:`);
      done.forEach((issue, index) => {
        console.log(`     ${index + 1}. ${issue.identifier}: ${issue.estimate || 0} pts`);
      });
    }

    const blocked = issues.filter(issue => 
      !linearService.isIssueCompleted(issue) && 
      issue.state?.name?.toLowerCase().includes('block')
    );

    const notStarted = issues.filter(issue => 
      !linearService.isIssueCompleted(issue) && 
      !issue.state?.name?.toLowerCase().includes('block') &&
      (issue.state?.name?.toLowerCase().includes('to do') || 
       issue.state?.name?.toLowerCase().includes('backlog') ||
       issue.state?.name?.toLowerCase().includes('todo'))
    );

    const inProgress = issues.filter(issue => 
      !linearService.isIssueCompleted(issue) && 
      !issue.state?.name?.toLowerCase().includes('block') &&
      !issue.state?.name?.toLowerCase().includes('to do') &&
      !issue.state?.name?.toLowerCase().includes('backlog') &&
      !issue.state?.name?.toLowerCase().includes('todo')
    );

    return { done, inProgress, blocked, notStarted };
  };

  const calculateEngineersVelocity = () => {
    const { done } = getIssuesByStatus();
    const engineerMap: Record<string, number> = {};
    
    done.forEach(issue => {
      const engineer = issue.assignee?.name || 'Unassigned';
      const points = issue.estimate || 0;
      
      if (!engineerMap[engineer]) {
        engineerMap[engineer] = 0;
      }
      engineerMap[engineer] += points;
    });
    
    return Object.entries(engineerMap)
      .map(([name, points]) => ({ name, points }))
      .sort((a, b) => b.points - a.points);
  };

  if (loading) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="mb-4 flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to list
        </button>
        <div>Loading sprint details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="mb-4 flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to list
        </button>
        <div className="p-4 bg-red-50 border border-red-200 rounded">
          <h3 className="text-red-800 font-semibold">Error</h3>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={fetchSprintDetails}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="mb-4 flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to list
        </button>
        <div>Sprint not found</div>
      </div>
    );
  }

  const { done, inProgress, blocked, notStarted } = getIssuesByStatus();
  const totalVelocity = done.reduce((sum, issue) => sum + (issue.estimate || 0), 0);
  const totalPoints = issues.reduce((sum, issue) => sum + (issue.estimate || 0), 0);
  const engineersVelocity = calculateEngineersVelocity();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack} 
          className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to sprint list
        </button>
      </div>

      {/* Sprint Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center">
          <Calendar className="w-6 h-6 mr-3 text-blue-600" />
          {cycle.name}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-600 mb-1">Start Date</p>
            <p className="text-lg font-semibold">
              {cycle.startsAt ? new Date(cycle.startsAt).toLocaleDateString() : 'Not set'}
            </p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-600 mb-1">End Date</p>
            <p className="text-lg font-semibold">
              {cycle.endsAt ? new Date(cycle.endsAt).toLocaleDateString() : 'Not set'}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-600 mb-1">Velocity</p>
            <p className="text-lg font-semibold text-green-700">
              {totalVelocity} pts
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Issues</p>
            <p className="text-lg font-semibold">
              {issues.length}
            </p>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-green-600">Done</p>
              <p className="text-xl font-bold text-green-700">{done.length}</p>
            </div>
          </div>
          <div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <Clock className="w-5 h-5 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-blue-600">In Progress</p>
              <p className="text-xl font-bold text-blue-700">{inProgress.length}</p>
            </div>
          </div>
          <div className="flex items-center p-3 bg-red-50 rounded-lg border border-red-200">
            <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
            <div>
              <p className="text-sm text-red-600">Blocked</p>
              <p className="text-xl font-bold text-red-700">{blocked.length}</p>
            </div>
          </div>
          <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
            <Pause className="w-5 h-5 text-gray-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Not Started</p>
              <p className="text-xl font-bold text-gray-700">{notStarted.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Engineers Velocity */}
      {engineersVelocity.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-blue-600" />
            Engineer Velocity
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Engineer</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Points</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {engineersVelocity.map(engineer => (
                  <tr key={engineer.name} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{engineer.name}</td>
                    <td className="px-4 py-3 text-right">{engineer.points}</td>
                    <td className="px-4 py-3 text-right">
                      {totalVelocity > 0 ? ((engineer.points / totalVelocity) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right">{totalVelocity}</td>
                  <td className="px-4 py-3 text-right">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Issues by Status */}
      <div className="space-y-6">
        {/* Done Issues */}
        {done.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center text-green-700">
              <CheckCircle className="w-5 h-5 mr-2" />
              Done Issues ({done.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-green-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-green-700">Issue</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-green-700">Title</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-green-700">Assignee</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-green-700">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {done.map(issue => (
                    <tr key={issue.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm text-blue-600">{issue.identifier}</td>
                      <td className="px-4 py-3 text-sm">{issue.title}</td>
                      <td className="px-4 py-3 text-sm">{issue.assignee?.name || 'Unassigned'}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold">{issue.estimate || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* In Progress Issues */}
        {inProgress.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center text-blue-700">
              <Clock className="w-5 h-5 mr-2" />
              In Progress Issues ({inProgress.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-blue-700">Issue</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-blue-700">Title</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-blue-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-blue-700">Assignee</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-blue-700">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {inProgress.map(issue => (
                    <tr key={issue.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm text-blue-600">{issue.identifier}</td>
                      <td className="px-4 py-3 text-sm">{issue.title}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {issue.state?.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{issue.assignee?.name || 'Unassigned'}</td>
                      <td className="px-4 py-3 text-right text-sm">{issue.estimate || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Blocked Issues */}
        {blocked.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center text-red-700">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Blocked Issues ({blocked.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-red-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-red-700">Issue</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-red-700">Title</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-red-700">Assignee</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-red-700">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {blocked.map(issue => (
                    <tr key={issue.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm text-blue-600">{issue.identifier}</td>
                      <td className="px-4 py-3 text-sm">{issue.title}</td>
                      <td className="px-4 py-3 text-sm">{issue.assignee?.name || 'Unassigned'}</td>
                      <td className="px-4 py-3 text-right text-sm">{issue.estimate || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Not Started Issues */}
        {notStarted.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center text-gray-700">
              <Pause className="w-5 h-5 mr-2" />
              Not Started Issues ({notStarted.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Issue</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Title</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Assignee</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {notStarted.map(issue => (
                    <tr key={issue.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm text-blue-600">{issue.identifier}</td>
                      <td className="px-4 py-3 text-sm">{issue.title}</td>
                      <td className="px-4 py-3 text-sm">{issue.assignee?.name || 'Unassigned'}</td>
                      <td className="px-4 py-3 text-right text-sm">{issue.estimate || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleSprintDetails; 