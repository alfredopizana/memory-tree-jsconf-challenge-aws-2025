import React, { forwardRef } from 'react';
import styles from './Card.module.css';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'cultural';
  padding?: 'none' | 'small' | 'medium' | 'large';
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const Card = forwardRef<HTMLDivElement | HTMLButtonElement, CardProps>(({
  children,
  variant = 'default',
  padding = 'medium',
  className = '',
  onClick,
  hoverable = false,
  onMouseEnter,
  onMouseLeave,
  ...props
}, ref) => {
  const cardClasses = [
    styles.card,
    styles[variant],
    styles[`padding-${padding}`],
    hoverable || onClick ? styles.hoverable : '',
    onClick ? styles.clickable : '',
    className
  ].filter(Boolean).join(' ');

  const CardComponent = onClick ? 'button' : 'div';

  return (
    <CardComponent
      ref={ref as any}
      className={cardClasses}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      {...props}
    >
      {children}
    </CardComponent>
  );
});

Card.displayName = 'Card';