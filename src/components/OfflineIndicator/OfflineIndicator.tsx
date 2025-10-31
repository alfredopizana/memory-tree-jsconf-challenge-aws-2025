import React, { useState, useEffect } from 'react';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import { globalOfflineManager, DataRecoveryManager } from '../../utils/errorHandling';
import styles from './OfflineIndicator.module.css';

export interface OfflineIndicatorProps {
  showDetails?: boolean;
  culturalContext?: boolean;
  className?: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  showDetails = false,
  culturalContext = true,
  className = ''
}) => {
  const [isOnline, setIsOnline] = useState(globalOfflineManager.getIsOnline());
  const [showOfflineDetails, setShowOfflineDetails] = useState(false);
  const [pendingOperations, setPendingOperations] = useState(0);

  useEffect(() => {
    const unsubscribe = globalOfflineManager.subscribe((online) => {
      setIsOnline(online);
      if (online) {
        // Auto-hide details when coming back online
        setTimeout(() => setShowOfflineDetails(false), 3000);
      }
    });

    return unsubscribe;
  }, []);

  // Simulate pending operations count (in a real app, this would come from the offline manager)
  useEffect(() => {
    if (!isOnline) {
      const interval = setInterval(() => {
        setPendingOperations(prev => Math.max(0, prev + Math.floor(Math.random() * 3) - 1));
      }, 5000);
      return () => clearInterval(interval);
    } else {
      setPendingOperations(0);
    }
  }, [isOnline]);

  const handleRetryConnection = () => {
    // Force a connection check
    window.location.reload();
  };

  const handleCreateBackup = () => {
    try {
      const appState = {
        timestamp: new Date().toISOString(),
        isOffline: true,
        pendingOperations,
        url: window.location.href,
      };
      
      DataRecoveryManager.createBackup(appState, 'Respaldo sin conexión');
      alert('Respaldo creado exitosamente');
    } catch (error) {
      console.error('Failed to create backup:', error);
      alert('No se pudo crear el respaldo');
    }
  };

  const handleToggleDetails = () => {
    setShowOfflineDetails(!showOfflineDetails);
  };

  if (isOnline) {
    return null;
  }

  const indicatorClasses = [
    styles.offlineIndicator,
    showDetails || showOfflineDetails ? styles.expanded : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={indicatorClasses} role="status" aria-live="polite">
      {/* Compact indicator */}
      <div className={styles.compactIndicator} onClick={handleToggleDetails}>
        <div className={styles.statusIcon} aria-hidden="true">
          📡
        </div>
        <span className={styles.statusText}>
          Sin conexión
        </span>
        {pendingOperations > 0 && (
          <span className={styles.pendingCount} aria-label={`${pendingOperations} operaciones pendientes`}>
            {pendingOperations}
          </span>
        )}
        <button 
          className={styles.expandButton}
          aria-label={showOfflineDetails ? 'Ocultar detalles' : 'Mostrar detalles'}
          aria-expanded={showOfflineDetails}
        >
          {showOfflineDetails ? '▼' : '▶'}
        </button>
      </div>

      {/* Detailed view */}
      {(showDetails || showOfflineDetails) && (
        <Card variant="elevated" padding="medium" className={styles.detailsCard}>
          <div className={styles.detailsHeader}>
            <h3 className={styles.detailsTitle}>
              {culturalContext 
                ? '🕯️ Trabajando a la luz de las velas'
                : '📡 Modo sin conexión'
              }
            </h3>
          </div>

          <div className={styles.detailsContent}>
            {culturalContext ? (
              <p className={styles.culturalMessage}>
                Como nuestros ancestros que preservaron sus tradiciones sin tecnología moderna, 
                tu altar sigue funcionando sin conexión a internet. 
                Tus memorias familiares están seguras y se sincronizarán cuando regrese la conexión.
              </p>
            ) : (
              <p className={styles.offlineMessage}>
                No hay conexión a internet, pero puedes seguir usando la aplicación. 
                Los cambios se guardarán localmente y se sincronizarán cuando se restablezca la conexión.
              </p>
            )}

            <div className={styles.offlineFeatures}>
              <h4 className={styles.featuresTitle}>Funciones disponibles sin conexión:</h4>
              <ul className={styles.featuresList}>
                <li>✅ Ver y editar miembros de familia</li>
                <li>✅ Crear y modificar memorias</li>
                <li>✅ Reorganizar el altar</li>
                <li>✅ Añadir decoraciones</li>
                <li>✅ Guardar cambios localmente</li>
                <li>⏳ Sincronización automática (cuando regrese la conexión)</li>
              </ul>
            </div>

            {pendingOperations > 0 && (
              <div className={styles.pendingOperations}>
                <h4 className={styles.pendingTitle}>
                  📋 Operaciones pendientes: {pendingOperations}
                </h4>
                <p className={styles.pendingDescription}>
                  Estos cambios se sincronizarán automáticamente cuando se restablezca la conexión.
                </p>
              </div>
            )}
          </div>

          <div className={styles.detailsActions}>
            <Button
              variant="primary"
              size="small"
              onClick={handleRetryConnection}
              aria-label="Intentar reconectar a internet"
            >
              🔄 Reintentar conexión
            </Button>
            
            <Button
              variant="outline"
              size="small"
              onClick={handleCreateBackup}
              aria-label="Crear respaldo de los datos actuales"
            >
              💾 Crear respaldo
            </Button>
          </div>

          {/* Cultural decorative elements */}
          {culturalContext && (
            <div className={styles.culturalDecorations} aria-hidden="true">
              <div className={styles.candleFlame}></div>
              <div className={styles.marigoldPetals}></div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

/**
 * Hook for offline state management
 */
export const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(globalOfflineManager.getIsOnline());
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = globalOfflineManager.subscribe((online) => {
      if (!online && isOnline) {
        setWasOffline(true);
      }
      setIsOnline(online);
    });

    return unsubscribe;
  }, [isOnline]);

  const queueOperation = (operation: () => Promise<void>) => {
    globalOfflineManager.queueOperation(operation);
  };

  return {
    isOnline,
    wasOffline,
    queueOperation,
  };
};

/**
 * Higher-order component for offline-aware components
 */
export const withOfflineSupport = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const OfflineAwareComponent = (props: P) => {
    const { isOnline } = useOfflineStatus();

    return (
      <div className={styles.offlineWrapper}>
        {!isOnline && (
          <OfflineIndicator 
            showDetails={false}
            culturalContext={true}
          />
        )}
        <Component {...props} />
      </div>
    );
  };

  OfflineAwareComponent.displayName = `withOfflineSupport(${Component.displayName || Component.name})`;
  
  return OfflineAwareComponent;
};