import React from 'react';
import { useDrop } from 'react-dnd';
import { FamilyMember, DecorationElement } from '../../types';
import { ItemTypes, DraggedFamilyMember, FamilyMemberDropResult } from '../../contexts/DragDropContext';
import { FamilyMemberCard } from '../FamilyMemberCard/FamilyMemberCard';
import { DecorationDropZone } from '../DecorationDropZone/DecorationDropZone';
import styles from './AltarLevel.module.css';

export interface AltarLevelProps {
  level: number;
  levelName: string;
  members: FamilyMember[];
  decorations: DecorationElement[];
  onMemberDrop: (member: FamilyMember, targetLevel: number, targetOrder: number) => void;
  onDecorationDrop: (decoration: DecorationElement, newPosition: { x: number; y: number; level: number }) => void;
  onMemberEdit?: (member: FamilyMember) => void | undefined;
  onMemberViewMemories?: (memberId: string) => void | undefined;
  onMemberSelect?: (memberId: string) => void | undefined;
  onDecorationSelect?: (decorationId: string) => void | undefined;
  selectedDecorationType?: import('../../types').DecorationType | null;
  onDecorationAdd?: (type: import('../../types').DecorationType, level: number) => void;
  className?: string;
}

export const AltarLevel: React.FC<AltarLevelProps> = ({
  level,
  levelName,
  members,
  decorations,
  onMemberDrop,
  onDecorationDrop,
  onMemberEdit,
  onMemberViewMemories,
  onMemberSelect,
  onDecorationSelect,
  selectedDecorationType,
  onDecorationAdd,
  className = '',
}) => {
  const [{ isOver, canDrop }, drop] = useDrop<
    DraggedFamilyMember,
    FamilyMemberDropResult,
    { isOver: boolean; canDrop: boolean }
  >({
    accept: ItemTypes.FAMILY_MEMBER,
    drop: (item, monitor) => {
      if (!monitor.didDrop()) {
        // Calculate target order based on drop position
        const targetOrder = members.length;
        
        onMemberDrop(item.member, level, targetOrder);
        
        return {
          targetLevel: level,
          targetOrder,
          dropType: 'altar-level' as const,
        };
      }
      return undefined;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });

  // Sort members by their order in this level
  const sortedMembers = [...members]
    .filter(member => member.altarPosition.level === level)
    .sort((a, b) => a.altarPosition.order - b.altarPosition.order);

  const handleLevelClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (selectedDecorationType && onDecorationAdd) {
      // Prevent adding decoration if clicking on a member card
      const target = event.target as HTMLElement;
      if (!target.closest('[data-member-card]')) {
        onDecorationAdd(selectedDecorationType, level);
      }
    }
  };

  const levelClasses = [
    styles.altarLevel,
    styles[`level${level}`],
    isOver && canDrop ? styles.dropActive : '',
    canDrop ? styles.canDrop : '',
    selectedDecorationType ? styles.decorationMode : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <DecorationDropZone
      level={level}
      decorations={decorations}
      onDecorationDrop={onDecorationDrop}
      {...(onDecorationSelect && { onDecorationSelect })}
      className={className}
    >
      <div 
        ref={drop} 
        className={levelClasses}
        onClick={handleLevelClick}
        style={{ cursor: selectedDecorationType ? 'crosshair' : 'default' }}
      >
        {/* Level header */}
        <div className={styles.levelHeader}>
          <h3 className={styles.levelTitle}>{levelName}</h3>
          <div className={styles.levelDecoration}>
            <div className={styles.decorativeLine}></div>
          </div>
        </div>

        {/* Drop zone indicator */}
        {isOver && canDrop && (
          <div className={styles.dropIndicator}>
            <div className={styles.dropMessage}>
              <span className={styles.dropIcon}>⬇️</span>
              <span className={styles.dropText}>Colocar aquí</span>
            </div>
          </div>
        )}

        {/* Members container */}
        <div className={styles.membersContainer}>
          {sortedMembers.length > 0 ? (
            <div className={styles.membersGrid}>
              {sortedMembers.map((member) => (
                <div key={member.id} className={styles.memberSlot} data-member-card>
                  <FamilyMemberCard
                    member={member}
                    {...(onMemberEdit && { onEdit: onMemberEdit })}
                    {...(onMemberViewMemories && { onViewMemories: onMemberViewMemories })}
                    {...(onMemberSelect && { onSelect: onMemberSelect })}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyLevel}>
              <div className={styles.emptyMessage}>
                <span className={styles.emptyIcon}>👥</span>
                <p className={styles.emptyText}>
                  Arrastra miembros de la familia aquí
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Level background decoration */}
        <div className={styles.levelBackground}>
          <div className={styles.altarCloth}></div>
          <div className={styles.culturalPattern}></div>
        </div>
      </div>
    </DecorationDropZone>
  );
};