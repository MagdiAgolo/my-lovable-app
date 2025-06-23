import { secureStorage } from '@/utils/secureStorage';

const API_KEY_STORAGE_KEY = 'linear_api_key';

let apiKey: string | null = null;
let isInitialized = false;

export const apiConfig = {
  linear: {
    apiKey: '',
    fallbackProxies: [] as string[]
  }
};

// Initialize and load stored API key
const initializeApiKey = async (): Promise<void> => {
  if (isInitialized) return;
  
  try {
    const storedKey = await secureStorage.getSecureItem(API_KEY_STORAGE_KEY);
    if (storedKey) {
      apiKey = storedKey;
      apiConfig.linear.apiKey = storedKey;
    }
  } catch (error) {
    console.error('Failed to load stored API key:', error);
    // Clear any corrupted data
    await clearStoredApiKey();
  }
  
  isInitialized = true;
};

export const getLinearApiKey = async (): Promise<string | null> => {
  await initializeApiKey();
  return apiKey;
};

export const setLinearApiKey = async (key: string): Promise<boolean> => {
  try {
    const success = await secureStorage.setSecureItem(API_KEY_STORAGE_KEY, key);
    if (success) {
      apiKey = key;
      apiConfig.linear.apiKey = key;
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to store API key:', error);
    return false;
  }
};

export const clearStoredApiKey = async (): Promise<void> => {
  try {
    secureStorage.removeSecureItem(API_KEY_STORAGE_KEY);
    apiKey = null;
    apiConfig.linear.apiKey = '';
  } catch (error) {
    console.error('Failed to clear stored API key:', error);
  }
};

export const hasStoredApiKey = async (): Promise<boolean> => {
  await initializeApiKey();
  return !!apiKey;
};

// Synchronous version for backward compatibility (will return null if not initialized)
export const getLinearApiKeySync = (): string | null => {
  return apiKey;
}; 