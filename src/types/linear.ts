export interface LinearIssue {
  id: string;
  title: string;
  status: string;
  velocity?: number;
  engineer?: string;
  estimate?: number;
  createdAt: string;
  completedAt?: string;
  updatedAt?: string;
  description?: string;
  priority?: number;
  identifier?: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
  } | null;
  state: {
    id: string;
    name: string;
    type: string;
  };
  team: LinearTeam;
  cycle?: LinearCycle;
  epic?: {
    id: string;
    name: string;
  } | null;
  parent?: {
    id: string;
    title: string;
  } | null;
}

export interface TeamMetrics {
  completedIssues: number;
  averageCycleTime: number;
  averageLeadTime: number;
  activeIssues: number;
  teamCapacity: number;
  utilization: number;
  velocity: number;
}

export interface LinearTeam {
  id: string;
  name: string;
  key?: string;
}

export interface LinearCycle {
  id: string;
  number: number;
  name: string;
  startsAt: string;
  endsAt: string;
  completedAt?: string;
  issueCountCompleted: number;
  issueCountActive: number;
  points: number;
  issueCount: number;
  scopeTarget: number;
} 