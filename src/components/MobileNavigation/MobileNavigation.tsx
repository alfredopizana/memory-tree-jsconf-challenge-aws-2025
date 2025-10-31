import React, { useState } from 'react';
import styles from './MobileNavigation.module.css';

export interface MobileNavigationProps {
  onToggleDecorations?: () => void;
  onToggleMemories?: () => void;
  onAddMember?: () => void;
  onSaveAltar?: () => void;
  decorationsVisible?: boolean;
  memoriesVisible?: boolean;
  className?: string;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  onToggleDecorations,
  onToggleMemories,
  onAddMember,
  onSaveAltar,
  decorationsVisible = false,
  memoriesVisible = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleAction = (action: () => void) => {
    action();
    setIsExpanded(false); // Collapse after action
  };

  const navigationClasses = [
    styles.mobileNavigation,
    isExpanded ? styles.expanded : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={navigationClasses}>
      {/* Main toggle button */}
      <button
        className={styles.toggleButton}
        onClick={handleToggleExpanded}
        aria-label={isExpanded ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={isExpanded}
      >
        <div className={styles.hamburger}>
          <span className={styles.hamburgerLine}></span>
          <span className={styles.hamburgerLine}></span>
          <span className={styles.hamburgerLine}></span>
        </div>
      </button>

      {/* Navigation menu */}
      <div className={styles.navigationMenu}>
        <div className={styles.menuItems}>
          {onToggleDecorations && (
            <button
              className={`${styles.menuItem} ${decorationsVisible ? styles.active : ''}`}
              onClick={() => handleAction(onToggleDecorations)}
              aria-label="Alternar decoraciones"
            >
              <span className={styles.menuIcon}>🌼</span>
              <span className={styles.menuLabel}>Decoraciones</span>
            </button>
          )}

          {onToggleMemories && (
            <button
              className={`${styles.menuItem} ${memoriesVisible ? styles.active : ''}`}
              onClick={() => handleAction(onToggleMemories)}
              aria-label="Alternar memorias"
            >
              <span className={styles.menuIcon}>📖</span>
              <span className={styles.menuLabel}>Memorias</span>
            </button>
          )}

          {onAddMember && (
            <button
              className={styles.menuItem}
              onClick={() => handleAction(onAddMember)}
              aria-label="Añadir miembro de familia"
            >
              <span className={styles.menuIcon}>👤</span>
              <span className={styles.menuLabel}>Añadir</span>
            </button>
          )}

          {onSaveAltar && (
            <button
              className={styles.menuItem}
              onClick={() => handleAction(onSaveAltar)}
              aria-label="Guardar altar"
            >
              <span className={styles.menuIcon}>💾</span>
              <span className={styles.menuLabel}>Guardar</span>
            </button>
          )}
        </div>
      </div>

      {/* Backdrop */}
      {isExpanded && (
        <div 
          className={styles.backdrop}
          onClick={() => setIsExpanded(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
};