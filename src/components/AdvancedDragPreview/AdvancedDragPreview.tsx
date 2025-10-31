import React from 'react';
import { FamilyMember, DecorationElement } from '../../types';
import { FamilyMemberCard } from '../FamilyMemberCard/FamilyMemberCard';
import styles from './AdvancedDragPreview.module.css';

export interface AdvancedDragPreviewProps {
  item: FamilyMember | DecorationElement;
  itemType: 'family-member' | 'decoration';
  isDragging: boolean;
  currentOffset?: { x: number; y: number } | null;
  className?: string;
}

export const AdvancedDragPreview: React.FC<AdvancedDragPreviewProps> = ({
  item,
  itemType,
  isDragging,
  currentOffset,
  className = '',
}) => {
  if (!isDragging || !currentOffset) {
    return null;
  }

  const previewClasses = [
    styles.advancedDragPreview,
    styles[itemType],
    className
  ].filter(Boolean).join(' ');

  const previewStyle = {
    transform: `translate(${currentOffset.x}px, ${currentOffset.y}px)`,
  };

  const renderPreviewContent = () => {
    if (itemType === 'family-member') {
      const member = item as FamilyMember;
      return (
        <div className={styles.memberPreview}>
          <FamilyMemberCard
            member={member}
            showDetails={false}
          />
          <div className={styles.previewInfo}>
            <span className={styles.previewName}>{member.name}</span>
            <span className={styles.previewHint}>Arrastra al nivel del altar</span>
          </div>
        </div>
      );
    }

    if (itemType === 'decoration') {
      const decoration = item as DecorationElement;
      const decorationIcons = {
        'cempasuchil': '🌼',
        'papel-picado': '🎊',
        'candle': '🕯️',
        'salt-cross': '✝️',
        'offering': '🍞',
      };

      return (
        <div className={styles.decorationPreview}>
          <div className={styles.decorationIcon}>
            {decorationIcons[decoration.type] || '✨'}
          </div>
          <div className={styles.previewInfo}>
            <span className={styles.previewName}>
              {decoration.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
            <span className={styles.previewHint}>Coloca en el altar</span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={previewClasses} style={previewStyle}>
      <div className={styles.previewContainer}>
        {renderPreviewContent()}
        
        {/* Cultural decorative elements */}
        <div className={styles.culturalElements}>
          <div className={styles.marigoldTrail}></div>
          <div className={styles.sparkleEffect}></div>
        </div>
      </div>
    </div>
  );
};