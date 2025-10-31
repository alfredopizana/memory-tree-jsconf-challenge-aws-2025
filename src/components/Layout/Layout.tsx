import React from 'react';
import styles from './Layout.module.css';

export interface LayoutProps {
  children: React.ReactNode;
  variant?: 'default' | 'altar' | 'sidebar';
  className?: string;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const layoutClasses = [
    styles.layout,
    styles[variant],
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={layoutClasses} {...props}>
      {children}
    </div>
  );
};

export interface ContainerProps {
  children: React.ReactNode;
  maxWidth?: 'small' | 'medium' | 'large' | 'full';
  padding?: boolean;
  className?: string;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  maxWidth = 'large',
  padding = true,
  className = '',
  ...props
}) => {
  const containerClasses = [
    styles.container,
    styles[`max-width-${maxWidth}`],
    padding ? styles.padding : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses} {...props}>
      {children}
    </div>
  );
};