// services/linearService.ts
import { LinearIssue, LinearTeam, TeamMetrics, LinearCycle } from "@/types/linear";
import { apiConfig, getLinearApiKey } from "@/config/api-config";
import { toast } from "sonner";

// Maximum number of retry attempts for API requests
const MAX_RETRY_ATTEMPTS = 3;
// Base delay between retries in milliseconds (will be multiplied by attempt number)
const BASE_RETRY_DELAY = 1000;

// Linear API service implementation
export const linearService = {
  // Linear API base URL
  apiBaseUrl: "https://api.linear.app/graphql",
  
  // Utility function to check if an issue is completed
  isIssueCompleted(issue: any): boolean {
    // Check if the issue or state is missing
    if (!issue || !issue.state) return false;
    
    // Common done/completed state names (case insensitive)
    const doneStateNames = ['done', 'completed', 'merged', 'fixed', 'resolved', 'closed'];
    
    // 1. Check by state type
    const isCompletedType = issue.state.type === 'completed';
    
    // 2. Check by state name (full match or contains)
    const stateName = issue.state.name?.toLowerCase() || '';
    const isCompletedName = doneStateNames.some(name => 
      stateName === name || stateName.includes(name)
    );
    
    // 3. Check for completedAt date
    const hasCompletedDate = !!issue.completedAt;
    
    // Check if the issue is canceled or duplicate (these should be excluded)
    const isCanceled = 
      stateName.includes('cancel') ||
      stateName.includes('duplicate') ||
      issue.state.type === 'canceled';
    
    // Issue is completed if it's marked as completed and not canceled
    return (isCompletedType || isCompletedName || hasCompletedDate) && !isCanceled;
  },
  
  setApiKey(key: string) {
    apiConfig.linear.apiKey = key;
    console.log("API key set successfully");
  },

  async testConnection(): Promise<boolean> {
    const apiKey = getLinearApiKey();
    if (!apiKey) return false;

    try {
      console.log('Testing connection to Linear API...');
      const response = await fetch(this.apiBaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ query: '{ viewer { id } }' }),
      });

      console.log('Test response status:', response.status);
      const result = await response.json();
      console.log('Test response data:', result);

      if (result.errors) {
        console.error('GraphQL Errors:', result.errors);
        return false;
      }

      return !!result.data?.viewer?.id;
    } catch (error) {
      console.error('Connection test error:', error);
      return false;
    }
  },

  async executeGraphQL(query: string, variables?: Record<string, any>, retryAttempt = 0): Promise<any> {
    const apiKey = getLinearApiKey();
    
    if (!apiKey) {
      console.error("Linear API key not set");
      throw new Error("Linear API key not set. Please provide a valid API key.");
    }
    
    // Clean and validate API key
    const cleanKey = apiKey.replace(/^Bearer\s+/i, '').trim();
    console.log('API Key format:', cleanKey.substring(0, 8) + '...' + cleanKey.substring(cleanKey.length - 4));
    
    // Always use direct connection
    console.log(`Using direct connection to Linear API (attempt ${retryAttempt + 1})`);
    
    // Use the direct URL
    const targetUrl = this.apiBaseUrl;
    
    // Define headers for direct connection
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": cleanKey,
      "X-Requested-With": "XMLHttpRequest",
      "Origin": window.location.origin
    };

    console.log('Request headers:', {
      ...headers,
      Authorization: headers.Authorization.substring(0, 8) + '...' + headers.Authorization.substring(headers.Authorization.length - 4)
    });

    // Prepare request options
    const requestOptions = {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
      mode: 'cors' as RequestMode,
      credentials: 'omit' as RequestCredentials, 
      cache: 'no-cache' as RequestCache
    };

    try {
      // Implement exponential backoff for retries
      if (retryAttempt > 0) {
        const delay = Math.min(BASE_RETRY_DELAY * Math.pow(2, retryAttempt - 1), 8000);
        console.log(`Retry attempt ${retryAttempt}/${MAX_RETRY_ATTEMPTS}, waiting ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      console.log(`Making direct GraphQL request to Linear API (attempt ${retryAttempt + 1})`);
      console.log('Request body:', JSON.stringify({ query, variables }, null, 2));
      
      const response = await fetch(targetUrl, requestOptions);
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error ${response.status}:`, errorText);
        
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error("Invalid API key. Please check your Linear API key.");
        }
        if (response.status === 403) {
          throw new Error("Access denied. Please check your API key permissions.");
        }
        if (errorText.includes("Query too complex")) {
          throw new Error("Query too complex. Please reduce the amount of data requested or use pagination.");
        }
        
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
      
      if (data.errors) {
        console.error("GraphQL errors:", data.errors);
        const errorMessage = data.errors[0].message;
        if (errorMessage.includes("API key")) {
          throw new Error("Invalid API key. Please check your Linear API key.");
        }
        throw new Error(errorMessage);
      }

      // Validate response data
      if (!data || !data.data) {
        console.error("Invalid response format:", data);
        throw new Error("Invalid response format from Linear API");
      }

      // Return the data object directly
      return data.data;
    } 
    catch (error) {
      console.error(`Connection failed (attempt ${retryAttempt + 1}):`, error);
      
      // If we haven't exhausted our retry attempts, try again
      if (retryAttempt < MAX_RETRY_ATTEMPTS) {
        console.log(`Retrying request, attempt ${retryAttempt + 1} of ${MAX_RETRY_ATTEMPTS}`);
        return this.executeGraphQL(query, variables, retryAttempt + 1);
      }
      
      // If direct connection fails after all retries, silently try fallback proxies
      console.log("All direct connection attempts failed. Trying fallback proxies...");
      
      // Try each fallback proxy in sequence
      for (const fallbackProxy of apiConfig.linear.fallbackProxies) {
        try {
          console.log(`Trying fallback proxy: ${fallbackProxy}`);
          const fallbackUrl = `${fallbackProxy}${encodeURIComponent(targetUrl)}`;
          
          const fallbackResponse = await fetch(fallbackUrl, requestOptions);
          
          if (!fallbackResponse.ok) {
            console.error(`Fallback proxy failed with status: ${fallbackResponse.status}`);
            continue; // Try next fallback if this one fails
          }
          
          const fallbackData = await fallbackResponse.json();
          
          if (fallbackData.errors) {
            console.error('Fallback proxy GraphQL errors:', fallbackData.errors);
            continue; // Try next fallback if this one has GraphQL errors
          }

          // Validate fallback response data
          if (!fallbackData || !fallbackData.data) {
            console.error("Invalid fallback response format:", fallbackData);
            continue; // Try next fallback if response format is invalid
          }
          
          console.log("Fallback proxy connection successful");
          return fallbackData.data;
        } 
        catch (fallbackError) {
          // Continue to the next fallback
          console.error(`Fallback proxy failed:`, fallbackError);
        }
      }
      
      // If we get here, all connection methods failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Connection failed after ${MAX_RETRY_ATTEMPTS} attempts and all fallback proxies: ${errorMessage}`);
      toast.error(`Connection failed: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  },

  // Fetch teams with improved error handling
  async getTeams(): Promise<LinearTeam[]> {
    try {
      const apiKey = getLinearApiKey();
      if (!apiKey) {
        console.error("API key not set");
        toast.error("Please set your Linear API key first");
        return [];
      }

      console.log('Fetching teams from Linear API...');
      const query = `
        query Teams {
          teams {
            nodes {
              id
              name
              key
            }
          }
        }
      `;
      
      const response = await this.executeGraphQL(query);
      console.log("Teams response:", response);
      
      if (!response?.teams?.nodes) {
        console.error("Invalid teams response:", response);
        toast.error("Failed to fetch teams. Please check your API key permissions.");
        return [];
      }

      const teams = response.teams.nodes;
      if (teams.length === 0) {
        console.warn("No teams found in response");
        toast.error("No teams found. Please check your API key permissions.");
        return [];
      }

      console.log(`Found ${teams.length} teams:`, teams);
      return teams;
    } catch (error) {
      console.error("Error fetching teams:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes("API key")) {
        toast.error("Invalid API key. Please check your Linear API key.");
      } else if (errorMessage.includes("permission")) {
        toast.error("Permission denied. Please check your API key permissions.");
      } else {
        toast.error(`Failed to fetch teams: ${errorMessage}`);
      }
      
      return [];
    }
  },

  // Fetch issues for a team with enhanced New Architecture team support
  async getIssuesByTeam(teamId: string): Promise<LinearIssue[]> {
    // Validate teamId early
    if (!teamId) {
      console.error("No teamId provided to getIssuesByTeam");
      toast.error("No team selected. Please select a valid team.");
      return [];
    }

    console.log("Fetching issues for teamId:", teamId);
    
    try {
      // Check if this is the New Architecture team (needed for special handling)
      const isNewArchitectureTeam = await this.isNewArchitectureTeam(teamId);
      console.log(`Team ${teamId} is New Architecture team: ${isNewArchitectureTeam}`);
      
      // Enhanced GraphQL query to ensure we get complete issue data 
      // Increased limit from 100 to 250 to get more issues
      const query = `
        query IssuesByTeam($teamId: String!) {
          team(id: $teamId) {
            id
            name
            key
            issues(first: 250) {
              nodes {
                id
                title
                identifier
                estimate
                createdAt
                completedAt
                assignee {
                  id
                  name
                  email
                }
                cycle {
                  id
                  number
                  name
                  startsAt
                  endsAt
                }
                state {
                  id
                  name
                  type
                }
              }
            }
          }
        }
      `;
      
      console.log('Executing GraphQL query for team:', teamId);
      const response = await this.executeGraphQL(query, { teamId });
      
      // Additional validation
      if (!response) {
        throw new Error(`No response from Linear API for team ID: ${teamId}`);
      }
      
      if (!response.team) {
        console.error(`Team not found for ID: ${teamId}`);
        toast.error("Team not found. Please check your team ID and API key permissions.");
        return [];
      }

      if (!response.team.issues?.nodes) {
        console.warn(`No issues found for team ${teamId}`);
        return [];
      }

      const team = { 
        id: teamId, 
        name: response.team.name || '', 
        key: response.team.key || '' 
      };

      console.log(`Processing team: ${team.name} (${team.id})`);
      console.log(`Retrieved ${response.team.issues.nodes.length} issues from Linear API`);
      
      // Log all unique assignee names for debugging
      const uniqueAssignees = new Set<string>();
      response.team.issues.nodes.forEach((issue: any) => {
        if (issue.assignee?.name) {
          uniqueAssignees.add(issue.assignee.name);
        }
      });
      console.log('Unique assignee names in response:', Array.from(uniqueAssignees));
      
      // Count issues by cycle for debugging
      const cycleIssues = new Map<string, number>();
      response.team.issues.nodes.forEach((issue: any) => {
        if (issue.cycle) {
          const cycleId = issue.cycle.id;
          const cycleName = issue.cycle.name;
          const key = `${cycleName} (${cycleId})`;
          cycleIssues.set(key, (cycleIssues.get(key) || 0) + 1);
        }
      });
      console.log('Issues by cycle:', Object.fromEntries(cycleIssues.entries()));
      
      // Process issues from the response - DO NOT filter issues at this stage,
      // we'll do filtering when displaying/analyzing them
      const issues = response.team.issues.nodes.map((issue: any) => {
        // Store the engineer name with normalization
        const engineerName = issue.assignee?.name || null;
        
        // Log engineer name when it's specifically "fatma akram" to debug
        if (engineerName && engineerName.toLowerCase().includes('fatma')) {
          console.log('Found issue assigned to Fatma:', {
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            exactName: engineerName,
            cycleId: issue.cycle?.id,
            cycleName: issue.cycle?.name
          });
        }

        return {
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          estimate: issue.estimate,
          createdAt: issue.createdAt,
          completedAt: issue.completedAt,
          description: issue.description || '',
          priority: issue.priority || 0,
          assignee: issue.assignee || null,
          state: issue.state,
          team,
          cycle: issue.cycle,
          status: issue.state.name,
          engineer: engineerName
        };
      });
      
      console.log(`Total issues processed: ${issues.length}`);
      return issues;
    } catch (error) {
      console.error(`Error fetching issues for team ${teamId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes("API key")) {
        toast.error("Invalid API key. Please check your Linear API key.");
      } else if (errorMessage.includes("permission")) {
        toast.error("Permission denied. Please check your API key permissions.");
      } else if (errorMessage.includes("Entity not found: Team")) {
        toast.error(`Team with ID ${teamId} not found. It may not exist or you may not have access to it.`);
      } else if (errorMessage.includes("Query too complex")) {
        toast.error("Query too complex for Linear API. We'll use the default issue limit.");
        // Retry with a lower limit if the query was too complex
        return this.getIssuesByTeamWithLowerLimit(teamId);
      } else {
        toast.error(`Failed to fetch issues: ${errorMessage}`);
      }
      
      return [];
    }
  },
  
  // Fallback method with a lower limit if the original query is too complex
  async getIssuesByTeamWithLowerLimit(teamId: string): Promise<LinearIssue[]> {
    try {
      console.log("Retrying with lower limit for team:", teamId);
      
      // Simplified query with lower limit
      const query = `
        query IssuesByTeam($teamId: String!) {
          team(id: $teamId) {
            id
            name
            key
            issues(first: 100) {
              nodes {
                id
                title
                identifier
                estimate
                createdAt
                completedAt
                assignee {
                  id
                  name
                  email
                }
                cycle {
                  id
                  number
                  name
                  startsAt
                  endsAt
                }
                state {
                  id
                  name
                  type
                }
              }
            }
          }
        }
      `;
      
      const response = await this.executeGraphQL(query, { teamId });
      
      if (!response || !response.team || !response.team.issues?.nodes) {
        return [];
      }
      
      const team = { 
        id: teamId, 
        name: response.team.name || '', 
        key: response.team.key || '' 
      };
      
      // Process issues with minimal transformation
      return response.team.issues.nodes.map((issue: any) => ({
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        estimate: issue.estimate,
        createdAt: issue.createdAt,
        completedAt: issue.completedAt,
        description: issue.description || '',
        priority: issue.priority || 0,
        assignee: issue.assignee || null,
        state: issue.state,
        team,
        cycle: issue.cycle,
        status: issue.state?.name,
        engineer: issue.assignee?.name || null
      }));
    } catch (error) {
      console.error("Error in fallback query:", error);
      return [];
    }
  },

  // Utility method to check if a team is the New Architecture team
  async isNewArchitectureTeam(teamId: string): Promise<boolean> {
    try {
      const query = `
        query TeamName($teamId: String!) {
          team(id: $teamId) {
            id
            name
          }
        }
      `;
      
      const response = await this.executeGraphQL(query, { teamId });
      return response?.team?.name === "New Architecture";
    } catch (error) {
      console.error("Error checking team name:", error);
      return false;
    }
  },

  // Get team metrics with improved error handling
  async getTeamMetrics(teamId: string): Promise<TeamMetrics> {
    console.log(`Calculating metrics for team ${teamId}`);
    
    try {
      // Get issues and cycles for this team
      const [issues, cycles] = await Promise.all([
        this.getIssuesByTeam(teamId),
        this.getTeamCycles(teamId)
      ]);
      
      // Default metrics in case of error or no data
      const defaultMetrics: TeamMetrics = {
        completedIssues: 0,
        averageCycleTime: 0,
        averageLeadTime: 0,
        activeIssues: 0,
        teamCapacity: 25,
        utilization: 0,
        velocity: 0
      };
      
      if (!issues || issues.length === 0) {
        console.warn("No issues found for metrics calculation");
        return defaultMetrics;
      }

      // Calculate velocity as sum of estimates for completed issues in the current cycle
      const currentCycle = cycles && cycles.length > 0 ? cycles[0] : null;
      const completedIssues = issues.filter(issue => {
        // Check if the issue is in the current cycle (if applicable)
        if (currentCycle && issue.cycle?.id !== currentCycle.id) return false;
        
        // Check if the issue is completed using improved completion checks
        const isCompleted = this.isIssueCompleted(issue);
        
        // Check if the issue is canceled or duplicate
        const isCanceled = 
          issue.state?.name?.toLowerCase().includes('cancel') ||
          issue.state?.name?.toLowerCase().includes('duplicate') ||
          issue.state?.type === 'canceled';
        
        return isCompleted && !isCanceled;
      });

      const velocity = completedIssues.reduce((sum, issue) => sum + (issue.estimate || 0), 0);
      console.log(`Calculated velocity: ${velocity} points from ${completedIssues.length} completed issues`);
      
      // Calculate other metrics
      const activeIssues = issues.filter(issue => 
        issue.state?.type === 'started' || issue.state?.type === 'unstarted'
      ).length;
      
      // Calculate cycle times for completed issues
      const cycleTimes = completedIssues
        .filter(issue => issue.createdAt && issue.completedAt)
        .map(issue => {
          const created = new Date(issue.createdAt);
          const completed = new Date(issue.completedAt!);
          return (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // in days
        });
      
      const averageCycleTime = cycleTimes.length > 0 
        ? cycleTimes.reduce((sum, time) => sum + time, 0) / cycleTimes.length 
        : 0;
      
      // For lead time (approximation)
      const averageLeadTime = averageCycleTime * 1.2;
      
      // Estimated team capacity based on completed issues
      const teamCapacity = Math.max(25, completedIssues.length + 5);
      
      // Utilization calculation
      const utilization = activeIssues > 0 ? 
        (activeIssues / teamCapacity) * 100 : 0;
      
      return {
        completedIssues: completedIssues.length,
        averageCycleTime,
        averageLeadTime,
        activeIssues,
        teamCapacity,
        utilization,
        velocity
      };
    } catch (error) {
      console.error(`Error calculating metrics for team ${teamId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes("API key")) {
        toast.error("Invalid API key. Please check your Linear API key.");
      } else if (errorMessage.includes("permission")) {
        toast.error("Permission denied. Please check your API key permissions.");
      } else {
        toast.error(`Failed to calculate metrics: ${errorMessage}`);
      }
      
      return {
        completedIssues: 0,
        averageCycleTime: 0,
        averageLeadTime: 0,
        activeIssues: 0,
        teamCapacity: 25,
        utilization: 0,
        velocity: 0
      };
    }
  },

  // Add new method to get velocity for a specific cycle
  async getCycleVelocity(teamId: string, cycleId: string): Promise<number> {
    try {
      const issues = await this.getIssuesByTeam(teamId);
      
      // Filter for completed issues in the specified cycle using improved completion checks
      const completedIssues = issues.filter(issue => {
        // Check if the issue is in the specified cycle
        if (issue.cycle?.id !== cycleId) return false;
        
        // Check if the issue is completed using improved completion checks
        const isCompleted = this.isIssueCompleted(issue);
        
        // Check if the issue is canceled or duplicate
        const isCanceled = 
          issue.state?.name?.toLowerCase().includes('cancel') ||
          issue.state?.name?.toLowerCase().includes('duplicate') ||
          issue.state?.type === 'canceled';
        
        return isCompleted && !isCanceled;
      });

      // Calculate velocity as sum of estimates
      const velocity = completedIssues.reduce((sum, issue) => sum + (issue.estimate || 0), 0);
      console.log(`Calculated velocity for cycle ${cycleId}: ${velocity} points from ${completedIssues.length} completed issues`);
      
      return velocity;
    } catch (error) {
      console.error(`Error calculating velocity for cycle ${cycleId}:`, error);
      return 0;
    }
  },

  // Fetch all cycles/sprints with enhanced New Architecture team support
  async getTeamCycles(teamId: string): Promise<LinearCycle[]> {
    // Validate teamId early
    if (!teamId) {
      console.error("No teamId provided to getTeamCycles");
      toast.error("No team selected. Please select a valid team.");
      return [];
    }

    console.log("Fetching cycles for teamId:", teamId);
    
    try {
      console.log(`Fetching cycles for team ${teamId}`);
      
      const query = `
        query GetTeamCycles($teamId: String!) {
          team(id: $teamId) {
            cycles(first: 50) {
              nodes {
                id
                name
                number
                startsAt
                endsAt
                issues {
                  nodes {
                    id
                    state {
                      type
                      name
                    }
                    estimate
                  }
                }
              }
            }
          }
        }
      `;

      const response = await this.executeGraphQL(query, { teamId });
      
      // Additional validation
      if (!response) {
        throw new Error(`No response from Linear API for team ID: ${teamId}`);
      }

      if (!response.team) {
        console.error(`Team not found for ID ${teamId}`);
        toast.error("Team not found. Please check your team ID and API key permissions.");
        return [];
      }

      if (!response.team.cycles?.nodes) {
        console.warn(`No cycles found for team ${teamId}`);
        return [];
      }

      // Process cycles - calculate points from actual completed issues without scaling
      const filteredCycles = response.team.cycles.nodes
        .map((cycle: { id: string; name: string; number: number; startsAt: string; endsAt: string; issues: { nodes: Array<{ state: { type: string; name: string }; estimate: number }> } }) => {
          // Get all completed issues for this cycle, excluding canceled or duplicate issues
          const completedIssues = cycle.issues.nodes.filter(issue => {
            const isCompleted = this.isIssueCompleted(issue);
            
            const isCanceled = 
              issue.state.name.toLowerCase().includes('cancel') ||
              issue.state.name.toLowerCase().includes('duplicate') ||
              issue.state.type === 'canceled';
              
            return isCompleted && !isCanceled;
          });
          
          // Calculate total points by summing up estimates of all completed issues
          const totalPoints = completedIssues.reduce((sum: number, issue) => {
            return sum + (issue.estimate || 0);
          }, 0);
          
          console.log(`Cycle ${cycle.name}: ${completedIssues.length} completed issues, ${totalPoints} total points`);
          
          return {
            id: cycle.id,
            name: cycle.name,
            number: cycle.number,
            startsAt: cycle.startsAt,
            endsAt: cycle.endsAt,
            points: totalPoints
          };
        })
        .sort((a: LinearCycle, b: LinearCycle) => b.number - a.number);

      console.log(`Found ${filteredCycles.length} cycles with calculated points`);
      return filteredCycles;
    } catch (error) {
      console.error(`Error fetching cycles for team ${teamId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes("API key")) {
        toast.error("Invalid API key. Please check your Linear API key.");
      } else if (errorMessage.includes("permission")) {
        toast.error("Permission denied. Please check your API key permissions.");
      } else if (errorMessage.includes("Entity not found: Team")) {
        toast.error(`Team with ID ${teamId} not found. It may not exist or you may not have access to it.`);
      } else {
        toast.error(`Failed to fetch cycles: ${errorMessage}`);
      }
      
      return [];
    }
  },
  
  // Add new method to fetch issues for a specific cycle
  async getCycleIssues(teamId: string, cycleId: string): Promise<LinearIssue[]> {
    try {
      console.log(`Fetching issues for cycle ${cycleId} in team ${teamId}`);
      
      // Updated query with correct type for cycleId (ID instead of String!)
      const query = `
        query CycleIssues($teamId: String!, $cycleId: ID!) {
          team(id: $teamId) {
            id
            name
            key
            issues(
              filter: {
                cycle: { id: { eq: $cycleId } }
              },
              first: 100
            ) {
              nodes {
                id
                title
                estimate
                createdAt
                completedAt
                assignee {
                  id
                  name
                  email
                }
                cycle {
                  id
                  number
                  name
                }
                state {
                  id
                  name
                  type
                }
              }
            }
          }
        }
      `;
      
      const response = await this.executeGraphQL(query, { teamId, cycleId });
      
      if (!response?.team?.issues?.nodes) {
        console.warn(`No issues found for cycle ${cycleId} in team ${teamId}`);
        return [];
      }
      
      const team = { 
        id: teamId, 
        name: response.team.name || '', 
        key: response.team.key || '' 
      };
      
      const issues = response.team.issues.nodes.map((issue: any) => ({
        id: issue.id,
        title: issue.title,
        estimate: issue.estimate,
        createdAt: issue.createdAt,
        completedAt: issue.completedAt,
        description: issue.description || '',
        priority: issue.priority || 0,
        assignee: issue.assignee || null,
        state: issue.state,
        team,
        cycle: issue.cycle
      }));
      
      console.log(`Found ${issues.length} issues for cycle ${cycleId}`);
      return issues;
      
    } catch (error) {
      console.error(`Error fetching issues for cycle ${cycleId}:`, error);
      toast.error(`Failed to fetch cycle issues: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  },

  // Add new method to fetch issues for a specific cycle and assignee
  async getIssuesByCycleAndAssignee(teamId: string, cycleId: string, assigneeName?: string): Promise<LinearIssue[]> {
    try {
      console.log(`Fetching issues for cycle ${cycleId} in team ${teamId}${assigneeName ? ` assigned to ${assigneeName}` : ''}`);
      
      // Build filter part
      let filterPart = `{ cycle: { id: { eq: $cycleId } }`;
      
      // Only add assignee filter if provided - use client-side filtering for assignment
      // instead of API filtering to avoid case-sensitivity issues
      
      filterPart += ' }';
      
      // Updated query with correct type for cycleId and optional assignee
      // Increased limit from 100 to 250 for more comprehensive results
      const query = `
        query IssuesByCycleAndAssignee($teamId: String!, $cycleId: ID!) {
          team(id: $teamId) {
            id
            name
            key
            issues(
              filter: ${filterPart},
              first: 250
            ) {
              nodes {
                id
                title
                identifier
                estimate
                createdAt
                completedAt
                assignee {
                  id
                  name
                  email
                }
                cycle {
                  id
                  number
                  name
                  startsAt
                  endsAt
                }
                state {
                  id
                  name
                  type
                }
              }
            }
          }
        }
      `;
      
      const variables: Record<string, any> = { teamId, cycleId };
      
      const response = await this.executeGraphQL(query, variables);
      
      if (!response?.team?.issues?.nodes) {
        console.warn(`No issues found for cycle ${cycleId} in team ${teamId}`);
        return [];
      }
      
      const team = { 
        id: teamId, 
        name: response.team.name || '', 
        key: response.team.key || '' 
      };
      
      console.log(`Retrieved ${response.team.issues.nodes.length} issues from Linear API for cycle ${cycleId}`);
      
      // Create an array of all issues - do not filter at this stage
      let issues = response.team.issues.nodes.map((issue: any) => {
        const engineerName = issue.assignee?.name || null;
        
        // Debug log for issues assigned to Fatma
        if (engineerName && engineerName.toLowerCase().includes('fatma')) {
          console.log('Found cycle issue assigned to Fatma:', {
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            exactName: engineerName,
            cycleId: issue.cycle?.id,
            cycleName: issue.cycle?.name,
            state: issue.state?.name
          });
        }
        
        return {
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          estimate: issue.estimate,
          createdAt: issue.createdAt,
          completedAt: issue.completedAt,
          description: issue.description || '',
          priority: issue.priority || 0,
          assignee: issue.assignee || null,
          state: issue.state,
          team,
          cycle: issue.cycle,
          status: issue.state.name,
          engineer: engineerName
        };
      });
      
      // Count issues by status for debugging
      const issuesByStatus = new Map<string, number>();
      issues.forEach((issue: LinearIssue) => {
        const status = issue.state?.name || 'Unknown';
        issuesByStatus.set(status, (issuesByStatus.get(status) || 0) + 1);
      });
      console.log('Issues by status:', Object.fromEntries(issuesByStatus.entries()));
      
      // If assignee name is provided, filter the issues client-side
      if (assigneeName) {
        const lowerCaseAssigneeName = assigneeName.toLowerCase();
        const unfilteredCount = issues.length;
        
        // Filter issues by assignee name (case-insensitive)
        issues = issues.filter((issue: LinearIssue) => 
          issue.engineer && issue.engineer.toLowerCase() === lowerCaseAssigneeName
        );
        
        console.log(`Filtered for assignee "${assigneeName}": ${issues.length} issues match out of ${unfilteredCount}`);
      }
      
      console.log(`Found ${issues.length} issues for cycle ${cycleId}${assigneeName ? ` assigned to ${assigneeName}` : ''}`);
      return issues;
      
    } catch (error) {
      console.error(`Error fetching issues for cycle ${cycleId}:`, error);
      
      // Try with a lower limit if the query was too complex
      if (error instanceof Error && error.message.includes("Query too complex")) {
        console.log("Query too complex. Retrying with lower limit...");
        return this.getIssuesByCycleAndAssigneeWithLowerLimit(teamId, cycleId, assigneeName);
      }
      
      toast.error(`Failed to fetch cycle issues: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  },
  
  // Fallback method with a lower limit if the original query is too complex
  async getIssuesByCycleAndAssigneeWithLowerLimit(teamId: string, cycleId: string, assigneeName?: string): Promise<LinearIssue[]> {
    try {
      console.log(`Retrying with lower limit for cycle ${cycleId} in team ${teamId}`);
      
      // Build filter part
      let filterPart = `{ cycle: { id: { eq: $cycleId } } }`;
      
      // Simplified query with lower limit
      const query = `
        query IssuesByCycleAndAssignee($teamId: String!, $cycleId: ID!) {
          team(id: $teamId) {
            id
            name
            key
            issues(
              filter: ${filterPart},
              first: 100
            ) {
              nodes {
                id
                title
                identifier
                estimate
                createdAt
                completedAt
                assignee {
                  id
                  name
                  email
                }
                cycle {
                  id
                  number
                  name
                  startsAt
                  endsAt
                }
                state {
                  id
                  name
                  type
                }
              }
            }
          }
        }
      `;
      
      const response = await this.executeGraphQL(query, { teamId, cycleId });
      
      if (!response?.team?.issues?.nodes) {
        return [];
      }
      
      const team = { 
        id: teamId, 
        name: response.team.name || '', 
        key: response.team.key || '' 
      };
      
      // Create an array of all issues with minimal transformation
      let issues = response.team.issues.nodes.map((issue: any) => ({
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        estimate: issue.estimate,
        createdAt: issue.createdAt,
        completedAt: issue.completedAt,
        description: issue.description || '',
        priority: issue.priority || 0,
        assignee: issue.assignee || null,
        state: issue.state,
        team,
        cycle: issue.cycle,
        status: issue.state?.name,
        engineer: issue.assignee?.name || null
      }));
      
      // If assignee name is provided, filter the issues client-side
      if (assigneeName) {
        const lowerCaseAssigneeName = assigneeName.toLowerCase();
        issues = issues.filter((issue: LinearIssue) => 
          issue.engineer && issue.engineer.toLowerCase() === lowerCaseAssigneeName
        );
      }
      
      console.log(`Found ${issues.length} issues with fallback query`);
      return issues;
    } catch (error) {
      console.error("Error in fallback query:", error);
      return [];
    }
  }
};