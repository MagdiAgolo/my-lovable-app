import React, { useState, useEffect } from 'react';
import { linearService } from '@/services/linearService';
import { LinearIssue, LinearCycle } from '@/types/linear';
import { toast } from 'sonner';
import { AlertCircle, Clock, RefreshCw, TrendingUp, Activity, Timer, BarChart3, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TEXT = {
  title: 'Flow Metrics Analysis',
  selectSprint: 'Select Sprint',
  columns: {
    sprintName: 'Sprint',
    todo: 'To Do',
    inProgress: 'In Progress', 
    inReview: 'In Review',
    done: 'Done',
    totalFlow: 'Total Flow Time',
    bottleneck: 'Bottleneck'
  },
  labels: {
    averageTime: 'Avg Time',
    ticketCount: 'tickets',
    days: 'days',
    hours: 'hours',
    noData: 'No data',
    loading: 'Loading flow metrics...',
    error: 'Error loading metrics',
    refresh: 'Refresh',
    lastUpdated: 'Last updated',
    justNow: 'just now',
    minutesAgo: 'min ago',
    hoursAgo: 'h ago',
    daysAgo: 'd ago',
    totalFlowTime: 'Total Flow Time',
    bottleneckIndicator: 'Bottleneck',
    completedSprints: 'Completed Sprints Only',
    noCompletedSprints: 'No completed sprints found'
  }
};

interface FlowBoardProps {
  teamId: string;
}

interface LaneMetrics {
  averageTimeInDays: number;
  ticketCount: number;
  isBottleneck: boolean;
}

interface SprintFlowMetrics {
  sprintId: string;
  sprintName: string;
  todo: LaneMetrics;
  inProgress: LaneMetrics;
  inReview: LaneMetrics;
  done: LaneMetrics;
  totalFlowTime: number;
  primaryBottleneck: string;
}

export const FlowBoard: React.FC<FlowBoardProps> = ({ teamId }) => {
  const [cycles, setCycles] = useState<LinearCycle[]>([]);
  const [sprintMetrics, setSprintMetrics] = useState<SprintFlowMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Fetch cycles when teamId changes
  useEffect(() => {
    if (!teamId) return;
    fetchAndCalculateMetrics();
  }, [teamId]);

  const isSprintCompleted = (cycle: LinearCycle): boolean => {
    if (!cycle.endsAt) return false;
    const endDate = new Date(cycle.endsAt);
    const now = new Date();
    return endDate < now;
  };

  const fetchAndCalculateMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all cycles
      const allCycles = await linearService.getTeamCycles(teamId);
      
      // Filter to only completed sprints
      const completedCycles = allCycles.filter(isSprintCompleted);
      setCycles(completedCycles);
      
      if (completedCycles.length === 0) {
        setSprintMetrics([]);
        setLastUpdated(new Date());
        return;
      }

      // Calculate metrics for each completed sprint
      const metricsPromises = completedCycles.slice(0, 10).map(async (cycle) => {
        try {
          const issues = await linearService.getIssuesByCycleAndAssignee(teamId, cycle.id);
          const metrics = calculateFlowMetrics(issues, cycle);
          return {
            sprintId: cycle.id,
            sprintName: cycle.name,
            ...metrics
          };
        } catch (error) {
          console.error(`Error fetching metrics for cycle ${cycle.name}:`, error);
          return null;
        }
      });

      const results = await Promise.all(metricsPromises);
      const validMetrics = results.filter((result): result is SprintFlowMetrics => result !== null);
      
      setSprintMetrics(validMetrics);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching flow metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch flow metrics');
      toast.error('Failed to load flow metrics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateFlowMetrics = (issues: LinearIssue[], cycle: LinearCycle) => {
    const laneData = {
      todo: { times: [] as number[], count: 0 },
      inProgress: { times: [] as number[], count: 0 },
      inReview: { times: [] as number[], count: 0 },
      done: { times: [] as number[], count: 0 }
    };

    const cycleStartDate = cycle.startsAt ? new Date(cycle.startsAt) : null;
    const cycleEndDate = cycle.endsAt ? new Date(cycle.endsAt) : new Date();

    issues.forEach(issue => {
      const createdDate = new Date(issue.createdAt);
      const completedDate = issue.completedAt ? new Date(issue.completedAt) : cycleEndDate;
      const state = issue.state?.name?.toLowerCase() || '';

      // Use cycle duration as baseline for time calculation
      let baseTimeInDays = 0;
      
      if (cycleStartDate) {
        const referenceDate = createdDate > cycleStartDate ? createdDate : cycleStartDate;
        const endReference = completedDate < cycleEndDate ? completedDate : cycleEndDate;
        baseTimeInDays = Math.max(0, (endReference.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        baseTimeInDays = (completedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      }

      // Distribute time based on final state
      if (state.includes('backlog') || state.includes('to do') || state.includes('todo')) {
        laneData.todo.times.push(baseTimeInDays);
        laneData.todo.count++;
      } else if (state.includes('in progress') || state.includes('doing') || state.includes('development')) {
        laneData.todo.times.push(baseTimeInDays * 0.25);
        laneData.inProgress.times.push(baseTimeInDays * 0.75);
        laneData.todo.count++;
        laneData.inProgress.count++;
      } else if (state.includes('review') || state.includes('testing') || state.includes('qa')) {
        laneData.todo.times.push(baseTimeInDays * 0.2);
        laneData.inProgress.times.push(baseTimeInDays * 0.5);
        laneData.inReview.times.push(baseTimeInDays * 0.3);
        laneData.todo.count++;
        laneData.inProgress.count++;
        laneData.inReview.count++;
      } else if (state.includes('done') || state.includes('complete') || 
                state.includes('merged') || state.includes('shipped') || 
                state.includes('delivered') || state.includes('closed')) {
        laneData.todo.times.push(baseTimeInDays * 0.15);
        laneData.inProgress.times.push(baseTimeInDays * 0.45);
        laneData.inReview.times.push(baseTimeInDays * 0.25);
        laneData.done.times.push(baseTimeInDays * 0.15);
        laneData.todo.count++;
        laneData.inProgress.count++;
        laneData.inReview.count++;
        laneData.done.count++;
      }
    });

    // Calculate averages
    const calculateAverage = (times: number[]) => 
      times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;

    const todoAvg = calculateAverage(laneData.todo.times);
    const inProgressAvg = calculateAverage(laneData.inProgress.times);
    const inReviewAvg = calculateAverage(laneData.inReview.times);
    const doneAvg = calculateAverage(laneData.done.times);

    // Identify bottlenecks
    const averages = [
      { name: 'To Do', value: todoAvg },
      { name: 'In Progress', value: inProgressAvg },
      { name: 'In Review', value: inReviewAvg },
      { name: 'Done', value: doneAvg }
    ].filter(avg => avg.value > 0);

    const maxAverage = Math.max(...averages.map(avg => avg.value));
    const avgOfAverages = averages.reduce((sum, avg) => sum + avg.value, 0) / averages.length;
    const bottleneckThreshold = avgOfAverages * 1.3;

    const primaryBottleneck = averages.find(avg => avg.value === maxAverage && avg.value > bottleneckThreshold)?.name || 'None';

    return {
      todo: {
        averageTimeInDays: todoAvg,
        ticketCount: laneData.todo.count,
        isBottleneck: todoAvg > bottleneckThreshold
      },
      inProgress: {
        averageTimeInDays: inProgressAvg,
        ticketCount: laneData.inProgress.count,
        isBottleneck: inProgressAvg > bottleneckThreshold
      },
      inReview: {
        averageTimeInDays: inReviewAvg,
        ticketCount: laneData.inReview.count,
        isBottleneck: inReviewAvg > bottleneckThreshold
      },
      done: {
        averageTimeInDays: doneAvg,
        ticketCount: laneData.done.count,
        isBottleneck: doneAvg > bottleneckThreshold
      },
      totalFlowTime: todoAvg + inProgressAvg + inReviewAvg + doneAvg,
      primaryBottleneck
    };
  };

  const formatTime = (days: number): string => {
    if (days === 0) return '0h';
    if (days < 1) {
      const hours = Math.round(days * 24);
      return `${hours}h`;
    }
    return `${days.toFixed(1)}d`;
  };

  const getTimeSince = (date: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return TEXT.labels.justNow;
    if (diffInMinutes < 60) return `${diffInMinutes} ${TEXT.labels.minutesAgo}`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} ${TEXT.labels.hoursAgo}`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} ${TEXT.labels.daysAgo}`;
  };

  const getLaneStyle = (isBottleneck: boolean) => {
    return isBottleneck 
      ? 'bg-red-50 text-red-700 font-semibold border-l-2 border-red-400' 
      : 'text-gray-700';
  };

  const getBottleneckIcon = (bottleneck: string) => {
    if (bottleneck === 'None') return null;
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  };

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">{TEXT.title}</h2>
          <div className="flex items-center text-xs text-gray-500">
            <Clock className="h-3 w-3 mr-1" />
            <span>{TEXT.labels.lastUpdated}: {getTimeSince(lastUpdated)}</span>
          </div>
          <div className="flex items-center text-xs text-blue-600 mt-1">
            <BarChart3 className="h-3 w-3 mr-1" />
            <span>{TEXT.labels.completedSprints}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            size="sm"
            onClick={fetchAndCalculateMetrics}
            className="implicit-btn black flex items-center gap-1.5 px-3 py-2 h-auto"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {TEXT.labels.refresh}
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center">
          <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center h-32 mb-6">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
            <span className="text-gray-600">{TEXT.labels.loading}</span>
          </div>
        </div>
      )}
      
      {/* Flow Metrics Table */}
      {!loading && sprintMetrics.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {TEXT.columns.sprintName}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {TEXT.columns.todo}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {TEXT.columns.inProgress}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {TEXT.columns.inReview}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {TEXT.columns.done}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {TEXT.columns.totalFlow}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {TEXT.columns.bottleneck}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sprintMetrics.map((sprint, index) => (
                  <tr key={sprint.sprintId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {sprint.sprintName}
                    </td>
                    <td className={`px-4 py-3 text-sm text-center ${getLaneStyle(sprint.todo.isBottleneck)}`}>
                      <div className="flex flex-col items-center">
                        <span className="font-semibold">{formatTime(sprint.todo.averageTimeInDays)}</span>
                        <span className="text-xs text-gray-500">{sprint.todo.ticketCount} {TEXT.labels.ticketCount}</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-sm text-center ${getLaneStyle(sprint.inProgress.isBottleneck)}`}>
                      <div className="flex flex-col items-center">
                        <span className="font-semibold">{formatTime(sprint.inProgress.averageTimeInDays)}</span>
                        <span className="text-xs text-gray-500">{sprint.inProgress.ticketCount} {TEXT.labels.ticketCount}</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-sm text-center ${getLaneStyle(sprint.inReview.isBottleneck)}`}>
                      <div className="flex flex-col items-center">
                        <span className="font-semibold">{formatTime(sprint.inReview.averageTimeInDays)}</span>
                        <span className="text-xs text-gray-500">{sprint.inReview.ticketCount} {TEXT.labels.ticketCount}</span>
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-sm text-center ${getLaneStyle(sprint.done.isBottleneck)}`}>
                      <div className="flex flex-col items-center">
                        <span className="font-semibold">{formatTime(sprint.done.averageTimeInDays)}</span>
                        <span className="text-xs text-gray-500">{sprint.done.ticketCount} {TEXT.labels.ticketCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-semibold text-indigo-600">{formatTime(sprint.totalFlowTime)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <div className="flex items-center justify-center gap-1">
                        {getBottleneckIcon(sprint.primaryBottleneck)}
                        <span className={sprint.primaryBottleneck !== 'None' ? 'text-red-600 font-medium' : 'text-gray-500'}>
                          {sprint.primaryBottleneck}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {!loading && sprintMetrics.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg mb-2">{TEXT.labels.noCompletedSprints}</p>
          <p className="text-sm text-center max-w-md">
            Flow metrics are only calculated for completed sprints. 
            Complete a sprint to see flow analysis data.
          </p>
        </div>
      )}
    </div>
  );
}; 