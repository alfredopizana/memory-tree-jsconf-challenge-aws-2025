import React from 'react';
import styles from './Grid.module.css';

export interface GridProps {
  children: React.ReactNode;
  columns?: number | 'auto' | 'responsive';
  gap?: 'small' | 'medium' | 'large';
  className?: string;
  minColumnWidth?: string;
}

export const Grid: React.FC<GridProps> = ({
  children,
  columns = 'responsive',
  gap = 'medium',
  className = '',
  minColumnWidth = '250px',
  ...props
}) => {
  const gridClasses = [
    styles.grid,
    styles[`gap-${gap}`],
    className
  ].filter(Boolean).join(' ');

  const gridStyle: React.CSSProperties = {};

  if (columns === 'responsive') {
    gridStyle.gridTemplateColumns = `repeat(auto-fit, minmax(${minColumnWidth}, 1fr))`;
  } else if (columns === 'auto') {
    gridStyle.gridTemplateColumns = 'repeat(auto-fit, minmax(min-content, max-content))';
  } else if (typeof columns === 'number') {
    gridStyle.gridTemplateColumns = `repeat(${columns}, 1fr)`;
  }

  return (
    <div className={gridClasses} style={gridStyle} {...props}>
      {children}
    </div>
  );
};