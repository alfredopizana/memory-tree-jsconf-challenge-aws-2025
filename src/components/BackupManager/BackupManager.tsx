import React, { useState, useEffect } from 'react';
import { useSynchronization } from '../../contexts/SynchronizationContext';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { BackupInfo } from '../../services/DataSynchronizationService';
import styles from './BackupManager.module.css';

export interface BackupManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupManager: React.FC<BackupManagerProps> = ({
  isOpen,
  onClose
}) => {
  const {
    state,
    createBackup,
    restoreFromBackup,
    refreshBackupList,
    deleteBackup
  } = useSynchronization();

  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState<string | null>(null);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      refreshBackupList();
    }
  }, [isOpen, refreshBackupList]);

  if (!isOpen) return null;

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      await createBackup();
    } catch (error) {
      console.error('Failed to create backup:', error);
      alert('Error al crear la copia de seguridad. Por favor, inténtalo de nuevo.');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres restaurar esta copia de seguridad? Esto reemplazará todos los datos actuales.')) {
      return;
    }

    setIsRestoringBackup(backupId);
    try {
      await restoreFromBackup(backupId);
      alert('Copia de seguridad restaurada exitosamente. La página se recargará.');
      window.location.reload();
    } catch (error) {
      console.error('Failed to restore backup:', error);
      alert('Error al restaurar la copia de seguridad. Por favor, inténtalo de nuevo.');
    } finally {
      setIsRestoringBackup(null);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta copia de seguridad? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await deleteBackup(backupId);
    } catch (error) {
      console.error('Failed to delete backup:', error);
      alert('Error al eliminar la copia de seguridad. Por favor, inténtalo de nuevo.');
    }
  };

  const formatBackupSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatBackupDate = (date: Date): string => {
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getBackupAge = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    return `Hace ${Math.floor(diffDays / 30)} meses`;
  };

  return (
    <div className={styles.backupManagerOverlay} onClick={onClose}>
      <Card 
        variant="cultural" 
        className={styles.backupManager}
onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h3 className={styles.title}>Gestión de Copias de Seguridad</h3>
          <Button
            variant="secondary"
            size="small"
            onClick={onClose}
            title="Cerrar"
          >
            ✕
          </Button>
        </div>

        <div className={styles.actions}>
          <Button
            variant="primary"
            onClick={handleCreateBackup}
            disabled={isCreatingBackup}
            className={styles.createButton}
          >
            {isCreatingBackup ? 'Creando...' : '💾 Crear Copia de Seguridad'}
          </Button>
          
          <Button
            variant="secondary"
            size="small"
            onClick={refreshBackupList}
            title="Actualizar lista"
          >
            🔄 Actualizar
          </Button>
        </div>

        <div className={styles.backupList}>
          {state.availableBackups.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No hay copias de seguridad disponibles</p>
              <p className={styles.emptyHint}>
                Crea tu primera copia de seguridad para proteger tus datos
              </p>
            </div>
          ) : (
            state.availableBackups.map((backup: BackupInfo) => (
              <div
                key={backup.id}
                className={`${styles.backupItem} ${selectedBackup === backup.id ? styles.selected : ''}`}
                onClick={() => setSelectedBackup(selectedBackup === backup.id ? null : backup.id)}
              >
                <div className={styles.backupIcon}>💾</div>
                
                <div className={styles.backupInfo}>
                  <div className={styles.backupName}>
                    Copia de Seguridad
                  </div>
                  <div className={styles.backupMeta}>
                    <span className={styles.backupDate}>
                      {formatBackupDate(backup.timestamp)}
                    </span>
                    <span className={styles.backupAge}>
                      {getBackupAge(backup.timestamp)}
                    </span>
                    <span className={styles.backupSize}>
                      {formatBackupSize(backup.size)}
                    </span>
                  </div>
                </div>

                <div className={styles.backupActions}>
                  <Button
                    variant="accent"
                    size="small"
onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleRestoreBackup(backup.id);
                    }}
                    disabled={isRestoringBackup === backup.id}
                    title="Restaurar esta copia de seguridad"
                  >
                    {isRestoringBackup === backup.id ? '⟳' : '📥'}
                  </Button>
                  
                  <Button
                    variant="secondary"
                    size="small"
onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleDeleteBackup(backup.id);
                    }}
                    title="Eliminar esta copia de seguridad"
                    className={styles.deleteButton}
                  >
                    🗑️
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {selectedBackup && (
          <div className={styles.backupDetails}>
            <h4>Detalles de la Copia de Seguridad</h4>
            <div className={styles.detailsList}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>ID:</span>
                <span className={styles.detailValue}>{selectedBackup}</span>
              </div>
              {(() => {
                const backup = state.availableBackups.find(b => b.id === selectedBackup);
                if (!backup) return null;
                
                return (
                  <>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Fecha:</span>
                      <span className={styles.detailValue}>
                        {formatBackupDate(backup.timestamp)}
                      </span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Tamaño:</span>
                      <span className={styles.detailValue}>
                        {formatBackupSize(backup.size)}
                      </span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Antigüedad:</span>
                      <span className={styles.detailValue}>
                        {getBackupAge(backup.timestamp)}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        <div className={styles.footer}>
          <div className={styles.info}>
            <p className={styles.infoText}>
              Las copias de seguridad se almacenan localmente en tu navegador.
              Se recomienda crear copias regulares para proteger tus datos.
            </p>
            <p className={styles.warningText}>
              ⚠️ Restaurar una copia de seguridad reemplazará todos los datos actuales.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};