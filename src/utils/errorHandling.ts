/**
 * Error handling utilities for the Día de los Muertos Memory Tree application
 * Provides comprehensive error management, user-friendly messages, and recovery strategies
 */

export enum ErrorType {
  NETWORK = 'network',
  STORAGE = 'storage',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown',
  CULTURAL_CONTENT = 'cultural_content'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AppError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  culturalContext?: string;
  timestamp: Date;
  stack?: string;
  metadata?: Record<string, any> | undefined;
  recoveryActions?: ErrorRecoveryAction[];
}

export interface ErrorRecoveryAction {
  label: string;
  action: () => void | Promise<void>;
  isPrimary?: boolean;
}

/**
 * Error factory for creating standardized errors
 */
export class ErrorFactory {
  static createStorageError(message: string, metadata?: Record<string, any>): AppError {
    return {
      id: `storage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: ErrorType.STORAGE,
      severity: ErrorSeverity.HIGH,
      message,
      userMessage: 'No se pudo guardar la información del altar. Tus cambios podrían perderse.',
      culturalContext: 'Los altares del Día de los Muertos son sagrados. Asegurémonos de preservar tus memorias familiares.',
      timestamp: new Date(),
      metadata,
      recoveryActions: [
        {
          label: 'Reintentar guardar',
          action: () => window.location.reload(),
          isPrimary: true
        },
        {
          label: 'Exportar datos',
          action: () => console.log('Export data')
        }
      ]
    };
  }

  static createNetworkError(message: string, metadata?: Record<string, any>): AppError {
    return {
      id: `network-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: ErrorType.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      message,
      userMessage: 'Problemas de conexión. Trabajando en modo sin conexión.',
      culturalContext: 'Como las velas que siguen brillando sin viento, tu altar funciona sin conexión.',
      timestamp: new Date(),
      metadata,
      recoveryActions: [
        {
          label: 'Reintentar conexión',
          action: () => window.location.reload(),
          isPrimary: true
        },
        {
          label: 'Continuar sin conexión',
          action: () => console.log('Continue offline')
        }
      ]
    };
  }

  static createValidationError(field: string, value: any, rule: string): AppError {
    return {
      id: `validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: ErrorType.VALIDATION,
      severity: ErrorSeverity.LOW,
      message: `Validation failed for ${field}: ${rule}`,
      userMessage: `Por favor verifica la información de ${field}`,
      timestamp: new Date(),
      metadata: { field, value, rule },
      recoveryActions: [
        {
          label: 'Corregir información',
          action: () => console.log('Focus field'),
          isPrimary: true
        }
      ]
    };
  }

  static createPermissionError(permission: string): AppError {
    return {
      id: `permission-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: ErrorType.PERMISSION,
      severity: ErrorSeverity.HIGH,
      message: `Permission denied: ${permission}`,
      userMessage: 'Se necesitan permisos adicionales para esta función',
      timestamp: new Date(),
      metadata: { permission },
      recoveryActions: [
        {
          label: 'Otorgar permisos',
          action: () => console.log('Request permissions'),
          isPrimary: true
        },
        {
          label: 'Continuar sin esta función',
          action: () => console.log('Continue without feature')
        }
      ]
    };
  }

  static createCulturalContentError(content: string, reason: string): AppError {
    return {
      id: `cultural-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: ErrorType.CULTURAL_CONTENT,
      severity: ErrorSeverity.MEDIUM,
      message: `Cultural content issue: ${reason}`,
      userMessage: 'Contenido que podría no ser apropiado para el Día de los Muertos',
      culturalContext: 'Mantengamos el respeto y la tradición en nuestro altar familiar.',
      timestamp: new Date(),
      metadata: { content, reason },
      recoveryActions: [
        {
          label: 'Revisar contenido',
          action: () => console.log('Review content'),
          isPrimary: true
        },
        {
          label: 'Continuar de todos modos',
          action: () => console.log('Continue anyway')
        }
      ]
    };
  }
}

/**
 * Error manager for handling and tracking errors
 */
export class ErrorManager {
  private errors: Map<string, AppError> = new Map();
  private listeners: ((errors: AppError[]) => void)[] = [];
  private maxErrors = 50;

  addError(error: AppError): void {
    this.errors.set(error.id, error);
    
    // Keep only the most recent errors
    if (this.errors.size > this.maxErrors) {
      const oldestKey = this.errors.keys().next().value;
      this.errors.delete(oldestKey);
    }

    // Log error for debugging
    console.error('App Error:', error);

    // Notify listeners
    this.notifyListeners();
  }

  removeError(errorId: string): void {
    this.errors.delete(errorId);
    this.notifyListeners();
  }

  clearErrors(): void {
    this.errors.clear();
    this.notifyListeners();
  }

  getErrors(): AppError[] {
    return Array.from(this.errors.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  getErrorsByType(type: ErrorType): AppError[] {
    return this.getErrors().filter(error => error.type === type);
  }

  getErrorsBySeverity(severity: ErrorSeverity): AppError[] {
    return this.getErrors().filter(error => error.severity === severity);
  }

  subscribe(listener: (errors: AppError[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    const errors = this.getErrors();
    this.listeners.forEach(listener => listener(errors));
  }
}

/**
 * Global error manager instance
 */
export const globalErrorManager = new ErrorManager();

/**
 * Error boundary hook for React components
 */
export const useErrorHandler = () => {
  const [errors, setErrors] = React.useState<AppError[]>([]);

  React.useEffect(() => {
    const unsubscribe = globalErrorManager.subscribe(setErrors);
    return unsubscribe;
  }, []);

  const addError = (error: AppError) => {
    globalErrorManager.addError(error);
  };

  const removeError = (errorId: string) => {
    globalErrorManager.removeError(errorId);
  };

  const clearErrors = () => {
    globalErrorManager.clearErrors();
  };

  const handleAsyncError = async <T>(
    asyncFn: () => Promise<T>,
    errorContext?: string
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      const appError = ErrorFactory.createStorageError(
        `Async operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { context: errorContext, originalError: error }
      );
      addError(appError);
      return null;
    }
  };

  return {
    errors,
    addError,
    removeError,
    clearErrors,
    handleAsyncError,
  };
};

/**
 * Offline detection and handling
 */
export class OfflineManager {
  private isOnline = navigator.onLine;
  private listeners: ((isOnline: boolean) => void)[] = [];
  private pendingOperations: (() => Promise<void>)[] = [];

  constructor() {
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  private handleOnline(): void {
    this.isOnline = true;
    this.notifyListeners();
    this.processPendingOperations();
  }

  private handleOffline(): void {
    this.isOnline = false;
    this.notifyListeners();
    
    // Add network error
    const error = ErrorFactory.createNetworkError(
      'Device went offline',
      { timestamp: new Date() }
    );
    globalErrorManager.addError(error);
  }

  private async processPendingOperations(): Promise<void> {
    const operations = [...this.pendingOperations];
    this.pendingOperations = [];

    for (const operation of operations) {
      try {
        await operation();
      } catch (error) {
        // Re-queue failed operations
        this.pendingOperations.push(operation);
      }
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.isOnline));
  }

  getIsOnline(): boolean {
    return this.isOnline;
  }

  subscribe(listener: (isOnline: boolean) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  queueOperation(operation: () => Promise<void>): void {
    if (this.isOnline) {
      operation().catch(() => {
        this.pendingOperations.push(operation);
      });
    } else {
      this.pendingOperations.push(operation);
    }
  }
}

/**
 * Global offline manager instance
 */
export const globalOfflineManager = new OfflineManager();

/**
 * Data recovery utilities
 */
export class DataRecoveryManager {
  private static readonly BACKUP_KEY = 'dia-muertos-backup';
  private static readonly MAX_BACKUPS = 5;

  static createBackup(data: any, label?: string): void {
    try {
      const backups = this.getBackups();
      const newBackup = {
        id: `backup-${Date.now()}`,
        label: label || `Respaldo ${new Date().toLocaleString('es-MX')}`,
        data,
        timestamp: new Date().toISOString(),
      };

      backups.unshift(newBackup);
      
      // Keep only the most recent backups
      if (backups.length > this.MAX_BACKUPS) {
        backups.splice(this.MAX_BACKUPS);
      }

      localStorage.setItem(this.BACKUP_KEY, JSON.stringify(backups));
    } catch (error) {
      console.error('Failed to create backup:', error);
    }
  }

  static getBackups(): any[] {
    try {
      const backupsJson = localStorage.getItem(this.BACKUP_KEY);
      return backupsJson ? JSON.parse(backupsJson) : [];
    } catch (error) {
      console.error('Failed to get backups:', error);
      return [];
    }
  }

  static restoreBackup(backupId: string): any | null {
    try {
      const backups = this.getBackups();
      const backup = backups.find(b => b.id === backupId);
      return backup ? backup.data : null;
    } catch (error) {
      console.error('Failed to restore backup:', error);
      return null;
    }
  }

  static deleteBackup(backupId: string): void {
    try {
      const backups = this.getBackups().filter(b => b.id !== backupId);
      localStorage.setItem(this.BACKUP_KEY, JSON.stringify(backups));
    } catch (error) {
      console.error('Failed to delete backup:', error);
    }
  }

  static exportData(): string {
    try {
      const backups = this.getBackups();
      return JSON.stringify(backups, null, 2);
    } catch (error) {
      console.error('Failed to export data:', error);
      return '';
    }
  }

  static importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      localStorage.setItem(this.BACKUP_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }
}

// Add React import for useErrorHandler hook
import React from 'react';