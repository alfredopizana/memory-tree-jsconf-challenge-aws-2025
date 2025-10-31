import React, { useState } from 'react';
import { useSynchronization } from '../../contexts/SynchronizationContext';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import styles from './SyncStatusIndicator.module.css';

export interface SyncStatusIndicatorProps {
  variant?: 'compact' | 'detailed';
  showControls?: boolean;
  className?: string;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  variant = 'compact',
  showControls = true,
  className = ''
}) => {
  const {
    state,
    startAutoSync,
    stopAutoSync,
    performManualSync,
    isOnline,
    hasPendingChanges,
    hasConflicts,
    getLastSyncTime
  } = useSynchronization();

  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      await performManualSync();
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleToggleAutoSync = () => {
    if (state.syncStatus.isAutoSyncEnabled) {
      stopAutoSync();
    } else {
      startAutoSync();
    }
  };

  const formatLastSyncTime = (timestamp: Date | null): string => {
    if (!timestamp) return 'Nunca';
    
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMinutes < 1) return 'Ahora mismo';
    if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    
    return timestamp.toLocaleDateString('es-MX', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSyncStatusIcon = (): string => {
    if (!isOnline()) return '📡❌';
    if (hasConflicts()) return '⚠️';
    if (hasPendingChanges()) return '🔄';
    if (state.syncStatus.isAutoSyncEnabled) return '✅';
    return '⏸️';
  };

  const getSyncStatusText = (): string => {
    if (!isOnline()) return 'Sin conexión';
    if (hasConflicts()) return 'Conflictos detectados';
    if (hasPendingChanges()) return 'Cambios pendientes';
    if (state.syncStatus.isAutoSyncEnabled) return 'Sincronizado';
    return 'Sincronización pausada';
  };

const getSyncStatusColor = (): string => {
    if (!isOnline()) return styles.offline || '';
    if (hasConflicts()) return styles.warning || '';
    if (hasPendingChanges()) return styles.pending || '';
    if (state.syncStatus.isAutoSyncEnabled) return styles.synced || '';
    return styles.paused || '';
  };

  if (variant === 'compact') {
    return (
      <div 
        className={`${styles.syncIndicator} ${styles.compact} ${getSyncStatusColor()} ${className}`}
        title={`${getSyncStatusText()} - Última sincronización: ${formatLastSyncTime(getLastSyncTime())}`}
      >
        <span className={styles.icon}>{getSyncStatusIcon()}</span>
        {showControls && (
          <Button
            variant="secondary"
            size="small"
            onClick={handleManualSync}
            disabled={isManualSyncing || !isOnline()}
            className={styles.syncButton}
            title="Sincronizar ahora"
          >
            {isManualSyncing ? '⟳' : '🔄'}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card variant="outlined" className={`${styles.syncIndicator} ${styles.detailed} ${className}`}>
      <div className={styles.header}>
        <div className={styles.statusInfo}>
          <span className={`${styles.statusIcon} ${getSyncStatusColor()}`}>
            {getSyncStatusIcon()}
          </span>
          <div className={styles.statusText}>
            <div className={styles.primaryStatus}>{getSyncStatusText()}</div>
            <div className={styles.secondaryStatus}>
              Última sincronización: {formatLastSyncTime(getLastSyncTime())}
            </div>
          </div>
        </div>
        
        {showControls && (
          <div className={styles.controls}>
            <Button
              variant="secondary"
              size="small"
              onClick={handleManualSync}
              disabled={isManualSyncing || !isOnline()}
              title="Sincronizar ahora"
            >
              {isManualSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </Button>
            
            <Button
              variant={state.syncStatus.isAutoSyncEnabled ? 'accent' : 'secondary'}
              size="small"
              onClick={handleToggleAutoSync}
              title={state.syncStatus.isAutoSyncEnabled ? 'Pausar sincronización automática' : 'Activar sincronización automática'}
            >
              {state.syncStatus.isAutoSyncEnabled ? 'Pausar' : 'Activar'}
            </Button>
          </div>
        )}
      </div>

      <div className={styles.details}>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Estado de conexión:</span>
          <span className={`${styles.detailValue} ${isOnline() ? styles.online : styles.offline}`}>
            {isOnline() ? 'En línea' : 'Sin conexión'}
          </span>
        </div>
        
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Cambios pendientes:</span>
          <span className={styles.detailValue}>
            {state.syncStatus.pendingChanges}
          </span>
        </div>
        
        {hasConflicts() && (
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Conflictos:</span>
            <span className={`${styles.detailValue} ${styles.warning}`}>
              {state.conflicts.length}
            </span>
          </div>
        )}
        
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Sincronización automática:</span>
          <span className={styles.detailValue}>
            {state.syncStatus.isAutoSyncEnabled ? 'Activada' : 'Desactivada'}
          </span>
        </div>
      </div>

      {state.lastSyncResult && (
        <div className={styles.lastResult}>
          <div className={`${styles.resultStatus} ${state.lastSyncResult.success ? styles.success : styles.error}`}>
            {state.lastSyncResult.success ? '✅' : '❌'} {state.lastSyncResult.message}
          </div>
          {state.lastSyncResult.conflicts.length > 0 && (
            <div className={styles.conflictInfo}>
              {state.lastSyncResult.conflicts.length} conflicto(s) detectado(s)
            </div>
          )}
        </div>
      )}
    </Card>
  );
};