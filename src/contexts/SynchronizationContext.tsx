import React, { createContext, useContext, useEffect, useReducer, ReactNode } from 'react';
import { useAppState } from './AppStateContext';
import { 
  DataSynchronizationService, 
  ConflictItem, 
  ConflictResolution, 
  SyncResult, 
  SyncStatus, 
  BackupInfo 
} from '../services/DataSynchronizationService';

// Synchronization state interface
interface SynchronizationState {
  syncStatus: SyncStatus;
  conflicts: ConflictItem[];
  availableBackups: BackupInfo[];
  lastSyncResult: SyncResult | null;
  isInitialized: boolean;
}

// Synchronization actions
type SynchronizationAction =
  | { type: 'SET_SYNC_STATUS'; payload: SyncStatus }
  | { type: 'SET_CONFLICTS'; payload: ConflictItem[] }
  | { type: 'ADD_CONFLICT'; payload: ConflictItem }
  | { type: 'REMOVE_CONFLICT'; payload: string }
  | { type: 'SET_AVAILABLE_BACKUPS'; payload: BackupInfo[] }
  | { type: 'SET_LAST_SYNC_RESULT'; payload: SyncResult }
  | { type: 'SET_INITIALIZED'; payload: boolean };

// Initial state
const initialState: SynchronizationState = {
  syncStatus: {
    isOnline: navigator.onLine,
    lastSyncTimestamp: null,
    pendingChanges: 0,
    hasConflicts: false,
    isAutoSyncEnabled: false
  },
  conflicts: [],
  availableBackups: [],
  lastSyncResult: null,
  isInitialized: false
};

// Reducer
function synchronizationReducer(
  state: SynchronizationState, 
  action: SynchronizationAction
): SynchronizationState {
  switch (action.type) {
    case 'SET_SYNC_STATUS':
      return {
        ...state,
        syncStatus: action.payload
      };

    case 'SET_CONFLICTS':
      return {
        ...state,
        conflicts: action.payload,
        syncStatus: {
          ...state.syncStatus,
          hasConflicts: action.payload.length > 0
        }
      };

    case 'ADD_CONFLICT':
      const newConflicts = [...state.conflicts, action.payload];
      return {
        ...state,
        conflicts: newConflicts,
        syncStatus: {
          ...state.syncStatus,
          hasConflicts: true
        }
      };

    case 'REMOVE_CONFLICT':
      const filteredConflicts = state.conflicts.filter(c => c.id !== action.payload);
      return {
        ...state,
        conflicts: filteredConflicts,
        syncStatus: {
          ...state.syncStatus,
          hasConflicts: filteredConflicts.length > 0
        }
      };

    case 'SET_AVAILABLE_BACKUPS':
      return {
        ...state,
        availableBackups: action.payload
      };

    case 'SET_LAST_SYNC_RESULT':
      return {
        ...state,
        lastSyncResult: action.payload
      };

    case 'SET_INITIALIZED':
      return {
        ...state,
        isInitialized: action.payload
      };

    default:
      return state;
  }
}

// Context interface
interface SynchronizationContextValue {
  state: SynchronizationState;
  dispatch: React.Dispatch<SynchronizationAction>;
  
  // Sync operations
  startAutoSync: () => void;
  stopAutoSync: () => void;
  performManualSync: () => Promise<SyncResult>;
  markChanged: (entityType: 'familyMember' | 'memory' | 'decoration' | 'altarState', entityId?: string) => void;
  
  // Conflict resolution
  resolveConflict: (conflictId: string, resolution: ConflictResolution) => Promise<void>;
  resolveAllConflicts: (resolutions: ConflictResolution[]) => Promise<void>;
  
  // Backup operations
  createBackup: () => Promise<string>;
  restoreFromBackup: (backupId: string) => Promise<void>;
  refreshBackupList: () => Promise<void>;
  deleteBackup: (backupId: string) => Promise<void>;
  
  // Status checks
  isOnline: () => boolean;
  hasPendingChanges: () => boolean;
  hasConflicts: () => boolean;
  getLastSyncTime: () => Date | null;
}

// Create context
const SynchronizationContext = createContext<SynchronizationContextValue | null>(null);

// Hook to use synchronization context
export const useSynchronization = (): SynchronizationContextValue => {
  const context = useContext(SynchronizationContext);
  if (!context) {
    throw new Error('useSynchronization must be used within a SynchronizationProvider');
  }
  return context;
};

// Service instance
let syncService: DataSynchronizationService;

// Provider component
interface SynchronizationProviderProps {
  children: ReactNode;
}

export const SynchronizationProvider: React.FC<SynchronizationProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(synchronizationReducer, initialState);
  const { state: appState } = useAppState();

  // Initialize service
  useEffect(() => {
    if (!syncService) {
      syncService = new DataSynchronizationService();
    }
    
    // Update sync status periodically
    const updateStatus = () => {
      const status = syncService.getSyncStatus();
      dispatch({ type: 'SET_SYNC_STATUS', payload: status });
    };

    updateStatus();
    const statusInterval = setInterval(updateStatus, 1000);

    // Load available backups
    refreshBackupList();

    dispatch({ type: 'SET_INITIALIZED', payload: true });

    return () => {
      clearInterval(statusInterval);
    };
  }, []);

  // Handle conflicts callback
  const handleConflicts = (conflicts: ConflictItem[]) => {
    dispatch({ type: 'SET_CONFLICTS', payload: conflicts });
  };

  // Start automatic synchronization
  const startAutoSync = () => {
    if (!syncService) return;
    
    syncService.startAutoSync(() => appState, handleConflicts);
    
    const status = syncService.getSyncStatus();
    dispatch({ type: 'SET_SYNC_STATUS', payload: status });
  };

  // Stop automatic synchronization
  const stopAutoSync = () => {
    if (!syncService) return;
    
    syncService.stopAutoSync();
    
    const status = syncService.getSyncStatus();
    dispatch({ type: 'SET_SYNC_STATUS', payload: status });
  };

  // Perform manual synchronization
  const performManualSync = async (): Promise<SyncResult> => {
    if (!syncService) {
      const result: SyncResult = { success: false, conflicts: [], message: 'Sync service not initialized' };
      dispatch({ type: 'SET_LAST_SYNC_RESULT', payload: result });
      return result;
    }

    try {
      const result = await syncService.performSync(appState, handleConflicts);
      dispatch({ type: 'SET_LAST_SYNC_RESULT', payload: result });
      
      // Update status after sync
      const status = syncService.getSyncStatus();
      dispatch({ type: 'SET_SYNC_STATUS', payload: status });
      
      return result;
    } catch (error) {
      const result: SyncResult = {
        success: false,
        conflicts: [],
        message: error instanceof Error ? error.message : 'Sync failed'
      };
      dispatch({ type: 'SET_LAST_SYNC_RESULT', payload: result });
      return result;
    }
  };

  // Mark data as changed
  const markChanged = (
    entityType: 'familyMember' | 'memory' | 'decoration' | 'altarState', 
    entityId?: string
  ) => {
    if (!syncService) return;
    
    syncService.markChanged(entityType, entityId);
    
    // Update status to reflect pending changes
    const status = syncService.getSyncStatus();
    dispatch({ type: 'SET_SYNC_STATUS', payload: status });
  };

  // Resolve a single conflict
  const resolveConflict = async (conflictId: string, resolution: ConflictResolution): Promise<void> => {
    if (!syncService) return;

    try {
      await syncService.resolvePendingConflicts([resolution], appState);
      dispatch({ type: 'REMOVE_CONFLICT', payload: conflictId });
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      throw error;
    }
  };

  // Resolve all conflicts
  const resolveAllConflicts = async (resolutions: ConflictResolution[]): Promise<void> => {
    if (!syncService) return;

    try {
      await syncService.resolvePendingConflicts(resolutions, appState);
      
      // Remove resolved conflicts
      for (const resolution of resolutions) {
        dispatch({ type: 'REMOVE_CONFLICT', payload: resolution.conflictId });
      }
    } catch (error) {
      console.error('Failed to resolve conflicts:', error);
      throw error;
    }
  };

  // Create backup
  const createBackup = async (): Promise<string> => {
    if (!syncService) throw new Error('Sync service not initialized');

    try {
      const backupId = await syncService.createBackup(appState);
      await refreshBackupList();
      return backupId;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw error;
    }
  };

  // Restore from backup
  const restoreFromBackup = async (backupId: string): Promise<void> => {
    if (!syncService) throw new Error('Sync service not initialized');

    try {
      await syncService.restoreFromBackup(backupId);
      // Note: This would typically trigger a state reload in the app
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      throw error;
    }
  };

  // Refresh backup list
  const refreshBackupList = async (): Promise<void> => {
    if (!syncService) return;

    try {
      const backups = await syncService.getAvailableBackups();
      dispatch({ type: 'SET_AVAILABLE_BACKUPS', payload: backups });
    } catch (error) {
      console.error('Failed to refresh backup list:', error);
    }
  };

  // Delete backup
  const deleteBackup = async (backupId: string): Promise<void> => {
    try {
      localStorage.removeItem(backupId);
      await refreshBackupList();
    } catch (error) {
      console.error('Failed to delete backup:', error);
      throw error;
    }
  };

  // Status check functions
  const isOnline = (): boolean => state.syncStatus.isOnline;
  const hasPendingChanges = (): boolean => state.syncStatus.pendingChanges > 0;
  const hasConflicts = (): boolean => state.syncStatus.hasConflicts;
  const getLastSyncTime = (): Date | null => state.syncStatus.lastSyncTimestamp;

  const contextValue: SynchronizationContextValue = {
    state,
    dispatch,
    startAutoSync,
    stopAutoSync,
    performManualSync,
    markChanged,
    resolveConflict,
    resolveAllConflicts,
    createBackup,
    restoreFromBackup,
    refreshBackupList,
    deleteBackup,
    isOnline,
    hasPendingChanges,
    hasConflicts,
    getLastSyncTime
  };

  return (
    <SynchronizationContext.Provider value={contextValue}>
      {children}
    </SynchronizationContext.Provider>
  );
};