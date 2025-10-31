import React from 'react';
import { FamilyMember } from '../../types';
import styles from './DragPreview.module.css';

interface DragPreviewProps {
  member: FamilyMember;
}

export const DragPreview: React.FC<DragPreviewProps> = ({ member }) => {
  const isDeceased = !!member.dateOfDeath;
  const displayName = member.preferredName || member.name;
  const primaryPhoto = member.photos?.[0];

  return (
    <div className={`${styles.dragPreview} ${isDeceased ? styles.deceased : styles.living}`}>
      {/* Cultural border decoration */}
      <div className={styles.culturalBorder}>
        <div className={styles.marigoldPattern}></div>
      </div>
      
      {/* Simplified member info */}
      <div className={styles.previewContent}>
        <div className={styles.photoContainer}>
          {primaryPhoto ? (
            <img
              src={primaryPhoto}
              alt={`Foto de ${displayName}`}
              className={styles.photo}
            />
          ) : (
            <div className={styles.photoPlaceholder}>
              <span className={styles.photoIcon}>👤</span>
            </div>
          )}
          
          {/* Candle light for deceased */}
          {isDeceased && (
            <div className={styles.candleLight}></div>
          )}
        </div>
        
        <div className={styles.memberInfo}>
          <h4 className={styles.memberName}>{displayName}</h4>
          <p className={styles.dragHint}>Arrastrando...</p>
        </div>
      </div>
      
      {/* Floating marigold petals */}
      <div className={styles.floatingPetals}>
        <div className={styles.petal + ' ' + styles.petal1}></div>
        <div className={styles.petal + ' ' + styles.petal2}></div>
        <div className={styles.petal + ' ' + styles.petal3}></div>
      </div>
    </div>
  );
};