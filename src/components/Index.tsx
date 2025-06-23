import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import VelocityTable from "@/components/dashboard/VelocityTable";
import { linearService } from "@/services/linearService";
import { LinearIssue, TeamMetrics, LinearTeam } from "@/types/linear";
import { toast } from "sonner";
import { getLinearApiKey, setLinearApiKey, hasStoredApiKey, clearStoredApiKey } from "@/config/api-config";
import { ApiKeyConfig } from "@/components/config/ApiKeyConfig";
import { SprintHistoryView } from "@/components/dashboard/SprintHistoryView";

// Explicitly list the exact allowed teams
const ALLOWED_TEAMS = [
  // Updated to be more flexible with team names
  "Content Analytics", 
  "Architecture",
  "Product & Situation Extraction",
  "Product Support",
  "Product support answers",
  "Engineering",
  "Frontend",
  "Backend",
  "Infrastructure",
  "Data",
  "Design",
  "Research",
  "QA"
];

// Team to explicitly exclude (the standalone "Product" team)
const EXCLUDED_TEAMS = ["Product"];

const Index = () => {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const queryClient = useQueryClient();
  
  // Check for API key on mount
  useEffect(() => {
    const checkApiKey = async () => {
      const currentKey = await getLinearApiKey();
      if (!currentKey) {
        setShowApiConfig(true);
        setIsLoadingTeams(false);
      } else {
        try {
          linearService.setApiKey(currentKey);
        } catch (error) {
          console.error('Error setting API key:', error);
          setShowApiConfig(true);
          toast.error('Invalid API key. Please enter a valid Linear API key.');
          setIsLoadingTeams(false);
        }
      }
    };
    
    checkApiKey();
  }, []);
  
  const [hasApiKey, setHasApiKey] = useState(false);
  
  // Check if we have a stored API key
  useEffect(() => {
    const checkStoredKey = async () => {
      const hasKey = await hasStoredApiKey();
      setHasApiKey(hasKey);
    };
    
    checkStoredKey();
  }, []);

  // Fetch teams - Added retry logic and better error handling
  const teamsQuery = useQuery<LinearTeam[]>({
    queryKey: ['teams'],
    queryFn: linearService.getTeams.bind(linearService),
    enabled: hasApiKey,
    meta: {
      onError: (error: any) => {
        console.error("Team fetch error:", error);
        const errorMessage = error.message || "Unknown error";
        toast.error(`Failed to fetch teams: ${errorMessage}`);
        setIsLoadingTeams(false);
      }
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Update loading state when teams query completes
  useEffect(() => {
    if (!teamsQuery.isLoading && teamsQuery.data) {
      setIsLoadingTeams(false);
    }
  }, [teamsQuery.isLoading, teamsQuery.data]);

  // Improved team filtering - include only the specific allowed teams and exclude the standalone Product team
  const filteredTeams = teamsQuery.data?.filter(team => {
    // For debugging
    console.log(`Checking team: "${team.name}"`);
    
    // Must have a team name
    if (!team.name) return false;
    
    // More flexible team matching - check if any allowed team name is contained within the actual team name
    const isAllowed = ALLOWED_TEAMS.some(allowedTeam => 
      team.name.toLowerCase().includes(allowedTeam.toLowerCase())
    );
    
    // Must not be in excluded teams
    const isExcluded = EXCLUDED_TEAMS.some(excludedTeam => 
      team.name.toLowerCase() === excludedTeam.toLowerCase()
    );
    
    const shouldInclude = isAllowed && !isExcluded;
    
    if (shouldInclude) {
      console.log(`Including team: "${team.name}"`);
    }
    
    return shouldInclude;
  });

  console.log("All teams:", teamsQuery.data);
  console.log("Allowed teams:", ALLOWED_TEAMS);
  console.log("Filtered teams:", filteredTeams);

  // Set initial team when teams are loaded
  useEffect(() => {
    if (filteredTeams && filteredTeams.length > 0 && !selectedTeamId && !isLoadingTeams && teamsQuery.data) {
      // Small delay to ensure all state updates are complete
      const timer = setTimeout(() => {
        console.log("Setting initial team ID:", filteredTeams[0].id);
        setSelectedTeamId(filteredTeams[0].id);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [filteredTeams, selectedTeamId, isLoadingTeams, teamsQuery.data]);

  // Fetch metrics for the selected team only if we have a valid team ID
  const metricsQuery = useQuery<TeamMetrics>({
    queryKey: ['team-metrics', selectedTeamId, lastRefresh],
    queryFn: () => {
      if (!selectedTeamId) {
        return Promise.reject("No team selected");
      }
      return linearService.getTeamMetrics(selectedTeamId);
    },
    enabled: !!selectedTeamId && hasApiKey && !isLoadingTeams && !!filteredTeams && filteredTeams.length > 0,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    meta: {
      onError: (error: any) => {
        console.error("Metrics fetch error:", error);
        if (error.message !== "No team selected") {
          toast.error(`Failed to fetch metrics: ${error.message}`);
        }
      }
    }
  });
  
  // Fetch issues for the selected team only if we have a valid team ID
  const issuesQuery = useQuery<LinearIssue[]>({
    queryKey: ['team-issues', selectedTeamId, lastRefresh],
    queryFn: () => {
      if (!selectedTeamId) {
        return Promise.reject("No team selected");
      }
      return linearService.getIssuesByTeam(selectedTeamId);
    },
    enabled: !!selectedTeamId && hasApiKey && !isLoadingTeams && !!filteredTeams && filteredTeams.length > 0,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    meta: {
      onError: (error: any) => {
        console.error("Issues fetch error:", error);
        if (error.message !== "No team selected") {
          toast.error(`Failed to fetch issues: ${error.message}`);
        }
      }
    }
  });

  // Handle manual refresh - now updates the lastRefresh timestamp to force a new query
  const handleRefresh = () => {
    if (selectedTeamId) {
      toast.info("Refreshing data...");
      // Update lastRefresh to trigger new queries
      setLastRefresh(Date.now());
    }
  };

  // Handle settings click - show API config or clear data
  const handleSettingsClick = () => {
    setShowApiConfig(true);
  };

  // Handle clearing stored data
  const handleClearData = async () => {
    try {
      await clearStoredApiKey();
      setHasApiKey(false);
      setShowApiConfig(true);
      queryClient.clear();
      toast.success("API key cleared successfully");
    } catch (error) {
      console.error("Error clearing API key:", error);
      toast.error("Failed to clear API key");
    }
  };

  // Get the current team name
  const currentTeam = filteredTeams?.find((team) => team.id === selectedTeamId);
  const teamName = currentTeam?.name || "Team";
  const loading = isLoadingTeams || teamsQuery.isLoading || metricsQuery.isLoading || issuesQuery.isLoading;
  const metrics = metricsQuery.data;

  return (
    <DashboardLayout onSettingsClick={handleSettingsClick}>
      {showApiConfig ? (
        <div className="flex items-center justify-center h-full">
          <ApiKeyConfig onSuccessfulConnection={async () => {
            setShowApiConfig(false);
            const hasKey = await hasStoredApiKey();
            setHasApiKey(hasKey);
            queryClient.invalidateQueries({ queryKey: ['teams'] });
          }} />
        </div>
      ) : loading && !selectedTeamId ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-white">Loading teams...</p>
            <button 
              onClick={() => setShowApiConfig(true)}
              className="px-4 py-2 bg-primary text-black rounded hover:bg-primary-light"
            >
              Set API Key
            </button>
          </div>
        </div>
      ) : filteredTeams && filteredTeams.length > 0 ? (
        <SprintHistoryView 
          selectedTeamId={selectedTeamId || ''}
          filteredTeams={filteredTeams}
          setSelectedTeamId={setSelectedTeamId}
          onRefresh={handleRefresh}
          selectedCycleId={selectedCycleId}
          setSelectedCycleId={setSelectedCycleId}
          teamName={teamName}
          showApiConfig={showApiConfig}
          onApiConfigClick={() => setShowApiConfig(true)}
          onApiConfigClose={() => setShowApiConfig(false)}
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-8 bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-white mb-4">No teams found. Please check your Linear API key permissions.</p>
            <button 
              onClick={() => setShowApiConfig(true)}
              className="px-4 py-2 bg-primary text-black rounded hover:bg-primary-light"
            >
              Set API Key
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Index; 