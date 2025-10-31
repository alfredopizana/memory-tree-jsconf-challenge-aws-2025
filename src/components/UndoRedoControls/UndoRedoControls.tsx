import React from 'react';
import { useUndoRedo } from '../../contexts/UndoRedoContext';
import { useAppState } from '../../contexts/AppStateContext';
import { Button } from '../Button/Button';
import styles from './UndoRedoControls.module.css';

export interface UndoRedoControlsProps {
  variant?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  showTooltips?: boolean;
  className?: string;
}

export const UndoRedoControls: React.FC<UndoRedoControlsProps> = ({
  variant = 'horizontal',
  showLabels = true,
  showTooltips = true,
  className = ''
}) => {
  const { dispatch } = useAppState();
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    getUndoDescription,
    getRedoDescription,
    setUndoingStatus,
    setRedoingStatus
  } = useUndoRedo();

  const handleUndo = () => {
    const command = undo();
    if (command) {
      setUndoingStatus(true);
      dispatch(command.undo());
      // Reset status after a brief delay to allow UI updates
      setTimeout(() => setUndoingStatus(false), 100);
    }
  };

  const handleRedo = () => {
    const command = redo();
    if (command) {
      setRedoingStatus(true);
      dispatch(command.execute());
      // Reset status after a brief delay to allow UI updates
      setTimeout(() => setRedoingStatus(false), 100);
    }
  };

  const undoDescription = getUndoDescription();
  const redoDescription = getRedoDescription();

const undoTooltip = showTooltips && undoDescription 
    ? `Deshacer: ${undoDescription}` 
    : 'Deshacer';
  
  const redoTooltip = showTooltips && redoDescription 
    ? `Rehacer: ${redoDescription}` 
    : 'Rehacer';

  return (
    <div 
      className={`${styles.undoRedoControls} ${styles[variant]} ${className}`}
      role="toolbar"
      aria-label="Controles de deshacer y rehacer"
    >
      <Button
        variant="secondary"
        size="small"
        onClick={handleUndo}
        disabled={!canUndo()}
        title={undoTooltip}
        aria-label={undoTooltip}
        className={styles.undoButton}
      >
        <span className={styles.icon} aria-hidden="true">↶</span>
        {showLabels && <span className={styles.label}>Deshacer</span>}
      </Button>

      <Button
        variant="secondary"
        size="small"
        onClick={handleRedo}
        disabled={!canRedo()}
        title={redoTooltip}
        aria-label={redoTooltip}
        className={styles.redoButton}
      >
        <span className={styles.icon} aria-hidden="true">↷</span>
        {showLabels && <span className={styles.label}>Rehacer</span>}
      </Button>
    </div>
  );
};

// Keyboard shortcut hook for undo/redo
export const useUndoRedoKeyboard = () => {
  const { dispatch } = useAppState();
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    setUndoingStatus,
    setRedoingStatus
  } = useUndoRedo();

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+Z (undo) or Cmd+Z on Mac
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (canUndo()) {
          const command = undo();
          if (command) {
            setUndoingStatus(true);
            dispatch(command.undo());
            setTimeout(() => setUndoingStatus(false), 100);
          }
        }
      }
      
      // Check for Ctrl+Y (redo) or Ctrl+Shift+Z or Cmd+Shift+Z on Mac
      if (
        ((event.ctrlKey || event.metaKey) && event.key === 'y') ||
        ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Z')
      ) {
        event.preventDefault();
        if (canRedo()) {
          const command = redo();
          if (command) {
            setRedoingStatus(true);
            dispatch(command.execute());
            setTimeout(() => setRedoingStatus(false), 100);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, undo, redo, canUndo, canRedo, setUndoingStatus, setRedoingStatus]);
};