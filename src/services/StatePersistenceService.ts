// Service for persisting and hydrating application state
import { AppState } from '@/contexts';
import { AppState } from '@/contexts';
import { AppState } from '@/contexts';
import { AppState } from '@/contexts';
import { FamilyMember, Memory, DecorationElement, AltarState } from '../types';

/**
 * Service for persisting and hydrating application state
 * Handles automatic saving and loading of state to/from IndexedDB
 * Requirements: 1.2, 2.5, 4.4, 5.5
 */
export class StatePersistenceService {
  private static readonly STATE_KEY = 'dia-muertos-app-state';
  private static readonly STATE_VERSION = 1;

  /**
   * Save application state to IndexedDB
   */
  static async saveState(state: Partial<AppState>): Promise<void> {
    try {
      const stateToSave = {
        version: this.STATE_VERSION,
        timestamp: new Date().toISOString(),
        familyMembers: state.familyMembers || [],
        memories: state.memories || [],
        decorations: state.decorations || [],
        altarState: state.altarState,
        lastSaved: new Date().toISOString()
      };

      // Use localStorage as fallback if IndexedDB is not available
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.STATE_KEY, JSON.stringify(stateToSave));
      }

      // Also save to IndexedDB for better performance and storage capacity
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        await this.saveToIndexedDB(stateToSave);
      }
    } catch (error) {
      console.error('Failed to save application state:', error);
      throw new Error('Failed to save application state');
    }
  }

  /**
   * Load application state from storage
   */
  static async loadState(): Promise<Partial<AppState> | null> {
    try {
      // Try IndexedDB first
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        const indexedDBState = await this.loadFromIndexedDB();
        if (indexedDBState) {
          return this.deserializeState(indexedDBState);
        }
      }

      // Fallback to localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        const localStorageState = localStorage.getItem(this.STATE_KEY);
        if (localStorageState) {
          const parsedState = JSON.parse(localStorageState);
          return this.deserializeState(parsedState);
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to load application state:', error);
      return null;
    }
  }

  /**
   * Clear all persisted state
   */
  static async clearState(): Promise<void> {
    try {
      // Clear localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(this.STATE_KEY);
      }

      // Clear IndexedDB
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        await this.clearIndexedDB();
      }
    } catch (error) {
      console.error('Failed to clear application state:', error);
      throw new Error('Failed to clear application state');
    }
  }

  /**
   * Check if there is persisted state available
   */
  static async hasPersistedState(): Promise<boolean> {
    try {
      // Check IndexedDB first
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        const indexedDBState = await this.loadFromIndexedDB();
        if (indexedDBState) return true;
      }

      // Check localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        const localStorageState = localStorage.getItem(this.STATE_KEY);
        return localStorageState !== null;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the timestamp of the last saved state
   */
  static async getLastSavedTimestamp(): Promise<Date | null> {
    try {
      const state = await this.loadState();
      if (state && 'lastSaved' in state && typeof state.lastSaved === 'string') {
        return new Date(state.lastSaved);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Save state to IndexedDB
   */
  private static async saveToIndexedDB(state: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('DiaDeLosMuertosApp', 1);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('appState')) {
          db.createObjectStore('appState');
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['appState'], 'readwrite');
        const store = transaction.objectStore('appState');
        
        const putRequest = store.put(state, this.STATE_KEY);
        
        putRequest.onsuccess = () => {
          db.close();
          resolve();
        };
        
        putRequest.onerror = () => {
          db.close();
          reject(putRequest.error);
        };
      };
    });
  }

  /**
   * Load state from IndexedDB
   */
  private static async loadFromIndexedDB(): Promise<any | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('DiaDeLosMuertosApp', 1);

      request.onerror = () => reject(request.error);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('appState')) {
          db.createObjectStore('appState');
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['appState'], 'readonly');
        const store = transaction.objectStore('appState');
        
        const getRequest = store.get(this.STATE_KEY);
        
        getRequest.onsuccess = () => {
          db.close();
          resolve(getRequest.result || null);
        };
        
        getRequest.onerror = () => {
          db.close();
          reject(getRequest.error);
        };
      };
    });
  }

  /**
   * Clear IndexedDB state
   */
  private static async clearIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('DiaDeLosMuertosApp', 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['appState'], 'readwrite');
        const store = transaction.objectStore('appState');
        
        const deleteRequest = store.delete(this.STATE_KEY);
        
        deleteRequest.onsuccess = () => {
          db.close();
          resolve();
        };
        
        deleteRequest.onerror = () => {
          db.close();
          reject(deleteRequest.error);
        };
      };
    });
  }

  /**
   * Deserialize state from storage format to application format
   */
  private static deserializeState(serializedState: any): Partial<AppState> {
    try {
      const state: Partial<AppState> = {};

      // Deserialize family members
      if (Array.isArray(serializedState.familyMembers)) {
        state.familyMembers = serializedState.familyMembers.map((member: any) => ({
          ...member,
          dateOfBirth: new Date(member.dateOfBirth),
          dateOfDeath: member.dateOfDeath ? new Date(member.dateOfDeath) : undefined,
          createdAt: new Date(member.createdAt),
          updatedAt: new Date(member.updatedAt)
        }));
      }

      // Deserialize memories
      if (Array.isArray(serializedState.memories)) {
        state.memories = serializedState.memories.map((memory: any) => ({
          ...memory,
          createdAt: new Date(memory.createdAt),
          updatedAt: new Date(memory.updatedAt)
        }));
      }

      // Deserialize decorations
      if (Array.isArray(serializedState.decorations)) {
        state.decorations = serializedState.decorations;
      }

      // Deserialize altar state
      if (serializedState.altarState) {
        state.altarState = {
          ...serializedState.altarState,
          lastModified: new Date(serializedState.altarState.lastModified)
        };
      }

      return state;
    } catch (error) {
      console.error('Failed to deserialize state:', error);
      return {};
    }
  }

  /**
   * Create a backup of the current state
   */
  static async createBackup(): Promise<string> {
    try {
      const state = await this.loadState();
      if (!state) {
        throw new Error('No state to backup');
      }

      const backup = {
        version: this.STATE_VERSION,
        timestamp: new Date().toISOString(),
        state
      };

      return JSON.stringify(backup, null, 2);
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw new Error('Failed to create backup');
    }
  }

  /**
   * Restore state from a backup
   */
  static async restoreFromBackup(backupData: string): Promise<void> {
    try {
      const backup = JSON.parse(backupData);
      
      if (!backup.state || backup.version !== this.STATE_VERSION) {
        throw new Error('Invalid backup format or version mismatch');
      }

      await this.saveState(backup.state);
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      throw new Error('Failed to restore from backup');
    }
  }

  /**
   * Get storage usage information
   */
  static async getStorageInfo(): Promise<{
    hasIndexedDB: boolean;
    hasLocalStorage: boolean;
    estimatedSize: number;
    lastSaved: Date | null;
  }> {
    const hasIndexedDB = typeof window !== 'undefined' && 'indexedDB' in window;
    const hasLocalStorage = typeof window !== 'undefined' && !!window.localStorage;
    
    let estimatedSize = 0;
    const lastSaved = await this.getLastSavedTimestamp();

    try {
      if (hasLocalStorage) {
        const localStorageState = localStorage.getItem(this.STATE_KEY);
        if (localStorageState) {
          estimatedSize = new Blob([localStorageState]).size;
        }
      }
    } catch (error) {
      // Ignore errors when calculating size
    }

    return {
      hasIndexedDB,
      hasLocalStorage,
      estimatedSize,
      lastSaved
    };
  }
}