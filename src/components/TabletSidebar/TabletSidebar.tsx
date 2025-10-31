import React, { useState } from 'react';
import styles from './TabletSidebar.module.css';

export interface TabletSidebarProps {
  children?: React.ReactNode;
  position?: 'left' | 'right';
  width?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  title?: string;
  className?: string;
}

export const TabletSidebar: React.FC<TabletSidebarProps> = ({
  children,
  position = 'right',
  width = 280,
  collapsible = true,
  defaultCollapsed = false,
  title,
  className = '',
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const handleToggleCollapse = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  const sidebarClasses = [
    styles.tabletSidebar,
    styles[position],
    isCollapsed ? styles.collapsed : '',
    className
  ].filter(Boolean).join(' ');

  const sidebarStyle = {
    width: isCollapsed ? '60px' : `${width}px`,
  };

  return (
    <div className={sidebarClasses} style={sidebarStyle}>
      {/* Sidebar header */}
      {(title || collapsible) && (
        <div className={styles.sidebarHeader}>
          {title && !isCollapsed && (
            <h3 className={styles.sidebarTitle}>{title}</h3>
          )}
          {collapsible && (
            <button
              className={styles.collapseButton}
              onClick={handleToggleCollapse}
              aria-label={isCollapsed ? 'Expandir panel' : 'Colapsar panel'}
            >
              <span className={styles.collapseIcon}>
                {position === 'left' 
                  ? (isCollapsed ? '▶️' : '◀️')
                  : (isCollapsed ? '◀️' : '▶️')
                }
              </span>
            </button>
          )}
        </div>
      )}

      {/* Sidebar content */}
      <div className={styles.sidebarContent}>
        {!isCollapsed && children}
      </div>

      {/* Resize handle */}
      <div className={styles.resizeHandle} />
    </div>
  );
};