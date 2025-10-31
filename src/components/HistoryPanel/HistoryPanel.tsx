import React, { useState } from 'react';
import { useUndoRedo, Command } from '../../contexts/UndoRedoContext';
import { useAppState } from '../../contexts/AppStateContext';
import { Button } from '../Button/Button';
import { Card } from '../Card/Card';
import styles from './HistoryPanel.module.css';

export interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  maxVisibleItems?: number;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  isOpen,
  onClose,
  maxVisibleItems = 20
}) => {
  const { dispatch } = useAppState();
  const {
    state,
    clearHistory,
    setMaxHistorySize,
    setUndoingStatus,
    setRedoingStatus
  } = useUndoRedo();

  const [showSettings, setShowSettings] = useState(false);
  const [newMaxSize, setNewMaxSize] = useState(state.maxHistorySize);

  if (!isOpen) return null;

  // Combine undo and redo stacks for display
  const allCommands: (Command & { status: 'executed' | 'undone' })[] = [
    ...state.undoStack.map(cmd => ({ ...cmd, status: 'executed' as const })),
    ...state.redoStack.slice().reverse().map(cmd => ({ ...cmd, status: 'undone' as const }))
  ];

  // Sort by timestamp
  allCommands.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Limit visible items
  const visibleCommands = allCommands.slice(0, maxVisibleItems);

  const handleCommandClick = (command: Command, status: 'executed' | 'undone') => {
    if (status === 'executed') {
      // This command needs to be undone
      setUndoingStatus(true);
      dispatch(command.undo());
      setTimeout(() => setUndoingStatus(false), 100);
    } else {
      // This command needs to be redone
      setRedoingStatus(true);
      dispatch(command.execute());
      setTimeout(() => setRedoingStatus(false), 100);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('¿Estás seguro de que quieres borrar todo el historial? Esta acción no se puede deshacer.')) {
      clearHistory();
    }
  };

  const handleUpdateMaxSize = () => {
    if (newMaxSize >= 1 && newMaxSize <= 100) {
      setMaxHistorySize(newMaxSize);
      setShowSettings(false);
    }
  };

  const formatTimestamp = (timestamp: Date): string => {
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

  const getCommandIcon = (type: string): string => {
    switch (type) {
      case 'ADD_FAMILY_MEMBER': return '👤+';
      case 'UPDATE_FAMILY_MEMBER': return '👤✏️';
      case 'DELETE_FAMILY_MEMBER': return '👤🗑️';
      case 'ADD_MEMORY': return '📝+';
      case 'UPDATE_MEMORY': return '📝✏️';
      case 'DELETE_MEMORY': return '📝🗑️';
      case 'ADD_DECORATION': return '🌼+';
      case 'UPDATE_DECORATION': return '🌼✏️';
      case 'DELETE_DECORATION': return '🌼🗑️';
      case 'SET_ALTAR_STATE': return '⚙️';
      default: return '📋';
    }
  };

  return (
    <div className={styles.historyPanelOverlay} onClick={onClose}>
      <Card 
        variant="cultural" 
        className={styles.historyPanel}
onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h3 className={styles.title}>Historial de Cambios</h3>
          <div className={styles.headerActions}>
            <Button
              variant="secondary"
              size="small"
              onClick={() => setShowSettings(!showSettings)}
              title="Configuración del historial"
            >
              ⚙️
            </Button>
            <Button
              variant="secondary"
              size="small"
              onClick={onClose}
              title="Cerrar panel"
            >
              ✕
            </Button>
          </div>
        </div>

        {showSettings && (
          <div className={styles.settings}>
            <div className={styles.settingRow}>
              <label htmlFor="maxHistorySize">Máximo de elementos:</label>
              <input
                id="maxHistorySize"
                type="number"
                min="1"
                max="100"
                value={newMaxSize}
                onChange={(e) => setNewMaxSize(parseInt(e.target.value) || 1)}
                className={styles.numberInput}
              />
              <Button
                variant="primary"
                size="small"
                onClick={handleUpdateMaxSize}
              >
                Aplicar
              </Button>
            </div>
            <div className={styles.settingRow}>
              <Button
                variant="accent"
                size="small"
                onClick={handleClearHistory}
              >
                Borrar Historial
              </Button>
            </div>
          </div>
        )}

        <div className={styles.stats}>
          <span>Total: {allCommands.length}</span>
          <span>Ejecutados: {state.undoStack.length}</span>
          <span>Deshecho: {state.redoStack.length}</span>
        </div>

        <div className={styles.commandList}>
          {visibleCommands.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No hay cambios en el historial</p>
              <p className={styles.emptyHint}>
                Los cambios que hagas aparecerán aquí
              </p>
            </div>
          ) : (
            visibleCommands.map((command) => (
              <div
                key={`${command.id}-${command.status}`}
                className={`${styles.commandItem} ${styles[command.status]}`}
                onClick={() => handleCommandClick(command, command.status)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCommandClick(command, command.status);
                  }
                }}
              >
                <div className={styles.commandIcon}>
                  {getCommandIcon(command.type)}
                </div>
                <div className={styles.commandContent}>
                  <div className={styles.commandDescription}>
                    {command.description}
                  </div>
                  <div className={styles.commandMeta}>
                    <span className={styles.commandTime}>
                      {formatTimestamp(command.timestamp)}
                    </span>
                    <span className={styles.commandStatus}>
                      {command.status === 'executed' ? 'Ejecutado' : 'Deshecho'}
                    </span>
                  </div>
                </div>
                <div className={styles.commandAction}>
                  {command.status === 'executed' ? '↶' : '↷'}
                </div>
              </div>
            ))
          )}
        </div>

        {allCommands.length > maxVisibleItems && (
          <div className={styles.footer}>
            <p className={styles.moreItems}>
              Y {allCommands.length - maxVisibleItems} elementos más...
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};