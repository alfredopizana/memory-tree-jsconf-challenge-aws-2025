import React, { useState } from 'react';
import { KeyboardShortcut } from '../../hooks/useKeyboardShortcuts';
import styles from './KeyboardShortcutsHelp.module.css';

export interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[];
  isVisible?: boolean;
  onClose?: () => void;
  className?: string;
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  shortcuts,
  isVisible = false,
  onClose,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredShortcuts = shortcuts.filter(shortcut =>
    shortcut.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shortcut.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatShortcut = (shortcut: KeyboardShortcut): string => {
    const keys: string[] = [];
    
    if (shortcut.ctrlKey) keys.push('Ctrl');
    if (shortcut.altKey) keys.push('Alt');
    if (shortcut.shiftKey) keys.push('Shift');
    if (shortcut.metaKey) keys.push('Cmd');
    
    keys.push(shortcut.key);
    
    return keys.join(' + ');
  };

  const groupedShortcuts = filteredShortcuts.reduce((groups, shortcut) => {
    const category = shortcut.ctrlKey ? 'General' : 
                    shortcut.altKey ? 'Altar' : 
                    'Navegación';
    
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(shortcut);
    return groups;
  }, {} as Record<string, KeyboardShortcut[]>);

  if (!isVisible) return null;

  const helpClasses = [
    styles.keyboardShortcutsHelp,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={helpClasses}>
      <div className={styles.backdrop} onClick={onClose} />
      
      <div className={styles.helpModal}>
        {/* Header */}
        <div className={styles.helpHeader}>
          <h2 className={styles.helpTitle}>Atajos de Teclado</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Cerrar ayuda"
          >
            <span className={styles.closeIcon}>✕</span>
          </button>
        </div>

        {/* Search */}
        <div className={styles.searchSection}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Buscar atajos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Shortcuts list */}
        <div className={styles.shortcutsList}>
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className={styles.shortcutCategory}>
              <h3 className={styles.categoryTitle}>{category}</h3>
              <div className={styles.categoryShortcuts}>
                {categoryShortcuts.map((shortcut, index) => (
                  <div key={index} className={styles.shortcutItem}>
                    <div className={styles.shortcutKeys}>
                      {formatShortcut(shortcut).split(' + ').map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          <kbd className={styles.key}>{key}</kbd>
                          {keyIndex < formatShortcut(shortcut).split(' + ').length - 1 && (
                            <span className={styles.keySeparator}>+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                    <div className={styles.shortcutDescription}>
                      {shortcut.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={styles.helpFooter}>
          <p className={styles.footerText}>
            Presiona <kbd className={styles.key}>F1</kbd> para mostrar/ocultar esta ayuda
          </p>
        </div>
      </div>
    </div>
  );
};