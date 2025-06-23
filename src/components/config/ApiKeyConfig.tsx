import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { linearService } from '@/services/linearService';
import { setLinearApiKey, hasStoredApiKey, clearStoredApiKey } from '@/config/api-config';
import { toast } from 'sonner';
import { ThemeSelector } from './ThemeSelector';

interface ApiKeyConfigProps {
  onSuccessfulConnection: () => void;
}

export const ApiKeyConfig: React.FC<ApiKeyConfigProps> = ({ onSuccessfulConnection }) => {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingKey, setHasExistingKey] = useState(false);

  // Check if there's an existing API key
  useEffect(() => {
    const checkExistingKey = async () => {
      const hasKey = await hasStoredApiKey();
      setHasExistingKey(hasKey);
    };
    
    checkExistingKey();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const cleanKey = apiKey.trim();
      
      if (!cleanKey) {
        setError('API key cannot be empty');
        return;
      }

      // Set the API key
      const success = await setLinearApiKey(cleanKey);
      if (!success) {
        throw new Error('Failed to securely store API key');
      }
      linearService.setApiKey(cleanKey);

      // Test the connection
      const isConnected = await linearService.testConnection();
      if (!isConnected) {
        throw new Error('Unable to connect to Linear API. Please check your internet connection and try again.');
      }

      // If connection test passes, fetch teams
      await linearService.getTeams();
      
      toast.success('Successfully connected to Linear!');
      onSuccessfulConnection();
    } catch (error) {
      console.error('Connection error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Linear';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearApiKey = async () => {
    try {
      await clearStoredApiKey();
      setHasExistingKey(false);
      toast.success("API key cleared successfully");
    } catch (error) {
      console.error("Error clearing API key:", error);
      toast.error("Failed to clear API key");
    }
  };

  return (
    <div className="space-y-6">
      {/* Theme Selector */}
      <ThemeSelector />
      
      {/* API Key Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Linear API Key</CardTitle>
          <CardDescription>
            {hasExistingKey 
              ? "Update your Linear API key or clear the stored key to disconnect."
              : "Enter your Linear API key to connect your account. You can find your API key in your Linear settings."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Linear API key"
                className={`w-full p-2 border rounded ${error ? 'border-red-500' : ''}`}
                required
              />
              {error && (
                <p className="mt-2 text-sm text-red-500">{error}</p>
              )}
              <p className="mt-2 text-sm text-muted-foreground">
                You can find your API key in your Linear settings under API.
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={isLoading || !apiKey.trim()}
                className="flex-1"
              >
                {isLoading ? 'Connecting...' : hasExistingKey ? 'Update Key' : 'Connect'}
              </Button>
              {hasExistingKey && (
                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleClearApiKey}
                  className="px-4"
                >
                  Clear Key
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}; 