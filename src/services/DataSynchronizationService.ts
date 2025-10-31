import { AppState } from '../contexts/AppStateContext';
import { StatePersistenceService } from './StatePersistenceService';
import { FamilyMember, Memory, AltarState } from '../types';

/**
 * Service for handling data synchronization, conflict resolution, and backup/restore
 * Implements automatic saving, conflict detection, and data recovery mechanisms
 * Requirements: 1.2, 2.5, 4.4
 */
export class DataSynchronizationService {
  private static readonly SYNC_INTERVAL = 5000; // 5 seconds
  private static readonly CONFLICT_RESOLUTION_STRATEGY: 'last-write-wins' | 'current-wins' | 'persisted-wins' = 'last-write-wins';
  private static readonly MAX_BACKUP_COUNT = 10;

  private syncTimer: number | null = null;
  private isOnline: boolean = navigator.onLine;
  private lastSyncTimestamp: Date | null = null;
  private pendingChanges: Set<string> = new Set();
  private conflictQueue: ConflictItem[] = [];

  constructor() {
    this.setupOnlineStatusListener();
    this.setupVisibilityChangeListener();
  }

  /**
   * Start automatic synchronization
   */
  startAutoSync(getState: () => AppState, onConflict?: (conflicts: ConflictItem[]) => void): void {
    if (this.syncTimer) {
      this.stopAutoSync();
    }

    this.syncTimer = window.setInterval(async () => {
      try {
        await this.performSync(getState(), onConflict);
      } catch (error) {
        console.error('Auto-sync failed:', error);
      }
    }, DataSynchronizationService.SYNC_INTERVAL);

    // Perform initial sync
    this.performSync(getState(), onConflict);
  }

  /**
   * Stop automatic synchronization
   */
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Perform manual synchronization
   */
  async performSync(
    currentState: AppState, 
    onConflict?: (conflicts: ConflictItem[]) => void
  ): Promise<SyncResult> {
    try {
      // Check if there are pending changes
      if (this.pendingChanges.size === 0 && !this.hasStateChanged(currentState)) {
        return { success: true, conflicts: [], message: 'No changes to sync' };
      }

      // Load persisted state for comparison
      const persistedState = await StatePersistenceService.loadState();
      
      // Detect conflicts
      const conflicts = this.detectConflicts(currentState, persistedState);
      
      if (conflicts.length > 0) {
        this.conflictQueue.push(...conflicts);
        
        if (onConflict) {
          onConflict(conflicts);
        }
        
        // Apply conflict resolution strategy
        const resolvedState = this.resolveConflicts(currentState, persistedState, conflicts);
        await StatePersistenceService.saveState(resolvedState);
      } else {
        // No conflicts, save current state
        await StatePersistenceService.saveState(currentState);
      }

      // Create backup if significant changes
      if (this.shouldCreateBackup(currentState)) {
        await this.createBackup(currentState);
      }

      // Clear pending changes
      this.pendingChanges.clear();
      this.lastSyncTimestamp = new Date();

      return { 
        success: true, 
        conflicts, 
        message: conflicts.length > 0 ? 'Synced with conflicts resolved' : 'Synced successfully' 
      };

    } catch (error) {
      console.error('Sync failed:', error);
      return { 
        success: false, 
        conflicts: [], 
        message: error instanceof Error ? error.message : 'Sync failed' 
      };
    }
  }

  /**
   * Mark data as changed for next sync
   */
  markChanged(entityType: 'familyMember' | 'memory' | 'decoration' | 'altarState', entityId?: string): void {
    const changeKey = entityId ? `${entityType}:${entityId}` : entityType;
    this.pendingChanges.add(changeKey);
  }

  /**
   * Force immediate sync
   */
  async forcSync(currentState: AppState): Promise<SyncResult> {
    return this.performSync(currentState);
  }

  /**
   * Create a backup of current state
   */
  async createBackup(state: AppState): Promise<string> {
    try {
      const backupData = await StatePersistenceService.createBackup();
      const backupId = `backup-${Date.now()}`;
      
      // Store backup in localStorage with rotation
      await this.storeBackup(backupId, backupData);
      
      return backupId;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw new Error('Failed to create backup');
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupId: string): Promise<Partial<AppState> | null> {
    try {
      const backupData = await this.getBackup(backupId);
      if (!backupData) {
        throw new Error('Backup not found');
      }

      await StatePersistenceService.restoreFromBackup(backupData);
      return await StatePersistenceService.loadState();
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      throw new Error('Failed to restore from backup');
    }
  }

  /**
   * Get list of available backups
   */
  async getAvailableBackups(): Promise<BackupInfo[]> {
    try {
      const backups: BackupInfo[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('backup-')) {
          const backupData = localStorage.getItem(key);
          if (backupData) {
            try {
              const parsed = JSON.parse(backupData);
              backups.push({
                id: key,
                timestamp: new Date(parsed.timestamp),
                size: new Blob([backupData]).size
              });
            } catch (error) {
              // Skip invalid backup
            }
          }
        }
      }

      return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.error('Failed to get available backups:', error);
      return [];
    }
  }

  /**
   * Delete old backups to maintain storage limits
   */
  async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.getAvailableBackups();
      
      if (backups.length > DataSynchronizationService.MAX_BACKUP_COUNT) {
        const backupsToDelete = backups.slice(DataSynchronizationService.MAX_BACKUP_COUNT);
        
        for (const backup of backupsToDelete) {
          localStorage.removeItem(backup.id);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  /**
   * Get sync status information
   */
  getSyncStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      lastSyncTimestamp: this.lastSyncTimestamp,
      pendingChanges: this.pendingChanges.size,
      hasConflicts: this.conflictQueue.length > 0,
      isAutoSyncEnabled: this.syncTimer !== null
    };
  }

  /**
   * Resolve pending conflicts
   */
  async resolvePendingConflicts(
    resolutions: ConflictResolution[],
    currentState: AppState
  ): Promise<void> {
    try {
      // Apply conflict resolutions
      let resolvedState = { ...currentState };
      
      for (const resolution of resolutions) {
        resolvedState = this.applyConflictResolution(resolvedState, resolution);
      }

      // Save resolved state
      await StatePersistenceService.saveState(resolvedState);
      
      // Clear resolved conflicts from queue
      this.conflictQueue = this.conflictQueue.filter(conflict => 
        !resolutions.some(resolution => resolution.conflictId === conflict.id)
      );
    } catch (error) {
      console.error('Failed to resolve conflicts:', error);
      throw new Error('Failed to resolve conflicts');
    }
  }

  /**
   * Detect conflicts between current and persisted state
   */
  private detectConflicts(
    currentState: AppState, 
    persistedState: Partial<AppState> | null
  ): ConflictItem[] {
    if (!persistedState) return [];

    const conflicts: ConflictItem[] = [];

    // Check family member conflicts
    if (persistedState.familyMembers && currentState.familyMembers) {
      for (const currentMember of currentState.familyMembers) {
        const persistedMember = persistedState.familyMembers.find(m => m.id === currentMember.id);
        if (persistedMember && this.hasDataConflict(currentMember, persistedMember)) {
          conflicts.push({
            id: `family-member-${currentMember.id}`,
            type: 'family-member',
            entityId: currentMember.id,
            currentData: currentMember,
            persistedData: persistedMember,
            conflictFields: this.getConflictFields(currentMember, persistedMember)
          });
        }
      }
    }

    // Check memory conflicts
    if (persistedState.memories && currentState.memories) {
      for (const currentMemory of currentState.memories) {
        const persistedMemory = persistedState.memories.find(m => m.id === currentMemory.id);
        if (persistedMemory && this.hasDataConflict(currentMemory, persistedMemory)) {
          conflicts.push({
            id: `memory-${currentMemory.id}`,
            type: 'memory',
            entityId: currentMemory.id,
            currentData: currentMemory,
            persistedData: persistedMemory,
            conflictFields: this.getConflictFields(currentMemory, persistedMemory)
          });
        }
      }
    }

    // Check altar state conflicts
    if (persistedState.altarState && currentState.altarState) {
      if (this.hasDataConflict(currentState.altarState, persistedState.altarState)) {
        conflicts.push({
          id: 'altar-state',
          type: 'altar-state',
          entityId: currentState.altarState.id,
          currentData: currentState.altarState,
          persistedData: persistedState.altarState,
          conflictFields: this.getConflictFields(currentState.altarState, persistedState.altarState)
        });
      }
    }

    return conflicts;
  }

  /**
   * Check if two data objects have conflicts
   */
  private hasDataConflict(current: any, persisted: any): boolean {
    if (!current.updatedAt || !persisted.updatedAt) return false;
    
    const currentTime = new Date(current.updatedAt).getTime();
    const persistedTime = new Date(persisted.updatedAt).getTime();
    
    // Consider it a conflict if times are different and both are recent
    return Math.abs(currentTime - persistedTime) > 1000; // 1 second tolerance
  }

  /**
   * Get fields that have conflicts between two objects
   */
  private getConflictFields(current: any, persisted: any): string[] {
    const conflicts: string[] = [];
    const keys = new Set([...Object.keys(current), ...Object.keys(persisted)]);
    
    for (const key of keys) {
      if (key === 'updatedAt' || key === 'createdAt') continue;
      
      if (JSON.stringify(current[key]) !== JSON.stringify(persisted[key])) {
        conflicts.push(key);
      }
    }
    
    return conflicts;
  }

  /**
   * Resolve conflicts using the configured strategy
   */
  private resolveConflicts(
    currentState: AppState,
    persistedState: Partial<AppState> | null,
    conflicts: ConflictItem[]
  ): AppState {
    let resolvedState = { ...currentState };

    for (const conflict of conflicts) {
      switch (DataSynchronizationService.CONFLICT_RESOLUTION_STRATEGY) {
        case 'last-write-wins':
          resolvedState = this.applyLastWriteWins(resolvedState, conflict);
          break;
        case 'current-wins':
          // Keep current state (no changes needed)
          break;
        case 'persisted-wins':
          resolvedState = this.applyPersistedWins(resolvedState, conflict, persistedState);
          break;
      }
    }

    return resolvedState;
  }

  /**
   * Apply last-write-wins conflict resolution
   */
  private applyLastWriteWins(state: AppState, conflict: ConflictItem): AppState {
    const currentTime = new Date((conflict.currentData as any).updatedAt).getTime();
    const persistedTime = new Date((conflict.persistedData as any).updatedAt).getTime();
    
    if (persistedTime > currentTime) {
      return this.applyPersistedWins(state, conflict, null);
    }
    
    return state; // Current wins
  }

  /**
   * Apply persisted-wins conflict resolution
   */
  private applyPersistedWins(
    state: AppState, 
    conflict: ConflictItem, 
    _persistedState: Partial<AppState> | null
  ): AppState {
    const newState = { ...state };

    switch (conflict.type) {
      case 'family-member':
        newState.familyMembers = newState.familyMembers.map(member =>
          member.id === conflict.entityId ? conflict.persistedData as FamilyMember : member
        );
        break;
      case 'memory':
        newState.memories = newState.memories.map(memory =>
          memory.id === conflict.entityId ? conflict.persistedData as Memory : memory
        );
        break;
      case 'altar-state':
        newState.altarState = conflict.persistedData as AltarState;
        break;
    }

    return newState;
  }

  /**
   * Apply a specific conflict resolution
   */
  private applyConflictResolution(state: AppState, _resolution: ConflictResolution): AppState {
    // Implementation would depend on the specific resolution strategy
    // For now, return the state unchanged
    return state;
  }

  /**
   * Check if state has changed since last sync
   */
  private hasStateChanged(_state: AppState): boolean {
    if (!this.lastSyncTimestamp) return true;
    
    // Check if any entity has been updated since last sync
    const checkUpdatedSince = (items: any[]) => 
      items.some(item => 
        item.updatedAt && new Date(item.updatedAt) > this.lastSyncTimestamp!
      );

    return (
      checkUpdatedSince(state.familyMembers) ||
      checkUpdatedSince(state.memories) ||
      (state.altarState.lastModified > this.lastSyncTimestamp)
    );
  }

  /**
   * Determine if a backup should be created
   */
  private shouldCreateBackup(_state: AppState): boolean {
    // Create backup if significant changes or time-based
    const significantChangeThreshold = 5; // 5 or more changes
    const timeThreshold = 30 * 60 * 1000; // 30 minutes
    
    const now = new Date();
    const timeSinceLastBackup = this.lastSyncTimestamp 
      ? now.getTime() - this.lastSyncTimestamp.getTime()
      : Infinity;

    return (
      this.pendingChanges.size >= significantChangeThreshold ||
      timeSinceLastBackup >= timeThreshold
    );
  }

  /**
   * Store backup with rotation
   */
  private async storeBackup(backupId: string, backupData: string): Promise<void> {
    try {
      localStorage.setItem(backupId, backupData);
      await this.cleanupOldBackups();
    } catch (error) {
      console.error('Failed to store backup:', error);
      throw new Error('Failed to store backup');
    }
  }

  /**
   * Get backup data
   */
  private async getBackup(backupId: string): Promise<string | null> {
    try {
      return localStorage.getItem(backupId);
    } catch (error) {
      console.error('Failed to get backup:', error);
      return null;
    }
  }

  /**
   * Setup online status listener
   */
  private setupOnlineStatusListener(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Setup visibility change listener for sync on focus
   */
  private setupVisibilityChangeListener(): void {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isOnline) {
        // Trigger sync when app becomes visible
        // This would need to be connected to the app state
      }
    });
  }
}

// Type definitions
export interface ConflictItem {
  id: string;
  type: 'family-member' | 'memory' | 'decoration' | 'altar-state';
  entityId: string;
  currentData: any;
  persistedData: any;
  conflictFields: string[];
}

export interface ConflictResolution {
  conflictId: string;
  strategy: 'use-current' | 'use-persisted' | 'merge' | 'custom';
  customData?: any;
}

export interface SyncResult {
  success: boolean;
  conflicts: ConflictItem[];
  message: string;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncTimestamp: Date | null;
  pendingChanges: number;
  hasConflicts: boolean;
  isAutoSyncEnabled: boolean;
}

export interface BackupInfo {
  id: string;
  timestamp: Date;
  size: number;
}