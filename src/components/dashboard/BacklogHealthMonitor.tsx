import React, { useState, useEffect } from 'react';
import { linearService } from '@/services/linearService';
import { LinearIssue } from '@/types/linear';
import { toast } from 'sonner';
import { 
  AlertCircle, PieChart, LineChart, ListFilter, RefreshCw, Calendar, 
  AlertTriangle, Clock, CheckCircle, Link2, AlertOctagon, 
  UserX, FileWarning, ChevronDown, ChevronRight, ExternalLink,
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, Pie } from 'recharts';

const TEXT = {
  title: 'Backlog Health Monitor',
  subtitle: 'Analyze and track the health of your team\'s backlog',
  metrics: {
    ageDistribution: 'Backlog Age Distribution',
    estimationCoverage: 'Estimation Coverage',
    priority: 'Priority Distribution',
    refinementStatus: 'Refinement Status'
  },
  issueCategories: {
    orphaned: '🔗 Orphaned issues',
    stalled: '🛑 Stalled tickets',
    unassigned: '🙅 Unassigned stories',
    inconsistent: '⚠️ Inconsistent status fields',
    noProject: '📁 No Project Issues'
  },
  descriptions: {
    orphaned: 'Issues not linked to an Epic',
    stalled: 'Issues inactive for too long (>21 days)',
    unassigned: 'Issues with no assignee',
    inconsistent: 'Issues with status mismatch (e.g., closed but not marked Done)',
    noProject: 'Issues not associated with any project'
  },
  labels: {
    loading: 'Loading backlog data...',
    error: 'Error loading backlog data',
    refresh: 'Refresh',
    days: 'days',
    lastUpdated: 'Last updated',
    estimated: 'Estimated',
    notEstimated: 'Not Estimated',
    highPriority: 'High Priority',
    mediumPriority: 'Medium Priority',
    lowPriority: 'Low Priority',
    noPriority: 'No Priority',
    refined: 'Refined',
    needsRefinement: 'Needs Refinement',
    blocked: 'Blocked',
    total: 'Total',
    backlogItems: 'Backlog Items',
    backlogAgeTitle: 'Backlog Age',
    priorityTitle: 'Priority',
    oldestIssue: 'Oldest Issue',
    averageAge: 'Average Age',
    healthScore: 'Overall Health Score',
    backlogItemsEstimated: 'Backlog Items Estimated',
    backlogItemsRefined: 'Backlog Items Refined',
    viewInLinear: 'View in Linear',
    daysStale: 'days stale',
    noAssignee: 'No assignee',
    inconsistentStatus: 'Status inconsistency',
    noIssuesFound: 'No issues found in this category',
    stateVsCompletion: 'State vs Completion mismatch',
    showAll: 'Show all',
    hideAll: 'Hide all',
    noProject: 'No project assigned',
    healthScores: {
      excellent: 'Excellent',
      good: 'Good',
      fair: 'Fair',
      poor: 'Poor',
      critical: 'Critical'
    }
  }
};

interface BacklogHealthMonitorProps {
  teamId: string;
}

interface BacklogMetrics {
  totalIssues: number;
  estimatedIssues: number;
  refinedIssues: number;
  blockedIssues: number;
  ageDistribution: {
    lessThan7Days: number;
    between7And30Days: number;
    between30And90Days: number;
    moreThan90Days: number;
  };
  priorities: {
    high: number;
    medium: number;
    low: number;
    none: number;
  };
  oldestIssueAge: number;
  averageAge: number;
  healthScore: number;
}

interface IssuesByHealth {
  orphaned: LinearIssue[];
  stalled: LinearIssue[];
  unassigned: LinearIssue[];
  inconsistent: LinearIssue[];
  noProject: LinearIssue[];
}

const DEFAULT_METRICS: BacklogMetrics = {
  totalIssues: 0,
  estimatedIssues: 0,
  refinedIssues: 0,
  blockedIssues: 0,
  ageDistribution: {
    lessThan7Days: 0,
    between7And30Days: 0,
    between30And90Days: 0,
    moreThan90Days: 0
  },
  priorities: {
    high: 0,
    medium: 0,
    low: 0,
    none: 0
  },
  oldestIssueAge: 0,
  averageAge: 0,
  healthScore: 0
};

export const BacklogHealthMonitor: React.FC<BacklogHealthMonitorProps> = ({ teamId }) => {
  const [backlogIssues, setBacklogIssues] = useState<LinearIssue[]>([]);
  const [metrics, setMetrics] = useState<BacklogMetrics>(DEFAULT_METRICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [healthIssues, setHealthIssues] = useState<IssuesByHealth>({
    orphaned: [],
    stalled: [],
    unassigned: [],
    inconsistent: [],
    noProject: []
  });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    orphaned: true,
    stalled: true,
    unassigned: true,
    inconsistent: true,
    noProject: true
  });

  // Fetch backlog issues when teamId changes
  useEffect(() => {
    if (!teamId) return;
    fetchBacklogData();
  }, [teamId]);

  const fetchBacklogData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch issues from Linear API
      const allIssues = await linearService.getIssuesByTeam(teamId);
      
      // Filter to only include backlog issues (not done, canceled, etc.)
      const backlogIssues = allIssues.filter(issue => {
        const state = issue.state?.name?.toLowerCase() || '';
        return !state.includes('done') && 
               !state.includes('complete') && 
               !state.includes('canceled') &&
               !state.includes('duplicate');
      });
      
      setBacklogIssues(backlogIssues);
      calculateMetrics(backlogIssues);
      analyzeIssueHealth(allIssues); // Analyze all issues, not just backlog
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching backlog data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch backlog data');
      toast.error('Failed to load backlog data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (issues: LinearIssue[]) => {
    if (!issues.length) {
      setMetrics(DEFAULT_METRICS);
      return;
    }
    
    const now = new Date();
    let totalAgeInDays = 0;
    let oldestIssueAge = 0;
    
    // Count metrics
    const metrics: BacklogMetrics = {
      totalIssues: issues.length,
      estimatedIssues: 0,
      refinedIssues: 0,
      blockedIssues: 0,
      ageDistribution: {
        lessThan7Days: 0,
        between7And30Days: 0,
        between30And90Days: 0,
        moreThan90Days: 0
      },
      priorities: {
        high: 0,
        medium: 0,
        low: 0,
        none: 0
      },
      oldestIssueAge: 0,
      averageAge: 0,
      healthScore: 0
    };
    
    issues.forEach(issue => {
      // Check if estimated
      if (issue.estimate && issue.estimate > 0) {
        metrics.estimatedIssues++;
      }
      
      // Check if refined (has description with more than 50 chars)
      if (issue.description && issue.description.length > 50) {
        metrics.refinedIssues++;
      }
      
      // Check if blocked
      const state = issue.state?.name?.toLowerCase() || '';
      if (state.includes('block')) {
        metrics.blockedIssues++;
      }
      
      // Calculate age
      if (issue.createdAt) {
        const createdDate = new Date(issue.createdAt);
        const ageInDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        
        totalAgeInDays += ageInDays;
        
        // Track oldest issue
        if (ageInDays > oldestIssueAge) {
          oldestIssueAge = ageInDays;
        }
        
        // Age distribution
        if (ageInDays < 7) {
          metrics.ageDistribution.lessThan7Days++;
        } else if (ageInDays < 30) {
          metrics.ageDistribution.between7And30Days++;
        } else if (ageInDays < 90) {
          metrics.ageDistribution.between30And90Days++;
        } else {
          metrics.ageDistribution.moreThan90Days++;
        }
      }
      
      // Priority distribution
      const priority = issue.priority;
      if (priority === 1) {
        metrics.priorities.high++;
      } else if (priority === 2) {
        metrics.priorities.medium++;
      } else if (priority === 3) {
        metrics.priorities.low++;
      } else {
        metrics.priorities.none++;
      }
    });
    
    // Calculate averages and final metrics
    metrics.oldestIssueAge = oldestIssueAge;
    metrics.averageAge = totalAgeInDays / issues.length;
    
    // Calculate health score (0-100)
    const estimationScore = (metrics.estimatedIssues / metrics.totalIssues) * 25;
    const refinementScore = (metrics.refinedIssues / metrics.totalIssues) * 25;
    const ageScore = Math.max(0, 25 - (metrics.ageDistribution.moreThan90Days / metrics.totalIssues) * 50);
    const priorityScore = (metrics.priorities.high + metrics.priorities.medium) / metrics.totalIssues * 25;
    
    metrics.healthScore = Math.round(estimationScore + refinementScore + ageScore + priorityScore);
    
    setMetrics(metrics);
  };

  // Analyze issue health categories
  const analyzeIssueHealth = (issues: LinearIssue[]) => {
    if (!issues.length) {
      setHealthIssues({
        orphaned: [],
        stalled: [],
        unassigned: [],
        inconsistent: [],
        noProject: []
      });
      return;
    }

    const now = new Date();
    const twentyOneDaysAgo = new Date(now);
    twentyOneDaysAgo.setDate(twentyOneDaysAgo.getDate() - 21);

    // 1. Find orphaned issues (not linked to an Epic)
    const orphanedIssues = issues.filter(issue => {
      return !issue.epic && issue.state?.type !== 'completed' && issue.state?.type !== 'canceled';
    });

    // 2. Find stalled tickets (not updated in more than 21 days)
    const stalledIssues = issues.filter(issue => {
      if (issue.state?.type === 'completed' || issue.state?.type === 'canceled') {
        return false;
      }
      if (!issue.updatedAt) {
        return false;
      }
      const updatedDate = new Date(issue.updatedAt);
      return updatedDate < twentyOneDaysAgo;
    });

    // 3. Find unassigned stories
    const unassignedIssues = issues.filter(issue => {
      return !issue.assignee && 
             issue.state?.type !== 'completed' && 
             issue.state?.type !== 'canceled';
    });

    // 4. Find inconsistent status issues
    const inconsistentIssues = issues.filter(issue => {
      // Case 1: Status is "Done" but completedAt is null
      const isDoneWithoutCompletionDate = 
        (issue.state?.type === 'completed' || 
         (issue.state?.name?.toLowerCase() || '').includes('done') || 
         (issue.state?.name?.toLowerCase() || '').includes('complete')) && 
        !issue.completedAt;

      // Case 2: Status is not "Done" but completedAt is set
      const isNotDoneWithCompletionDate = 
        issue.state?.type !== 'completed' && 
        !(issue.state?.name?.toLowerCase() || '').includes('done') && 
        !(issue.state?.name?.toLowerCase() || '').includes('complete') && 
        issue.completedAt;

      return isDoneWithoutCompletionDate || isNotDoneWithCompletionDate;
    });

    // 5. Find issues without projects
    // Since there's no direct project field, we'll define issues without projects as:
    // - Active issues (not completed or canceled)
    // - Not in an epic (which would indicate it's part of a larger initiative)
    // - Not in a cycle (sprints are often tied to projects)
    const noProjectIssues = issues.filter(issue => {
      const isActive = issue.state?.type !== 'completed' && issue.state?.type !== 'canceled';
      const hasNoEpic = !issue.epic;
      const hasNoCycle = !issue.cycle;
      
      return isActive && hasNoEpic && hasNoCycle;
    });

    setHealthIssues({
      orphaned: orphanedIssues,
      stalled: stalledIssues,
      unassigned: unassignedIssues,
      inconsistent: inconsistentIssues,
      noProject: noProjectIssues
    });
  };

  const getHealthScoreLabel = (score: number) => {
    if (score >= 80) return TEXT.labels.healthScores.excellent;
    if (score >= 60) return TEXT.labels.healthScores.good;
    if (score >= 40) return TEXT.labels.healthScores.fair;
    if (score >= 20) return TEXT.labels.healthScores.poor;
    return TEXT.labels.healthScores.critical;
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 60) return '#0ea5e9'; // Blue
    if (score >= 40) return '#f59e0b'; // Amber
    if (score >= 20) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  // Format data for charts
  const ageDistributionData = [
    { name: '< 7 days', value: metrics.ageDistribution.lessThan7Days, color: '#10b981' },
    { name: '7-30 days', value: metrics.ageDistribution.between7And30Days, color: '#0ea5e9' },
    { name: '30-90 days', value: metrics.ageDistribution.between30And90Days, color: '#f59e0b' },
    { name: '> 90 days', value: metrics.ageDistribution.moreThan90Days, color: '#ef4444' },
  ];

  const estimationData = [
    { name: TEXT.labels.estimated, value: metrics.estimatedIssues, color: '#10b981' },
    { name: TEXT.labels.notEstimated, value: metrics.totalIssues - metrics.estimatedIssues, color: '#ef4444' },
  ];

  const priorityData = [
    { name: TEXT.labels.highPriority, value: metrics.priorities.high, color: '#ef4444' },
    { name: TEXT.labels.mediumPriority, value: metrics.priorities.medium, color: '#f59e0b' },
    { name: TEXT.labels.lowPriority, value: metrics.priorities.low, color: '#0ea5e9' },
    { name: TEXT.labels.noPriority, value: metrics.priorities.none, color: '#94a3b8' },
  ];

  const refinementData = [
    { name: TEXT.labels.refined, value: metrics.refinedIssues, color: '#10b981' },
    { name: TEXT.labels.needsRefinement, value: metrics.totalIssues - metrics.refinedIssues - metrics.blockedIssues, color: '#f59e0b' },
    { name: TEXT.labels.blocked, value: metrics.blockedIssues, color: '#ef4444' },
  ];

  // Calculate days since a date
  const getDaysSince = (dateString?: string) => {
    if (!dateString) return 0;
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Toggle expansion of a section
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Toggle all sections
  const toggleAllSections = (expanded: boolean) => {
    setExpandedSections({
      orphaned: expanded,
      stalled: expanded,
      unassigned: expanded,
      inconsistent: expanded,
      noProject: expanded
    });
  };

  // Render issue list for each category
  const renderIssueList = (issues: LinearIssue[], category: keyof IssuesByHealth) => {
    if (issues.length === 0) {
      return (
        <div className="p-4 text-gray-500 text-center italic">
          {TEXT.labels.noIssuesFound}
        </div>
      );
    }

    return (
      <div className="grid gap-2">
        {issues.map(issue => (
          <div key={issue.id} className="p-3 bg-white bg-opacity-5 rounded border border-gray-700 hover:border-gray-500">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{issue.identifier}</span>
                  <a 
                    href={`https://linear.app/issue/${issue.identifier}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    {TEXT.labels.viewInLinear}
                  </a>
                </div>
                <h4 className="text-sm font-medium mt-1">{issue.title}</h4>
                
                {/* Category-specific metadata */}
                <div className="mt-2 text-xs">
                  {category === 'stalled' && (
                    <div className="flex items-center text-amber-400">
                      <Clock className="h-3 w-3 mr-1" />
                      {getDaysSince(issue.updatedAt)} {TEXT.labels.daysStale}
                    </div>
                  )}
                  
                  {category === 'orphaned' && (
                    <div className="flex items-center text-blue-400">
                      <Link2 className="h-3 w-3 mr-1" />
                      No epic linked
                    </div>
                  )}
                  
                  {category === 'unassigned' && (
                    <div className="flex items-center text-purple-400">
                      <UserX className="h-3 w-3 mr-1" />
                      {TEXT.labels.noAssignee}
                    </div>
                  )}
                  
                  {category === 'inconsistent' && (
                    <div className="flex items-center text-red-400">
                      <FileWarning className="h-3 w-3 mr-1" />
                      {TEXT.labels.stateVsCompletion}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-xs px-2 py-1 rounded bg-gray-800">
                {issue.state?.name || 'Unknown'}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render collapsible section
  const renderSection = (
    title: string, 
    description: string, 
    issues: LinearIssue[], 
    icon: React.ReactNode, 
    category: keyof IssuesByHealth
  ) => {
    const isExpanded = expandedSections[category];
    
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden mb-4">
        <div 
          className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-800"
          onClick={() => toggleSection(category)}
        >
          <div className="flex items-center gap-2">
            {icon}
            <div>
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="text-sm text-gray-400">{description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm px-2 py-1 rounded-full bg-gray-800">
              {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
            </span>
            {isExpanded ? 
              <ChevronDown className="h-4 w-4 text-gray-400" /> : 
              <ChevronRight className="h-4 w-4 text-gray-400" />
            }
          </div>
        </div>
        
        {isExpanded && (
          <div className="p-4 border-t border-gray-800 bg-gray-950">
            {renderIssueList(issues, category)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-semibold">{TEXT.title}</h2>
          <p className="text-sm text-gray-500">{TEXT.subtitle}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-500">
            {TEXT.labels.lastUpdated}: {lastUpdated.toLocaleTimeString()}
          </div>
          
          <Button
            size="sm"
            onClick={fetchBacklogData}
            className="implicit-btn black"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {TEXT.labels.refresh}
          </Button>
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center">
          <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center h-16 mb-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            <span className="text-gray-600">{TEXT.labels.loading}</span>
          </div>
        </div>
      )}
      
      {/* Health Issue Sections */}
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-semibold">Issue Health Analysis</h3>
        <div className="flex gap-2">
          <Button 
            size="sm"
            onClick={() => toggleAllSections(true)}
            className="implicit-btn black"
          >
            {TEXT.labels.showAll}
          </Button>
          <Button 
            size="sm"
            onClick={() => toggleAllSections(false)}
            className="implicit-btn black"
          >
            {TEXT.labels.hideAll}
          </Button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 shadow-sm">
          <div className="flex items-center mb-2">
            <Link2 className="h-5 w-5 mr-2 text-blue-500" />
            <h3 className="font-semibold text-white">Orphaned Issues</h3>
          </div>
          <p className="text-3xl font-bold text-white">{healthIssues.orphaned.length}</p>
        </div>
        
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 shadow-sm">
          <div className="flex items-center mb-2">
            <AlertOctagon className="h-5 w-5 mr-2 text-red-500" />
            <h3 className="font-semibold text-white">Stalled Tickets</h3>
          </div>
          <p className="text-3xl font-bold text-white">{healthIssues.stalled.length}</p>
        </div>
        
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 shadow-sm">
          <div className="flex items-center mb-2">
            <UserX className="h-5 w-5 mr-2 text-purple-500" />
            <h3 className="font-semibold text-white">Unassigned Stories</h3>
          </div>
          <p className="text-3xl font-bold text-white">{healthIssues.unassigned.length}</p>
        </div>
        
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 shadow-sm">
          <div className="flex items-center mb-2">
            <FileWarning className="h-5 w-5 mr-2 text-yellow-500" />
            <h3 className="font-semibold text-white">Inconsistent Status</h3>
          </div>
          <p className="text-3xl font-bold text-white">{healthIssues.inconsistent.length}</p>
        </div>
        
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 shadow-sm">
          <div className="flex items-center mb-2">
            <Briefcase className="h-5 w-5 mr-2 text-green-500" />
            <h3 className="font-semibold text-white">No Project</h3>
          </div>
          <p className="text-3xl font-bold text-white">{healthIssues.noProject.length}</p>
        </div>
      </div>
      
      {/* Orphaned Issues Section */}
      {renderSection(
        TEXT.issueCategories.orphaned,
        TEXT.descriptions.orphaned,
        healthIssues.orphaned,
        <Link2 className="h-5 w-5 text-blue-500" />,
        'orphaned'
      )}
      
      {/* Stalled Tickets Section */}
      {renderSection(
        TEXT.issueCategories.stalled,
        TEXT.descriptions.stalled,
        healthIssues.stalled,
        <AlertOctagon className="h-5 w-5 text-red-500" />,
        'stalled'
      )}
      
      {/* Unassigned Stories Section */}
      {renderSection(
        TEXT.issueCategories.unassigned,
        TEXT.descriptions.unassigned,
        healthIssues.unassigned,
        <UserX className="h-5 w-5 text-purple-500" />,
        'unassigned'
      )}
      
      {/* Inconsistent Status Section */}
      {renderSection(
        TEXT.issueCategories.inconsistent,
        TEXT.descriptions.inconsistent,
        healthIssues.inconsistent,
        <FileWarning className="h-5 w-5 text-yellow-500" />,
        'inconsistent'
      )}
      
      {/* No Project Issues Section */}
      {renderSection(
        TEXT.issueCategories.noProject,
        TEXT.descriptions.noProject,
        healthIssues.noProject,
        <Briefcase className="h-5 w-5 text-green-500" />,
        'noProject'
      )}
    </div>
  );
}; 