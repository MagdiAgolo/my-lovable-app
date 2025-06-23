// Secure storage utility for sensitive data like API keys
import { toast } from "sonner";

// Simple encryption/decryption using built-in browser APIs
class SecureStorage {
  private readonly storageKey = 'secure_linear_config';
  private readonly algorithm = 'AES-GCM';
  private readonly keyLength = 256;
  
  // Generate a key from user's browser fingerprint + timestamp
  private async generateKey(): Promise<CryptoKey> {
    const fingerprint = this.getBrowserFingerprint();
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(fingerprint),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const salt = encoder.encode('linear-app-salt-2024');
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.algorithm, length: this.keyLength },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  // Create a simple browser fingerprint for key derivation
  private getBrowserFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('linear-app', 10, 10);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    // Simple hash of the fingerprint
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return 'linear-key-' + Math.abs(hash).toString(36);
  }
  
  // Encrypt and store data
  async setSecureItem(key: string, value: string): Promise<boolean> {
    try {
      if (!crypto.subtle) {
        console.warn('Web Crypto API not available, falling back to localStorage');
        localStorage.setItem(key, btoa(value)); // Basic base64 encoding as fallback
        return true;
      }
      
      const cryptoKey = await this.generateKey();
      const encoder = new TextEncoder();
      const data = encoder.encode(value);
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encryptedData = await crypto.subtle.encrypt(
        { name: this.algorithm, iv: iv },
        cryptoKey,
        data
      );
      
      const encryptedArray = new Uint8Array(encryptedData);
      const combinedArray = new Uint8Array(iv.length + encryptedArray.length);
      combinedArray.set(iv);
      combinedArray.set(encryptedArray, iv.length);
      
      const base64String = btoa(String.fromCharCode(...combinedArray));
      localStorage.setItem(this.storageKey, base64String);
      
      return true;
    } catch (error) {
      console.error('Failed to encrypt and store data:', error);
      toast.error('Failed to securely store API key');
      return false;
    }
  }
  
  // Retrieve and decrypt data
  async getSecureItem(key: string): Promise<string | null> {
    try {
      const storedData = localStorage.getItem(this.storageKey);
      if (!storedData) return null;
      
      if (!crypto.subtle) {
        console.warn('Web Crypto API not available, using fallback decoding');
        try {
          return atob(storedData); // Basic base64 decoding as fallback
        } catch {
          return null;
        }
      }
      
      const cryptoKey = await this.generateKey();
      const combinedArray = new Uint8Array(
        atob(storedData).split('').map(char => char.charCodeAt(0))
      );
      
      const iv = combinedArray.slice(0, 12);
      const encryptedData = combinedArray.slice(12);
      
      const decryptedData = await crypto.subtle.decrypt(
        { name: this.algorithm, iv: iv },
        cryptoKey,
        encryptedData
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(decryptedData);
    } catch (error) {
      console.error('Failed to decrypt stored data:', error);
      // Clear corrupted data
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }
  
  // Remove stored data
  removeSecureItem(key: string): void {
    localStorage.removeItem(this.storageKey);
  }
  
  // Check if secure storage is available
  isSecureStorageAvailable(): boolean {
    return typeof crypto !== 'undefined' && 
           typeof crypto.subtle !== 'undefined' && 
           typeof localStorage !== 'undefined';
  }
}

export const secureStorage = new SecureStorage(); 