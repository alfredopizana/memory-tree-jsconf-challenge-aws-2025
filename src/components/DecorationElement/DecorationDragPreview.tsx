import React from 'react';
import { DecorationElement } from '../../types';
import styles from './DecorationDragPreview.module.css';

interface DecorationDragPreviewProps {
  decoration: DecorationElement;
}

export const DecorationDragPreview: React.FC<DecorationDragPreviewProps> = ({ decoration }) => {
  const getDecorationIcon = (type: string) => {
    switch (type) {
      case 'cempasuchil':
        return '🌼';
      case 'papel-picado':
        return '🎊';
      case 'salt-cross':
        return '✚';
      case 'candle':
        return '🕯️';
      case 'offering':
        return '🍞';
      default:
        return '🌸';
    }
  };

  const getDecorationName = (type: string) => {
    switch (type) {
      case 'cempasuchil':
        return 'Cempasúchil';
      case 'papel-picado':
        return 'Papel Picado';
      case 'salt-cross':
        return 'Cruz de Sal';
      case 'candle':
        return 'Vela';
      case 'offering':
        return 'Ofrenda';
      default:
        return 'Decoración';
    }
  };

  return (
    <div className={`${styles.decorationPreview} ${styles[decoration.size]}`}>
      <div className={styles.iconContainer}>
        <span className={styles.icon}>
          {getDecorationIcon(decoration.type)}
        </span>
        <div className={styles.glow}></div>
      </div>
      <div className={styles.label}>
        <span className={styles.name}>{getDecorationName(decoration.type)}</span>
        <span className={styles.hint}>Arrastrando...</span>
      </div>
    </div>
  );
};