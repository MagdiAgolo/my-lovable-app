import React, { useState, useEffect } from 'react';
import { linearService } from '@/services/linearService';
import { LinearIssue } from '@/types/linear';
import { toast } from 'sonner';
import { AlertCircle, Info, Settings, X, RefreshCw, GitBranch, Tag, Clock, User, Filter, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TEXT = {
  title: 'Team Flow Board',
  configTitle: 'WIP Limits Configuration',
  columns: {
    todo: 'To Do',
    inProgress: 'In Progress',
    inReview: 'In Review',
    done: 'Done'
  },
  labels: {
    assignee: 'Assignee',
    points: 'Points',
    wipLimit: 'WIP Limit',
    wipExceeded: 'WIP limit exceeded',
    noIssues: 'No issues in this column',
    loading: 'Loading issues...',
    error: 'Error loading issues',
    save: 'Save',
    cancel: 'Cancel',
    configure: 'Configure WIP Limits',
    apply: 'Apply',
    refresh: 'Refresh',
    lastUpdated: 'Last updated',
    justNow: 'just now',
    minutesAgo: 'min ago',
    filterByAssignee: 'Filter by assignee',
    allAssignees: 'All assignees',
    unassigned: 'Unassigned',
    clearFilter: 'Clear filter'
  }
};

interface FlowBoardProps {
  teamId: string;
}

interface IssuesByStatus {
  todo: LinearIssue[];
  inProgress: LinearIssue[];
  inReview: LinearIssue[];
  done: LinearIssue[];
}

interface WipLimits {
  todo: number;
  inProgress: number;
  inReview: number;
  done: number;
}

export const FlowBoard: React.FC<FlowBoardProps> = ({ teamId }) => {
  const [issues, setIssues] = useState<IssuesByStatus>({
    todo: [],
    inProgress: [],
    inReview: [],
    done: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWipConfig, setShowWipConfig] = useState(false);
  const [wipLimits, setWipLimits] = useState<WipLimits>({
    todo: 10,
    inProgress: 5,
    inReview: 3,
    done: 0 // 0 means no limit
  });
  const [editableWipLimits, setEditableWipLimits] = useState<WipLimits>({ ...wipLimits });
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [allIssues, setAllIssues] = useState<LinearIssue[]>([]);

  // Fetch issues when teamId changes or on refresh
  useEffect(() => {
    if (!teamId) return;
    
    fetchIssues();
    
    // Set up polling for real-time updates
    const intervalId = setInterval(fetchIssues, 60000); // Refresh every 60 seconds
    
    return () => clearInterval(intervalId);
  }, [teamId]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch issues from Linear API
      const fetchedIssues = await linearService.getIssuesByTeam(teamId);
      setAllIssues(fetchedIssues);
      
      // Group issues by status
      const groupedIssues = groupIssuesByStatus(fetchedIssues);
      
      setIssues(groupedIssues);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching issues:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch issues');
      toast.error('Failed to load issues. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Group issues by status with optional assignee filtering
  const groupIssuesByStatus = (issuesList: LinearIssue[]): IssuesByStatus => {
    // Filter by assignee if selected
    const filteredIssues = selectedAssignee 
      ? issuesList.filter(issue => {
          if (selectedAssignee === 'unassigned') {
            return !issue.assignee;
          }
          return issue.assignee?.id === selectedAssignee;
        })
      : issuesList;
    
    const groupedIssues: IssuesByStatus = {
      todo: [],
      inProgress: [],
      inReview: [],
      done: []
    };
    
    filteredIssues.forEach(issue => {
      const state = issue.state?.name?.toLowerCase() || '';
      
      if (state.includes('backlog') || state.includes('to do') || state.includes('todo')) {
        groupedIssues.todo.push(issue);
      } else if (state.includes('in progress') || state.includes('doing')) {
        groupedIssues.inProgress.push(issue);
      } else if (state.includes('review') || state.includes('testing') || state.includes('qa')) {
        groupedIssues.inReview.push(issue);
      } else if (state.includes('done') || state.includes('complete') || 
                state.includes('merged') || state.includes('shipped') || 
                state.includes('delivered')) {
        groupedIssues.done.push(issue);
      } else {
        // Default to todo for unknown states
        groupedIssues.todo.push(issue);
      }
    });
    
    return groupedIssues;
  };

  // Effect to regroup issues when assignee filter changes
  useEffect(() => {
    if (allIssues.length > 0) {
      const groupedIssues = groupIssuesByStatus(allIssues);
      setIssues(groupedIssues);
    }
  }, [selectedAssignee, allIssues]);

  // Get unique assignees from all issues
  const getUniqueAssignees = () => {
    const assignees = new Map();
    
    allIssues.forEach(issue => {
      if (issue.assignee) {
        assignees.set(issue.assignee.id, issue.assignee);
      }
    });
    
    return Array.from(assignees.values());
  };

  // Handle assignee selection
  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedAssignee(value === "" ? null : value);
  };

  // Clear assignee filter
  const clearAssigneeFilter = () => {
    setSelectedAssignee(null);
  };

  const handleSaveWipLimits = () => {
    setWipLimits({ ...editableWipLimits });
    setShowWipConfig(false);
    toast.success('WIP limits updated');
  };

  const handleCancelWipConfig = () => {
    setEditableWipLimits({ ...wipLimits });
    setShowWipConfig(false);
  };

  const isWipLimitExceeded = (columnName: keyof IssuesByStatus) => {
    const limit = wipLimits[columnName];
    return limit > 0 && issues[columnName].length > limit;
  };

  const getTimeSince = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) {
      return TEXT.labels.justNow;
    }
    
    const minutes = Math.floor(seconds / 60);
    return `${minutes} ${TEXT.labels.minutesAgo}`;
  };

  // Column colors and icons for visual clarity
  const columnStyles = {
    todo: { 
      bgColor: 'bg-indigo-50', 
      borderColor: 'border-indigo-200',
      headerBg: 'bg-indigo-100',
      textColor: 'text-indigo-800',
      icon: () => <Tag className="h-4 w-4 mr-2 text-indigo-600" />
    },
    inProgress: { 
      bgColor: 'bg-blue-50', 
      borderColor: 'border-blue-200',
      headerBg: 'bg-blue-100',
      textColor: 'text-blue-800',
      icon: () => <Clock className="h-4 w-4 mr-2 text-blue-600" />
    },
    inReview: { 
      bgColor: 'bg-amber-50', 
      borderColor: 'border-amber-200',
      headerBg: 'bg-amber-100',
      textColor: 'text-amber-800',
      icon: () => <GitBranch className="h-4 w-4 mr-2 text-amber-600" />
    },
    done: { 
      bgColor: 'bg-green-50', 
      borderColor: 'border-green-200',
      headerBg: 'bg-green-100',
      textColor: 'text-green-800',
      icon: () => <AlertCircle className="h-4 w-4 mr-2 text-green-600" />
    }
  };

  const renderColumnHeader = (columnName: keyof IssuesByStatus, label: string) => {
    const exceeded = isWipLimitExceeded(columnName);
    const limit = wipLimits[columnName];
    const style = columnStyles[columnName];
    
    return (
      <div className={`flex items-center justify-between p-3 ${exceeded ? 'bg-red-100' : style.headerBg} rounded-t-lg border-b ${style.borderColor}`}>
        <div className="flex items-center">
          {style.icon()}
          <h3 className={`font-semibold ${exceeded ? 'text-red-700' : style.textColor}`}>
            {label}
          </h3>
          <span className="ml-2 text-sm bg-white bg-opacity-70 px-2 py-0.5 rounded-full font-medium">
            {issues[columnName].length}
          </span>
        </div>
        {limit > 0 && (
          <div className="flex items-center">
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${exceeded ? 'bg-red-200 text-red-800' : 'bg-white bg-opacity-50 text-gray-700'}`}>
              Limit: {limit}
            </span>
            {exceeded && (
              <AlertCircle className="ml-1 h-4 w-4 text-red-700" />
            )}
          </div>
        )}
      </div>
    );
  };

  const getStatusColor = (issue: LinearIssue) => {
    const state = issue.state?.name?.toLowerCase() || '';
    
    if (state.includes('block') || state.includes('blocker')) {
      return 'bg-red-500';
    } else if (state.includes('progress') || state.includes('doing')) {
      return 'bg-blue-500';
    } else if (state.includes('review')) {
      return 'bg-amber-500';
    } else if (state.includes('done') || state.includes('complete')) {
      return 'bg-green-500';
    } else {
      return 'bg-gray-500';
    }
  };

  const renderIssueCard = (issue: LinearIssue) => (
    <div 
      key={issue.id} 
      className="p-4 mb-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow hover:border-gray-300"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${getStatusColor(issue)}`}></div>
          <a 
            href={`https://linear.app/implicit/issue/${issue.identifier || issue.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 font-medium hover:text-blue-600 hover:underline"
          >
            {issue.identifier}
          </a>
        </div>
        {issue.estimate && (
          <div className="ml-2 flex-shrink-0 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-medium">
            {issue.estimate} pts
          </div>
        )}
      </div>
      
      <div className="font-medium text-sm text-gray-800 mb-3">{issue.title}</div>
      
      {issue.assignee && (
        <div className="flex items-center mt-2 text-xs text-gray-600">
          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-1.5 text-[10px] font-bold uppercase">
            {issue.assignee.name?.charAt(0) || '?'}
          </div>
          <span className="font-medium">{issue.assignee.name}</span>
        </div>
      )}
    </div>
  );

  const renderColumn = (columnName: keyof IssuesByStatus, label: string) => {
    const style = columnStyles[columnName];
    const isExceeded = isWipLimitExceeded(columnName);

    return (
      <div className={`flex-1 min-w-[280px] ${style.bgColor} rounded-lg shadow-sm overflow-hidden border ${isExceeded ? 'border-red-300' : style.borderColor}`}>
        {renderColumnHeader(columnName, label)}
        <div className="p-3 overflow-y-auto h-[calc(100%-48px)]">
          {issues[columnName].length > 0 ? (
            issues[columnName].map(renderIssueCard)
          ) : (
            <div className="flex flex-col items-center justify-center h-32 mt-4 text-sm text-gray-500 bg-white bg-opacity-50 rounded-lg border border-dashed border-gray-300">
              <p className="mb-1">{TEXT.labels.noIssues}</p>
              <p className="text-xs opacity-70">Drop items here</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderWipConfigPanel = () => (
    <div className="mb-6 p-5 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-lg font-semibold text-gray-800">{TEXT.configTitle}</h3>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleCancelWipConfig}
          className="implicit-btn black h-8 w-8 p-0 rounded-full"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(TEXT.columns).map(([key, label]) => {
          const columnKey = key as keyof WipLimits;
          const style = columnStyles[columnKey];
          
          return (
            <div key={key} className={`p-4 rounded-lg border ${style.borderColor} ${style.bgColor}`}>
              <label className={`text-sm font-medium block mb-2 ${style.textColor}`}>
                {style.icon()} {label} {TEXT.labels.wipLimit}
              </label>
              <input
                type="number"
                min="0"
                value={editableWipLimits[columnKey]}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  setEditableWipLimits(prev => ({
                    ...prev,
                    [key]: value
                  }));
                }}
                className="w-full px-3 py-2 border rounded-md text-sm bg-white"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                {columnKey === 'done' ? '0 = no limit' : ''}
              </p>
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-end mt-5 space-x-3">
        <Button 
          variant="outline" 
          onClick={handleCancelWipConfig}
          className="implicit-btn black px-4"
        >
          {TEXT.labels.cancel}
        </Button>
        <Button 
          onClick={handleSaveWipLimits}
          className="implicit-btn black px-4"
        >
          {TEXT.labels.apply}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="h-full">
      {/* Configuration Panel */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-5 gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">{TEXT.title}</h2>
          <div className="flex items-center text-xs text-gray-500">
            <Clock className="h-3 w-3 mr-1" />
            <span>{TEXT.labels.lastUpdated}: {getTimeSince(lastUpdated)}</span>
          </div>
        </div>
        <div className="flex space-x-3">
          {/* Assignee Filter */}
          <div className="relative flex items-center">
            <div className="relative">
              <select
                value={selectedAssignee || ""}
                onChange={handleAssigneeChange}
                className="pr-8 pl-8 py-2 text-sm appearance-none bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-w-[180px]"
                aria-label={TEXT.labels.filterByAssignee}
              >
                <option value="">{TEXT.labels.allAssignees}</option>
                <option value="unassigned">{TEXT.labels.unassigned}</option>
                {getUniqueAssignees().map(assignee => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.name}
                  </option>
                ))}
              </select>
              <Users className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <Filter className="h-3.5 w-3.5 text-gray-500" />
              </div>
            </div>
            
            {selectedAssignee && (
              <button 
                onClick={clearAssigneeFilter}
                className="ml-2 p-1 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700"
                aria-label={TEXT.labels.clearFilter}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowWipConfig(!showWipConfig)}
            className="implicit-btn black flex items-center gap-1.5 px-3 py-2 h-auto"
          >
            <Settings className="h-4 w-4" />
            {TEXT.labels.configure}
          </Button>
          
          <Button
            size="sm"
            onClick={fetchIssues}
            className="implicit-btn black flex items-center gap-1.5 px-3 py-2 h-auto"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {TEXT.labels.refresh}
          </Button>
        </div>
      </div>
      
      {/* Selected assignee indicator */}
      {selectedAssignee && (
        <div className="mb-5 p-2 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center">
          <User className="h-4 w-4 mr-2 text-indigo-600" />
          <span className="text-sm text-indigo-800 font-medium">
            {TEXT.labels.filterByAssignee}: {
              selectedAssignee === 'unassigned' 
                ? TEXT.labels.unassigned 
                : getUniqueAssignees().find(a => a.id === selectedAssignee)?.name
            }
          </span>
        </div>
      )}
      
      {/* WIP Configuration Panel */}
      {showWipConfig && renderWipConfigPanel()}
      
      {/* Error Message */}
      {error && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center">
          <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center h-12 mb-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            <span className="text-gray-600">{TEXT.labels.loading}</span>
          </div>
        </div>
      )}
      
      {/* Kanban Board */}
      <div className="flex space-x-5 h-[calc(100vh-220px)] overflow-x-auto pb-4">
        {renderColumn('todo', TEXT.columns.todo)}
        {renderColumn('inProgress', TEXT.columns.inProgress)}
        {renderColumn('inReview', TEXT.columns.inReview)}
        {renderColumn('done', TEXT.columns.done)}
      </div>
    </div>
  );
}; 