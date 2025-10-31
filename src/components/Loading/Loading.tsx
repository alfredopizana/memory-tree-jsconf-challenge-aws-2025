import React from 'react';
import styles from './Loading.module.css';

export interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'spinner' | 'dots' | 'cultural';
  text?: string;
  className?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'medium',
  variant = 'cultural',
  text,
  className = '',
}) => {
  const loadingClasses = [
    styles.loading,
    styles[size],
    className
  ].filter(Boolean).join(' ');

  const renderSpinner = () => {
    switch (variant) {
      case 'spinner':
        return <div className={styles.spinner} />;
      case 'dots':
        return (
          <div className={styles.dots}>
            <div className={styles.dot} />
            <div className={styles.dot} />
            <div className={styles.dot} />
          </div>
        );
      case 'cultural':
        return (
          <div className={styles.cultural}>
            <div className={styles.marigold} />
            <div className={styles.marigold} />
            <div className={styles.marigold} />
          </div>
        );
      default:
        return <div className={styles.spinner} />;
    }
  };

  return (
    <div className={loadingClasses} role="status" aria-label={text || 'Loading'}>
      {renderSpinner()}
      {text && <span className={styles.text}>{text}</span>}
    </div>
  );
};