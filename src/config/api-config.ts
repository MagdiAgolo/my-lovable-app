const API_KEY_STORAGE_KEY = 'linear_api_key';

let apiKey: string | null = null;

export const apiConfig = {
  linear: {
    apiKey: '',
    fallbackProxies: [] as string[]
  }
};

export const getLinearApiKey = (): string | null => {
  if (!apiKey) {
    apiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
  }
  return apiKey;
};

export const setLinearApiKey = (key: string): void => {
  apiKey = key;
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
}; 